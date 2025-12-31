// src/ai/providerRegistry.js

/**
 * Provider Registry
 * -----------------
 * Κρατάει την κατάσταση ΥΓΕΙΑΣ κάθε provider.
 *
 * Ρόλος:
 * - enable / disable providers
 * - cooldown logic
 * - health state snapshot
 *
 * ΔΕΝ:
 * - καλεί providers
 * - δεν κάνει routing
 * - δεν ξέρει bandits
 * - δεν ξέρει fallback
 *
 * Είναι καθαρό STATE LAYER.
 */

import { observabilityBus } from "./observabilityBus.js";

const providers = new Map();

/**
 * Internal helper
 */
function ensure(provider) {
  if (!providers.has(provider)) {
    providers.set(provider, {
      enabled: true,
      disabledUntil: null,
      reason: null,
      lastChange: Date.now()
    });
  }
  return providers.get(provider);
}

/**
 * Disable provider with optional cooldown
 */
export function disableProvider(provider, reason, cooldownMs = 60_000) {
  const p = ensure(provider);

  p.enabled = false;
  p.disabledUntil = Date.now() + cooldownMs;
  p.reason = reason;
  p.lastChange = Date.now();

  observabilityBus.emitEvent("provider.health.disabled", {
    provider,
    reason,
    cooldownMs
  });
}

/**
 * Enable provider manually
 */
export function enableProvider(provider, reason = "manual") {
  const p = ensure(provider);

  p.enabled = true;
  p.disabledUntil = null;
  p.reason = reason;
  p.lastChange = Date.now();

  observabilityBus.emitEvent("provider.health.enabled", {
    provider,
    reason
  });
}

/**
 * Check if provider is currently disabled
 */
export function isProviderDisabled(provider) {
  const p = ensure(provider);

  if (!p.enabled && p.disabledUntil) {
    if (Date.now() >= p.disabledUntil) {
      // cooldown expired → auto-enable
      enableProvider(provider, "cooldown_expired");
      return false;
    }
    return true;
  }

  return !p.enabled;
}

/**
 * Get snapshot of provider state
 */
export function getProviderState(provider) {
  const p = ensure(provider);
  return { ...p };
}

/**
 * Get snapshot of ALL providers
 */
export function getAllProvidersState() {
  const out = {};
  for (const [name, state] of providers.entries()) {
    out[name] = { ...state };
  }
  return out;
}

/**
 * Reset registry (testing / dev only)
 */
export function resetProviderRegistry() {
  providers.clear();
}
