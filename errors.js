// src/ai/errors.js

/**
 * Canonical Error Codes
 * ---------------------
 * ΜΟΝΑΔΙΚΗ πηγή αλήθειας για error semantics σε όλο το system.
 * Όλα τα layers (providers, fallback, routing, health, bandits)
 * πρέπει να εκφράζονται μέσω αυτών.
 */
export const ERRORS = Object.freeze({
  MODEL_FAILED: "MODEL_FAILED",
  TIMEOUT: "TIMEOUT",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_REQUEST: "INVALID_REQUEST",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR"
});

/**
 * PipelineError
 * -------------
 * Canonical error wrapper για όλο το AI pipeline.
 *
 * - ΠΟΤΕ μην πετάς raw Error από core layers.
 * - ΠΑΝΤΑ τύλιξέ το σε PipelineError ή χαρτογράφησέ το.
 */
export class PipelineError extends Error {
  constructor(code, message, meta = {}) {
    super(message || code);

    this.name = "PipelineError";
    this.code = code || ERRORS.INTERNAL_ERROR;
    this.meta = meta;

    // capture clean stack
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PipelineError);
    }
  }
}

/**
 * toCanonicalErrorCode
 * --------------------
 * Μετατρέπει ΟΠΟΙΟΔΗΠΟΤΕ error (provider / fetch / sdk / timeout)
 * σε canonical ERRORS.*
 *
 * Αυτή είναι η καρδιά του health + pressure logic.
 */
export function toCanonicalErrorCode(err) {
  if (!err) return null;

  // Αν είναι ήδη PipelineError
  if (err instanceof PipelineError) {
    return err.code;
  }

  // Provider SDKs συχνά έχουν code / status
  const rawCode =
    err.code ||
    err.status ||
    err.statusCode ||
    err.name ||
    err.type;

  const msg = String(err.message || err || "").toLowerCase();

  // ---- TIMEOUTS ----
  if (
    rawCode === "ETIMEDOUT" ||
    rawCode === "TIMEOUT" ||
    msg.includes("timeout")
  ) {
    return ERRORS.TIMEOUT;
  }

  // ---- QUOTA / RATE LIMIT ----
  if (
    rawCode === 429 ||
    rawCode === "429" ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    return ERRORS.QUOTA_EXCEEDED;
  }

  // ---- INVALID INPUT ----
  if (
    rawCode === 400 ||
    rawCode === "400" ||
    msg.includes("invalid") ||
    msg.includes("bad request")
  ) {
    return ERRORS.INVALID_REQUEST;
  }

  // ---- PROVIDER UNAVAILABLE ----
  if (
    rawCode === 503 ||
    rawCode === "503" ||
    msg.includes("unavailable") ||
    msg.includes("service down")
  ) {
    return ERRORS.PROVIDER_UNAVAILABLE;
  }

  // ---- GENERIC FAILURE ----
  if (msg.includes("failed") || msg.includes("error")) {
    return ERRORS.MODEL_FAILED;
  }

  return ERRORS.INTERNAL_ERROR;
}
