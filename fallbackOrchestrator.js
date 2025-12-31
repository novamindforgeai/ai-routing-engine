// src/ai/routing/fallbackOrchestrator.js

import { observabilityBus } from "../observability/observabilityBus.js";
import { PipelineError, ERRORS, toCanonicalErrorCode } from "../errors.js";

/**
 * Deterministic Fallback Orchestrator
 * ----------------------------------
 * - Does NOT modify providers
 * - Does NOT modify pipeline semantics
 * - Does NOT modify routing
 * - Consumes an ordered provider list and attempts in order
 * - Emits fallback.* events (observability-native)
 *
 * Expected provider shape:
 *   { name: string, run: async (runArgs) => any }
 *
 * Returns:
 *   {
 *     providerUsed: string,
 *     output: any
 *   }
 */
export async function executeWithFallback({
  providers,
  runArgs,
  requestId,
  op = "run",
  maxAttempts
}) {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new PipelineError(
      ERRORS.MODEL_FAILED,
      "No providers supplied to fallback orchestrator",
      { requestId }
    );
  }

  const attemptsLimit =
    typeof maxAttempts === "number" && maxAttempts > 0
      ? Math.min(maxAttempts, providers.length)
      : providers.length;

  let lastErr = null;

  for (let i = 0; i < attemptsLimit; i++) {
    const p = providers[i];
    const providerName = p?.name || `provider_${i}`;
    const attempt = i + 1;

    observabilityBus.emitEvent("fallback.attempt", {
      requestId,
      provider: providerName,
      attempt,
      op
    });

    const started = Date.now();

    try {
      if (!p || typeof p.run !== "function") {
        throw new PipelineError(
          ERRORS.MODEL_FAILED,
          `Provider "${providerName}" missing run()`,
          { requestId, provider: providerName }
        );
      }

      const output = await p.run(runArgs);

      const latencyMs = Date.now() - started;

      observabilityBus.emitEvent("fallback.succeeded", {
        requestId,
        provider: providerName,
        attempt,
        op,
        latencyMs
      });

      return {
        providerUsed: providerName,
        output
      };
    } catch (err) {
      const latencyMs = Date.now() - started;

      const canonicalCode = toCanonicalErrorCode(err) || ERRORS.MODEL_FAILED;

      // Keep last error for final throw
      lastErr = err;

      observabilityBus.emitEvent("fallback.failed", {
        requestId,
        provider: providerName,
        attempt,
        op,
        latencyMs,
        errorCode: canonicalCode,
        status: "error",
        message: safeErrorMessage(err)
      });

      // continue to next provider
    }
  }

  // If all failed, throw a canonical pipeline error (preserving lastErr)
  const code = toCanonicalErrorCode(lastErr) || ERRORS.MODEL_FAILED;

  throw new PipelineError(code, "All providers failed (fallback exhausted)", {
    requestId,
    cause: safeErrorMessage(lastErr)
  });
}

/**
 * Safe error message for telemetry / debugging
 */
function safeErrorMessage(err) {
  if (!err) return "";
  if (typeof err === "string") return err.slice(0, 500);
  if (err instanceof Error) return String(err.message || "").slice(0, 500);
  try {
    return JSON.stringify(err).slice(0, 500);
  } catch (_) {
    return "";
  }
}
