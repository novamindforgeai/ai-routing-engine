// src/ai/routing/banditEngine.js

/**
 * Bandit Engine
 * -------------
 * Thompson Sampling (Beta distributions)
 * - reward shaping support
 * - persistence-ready (external store)
 * - explainable state
 * - zero coupling with routing logic
 */

import { observabilityBus } from "../observability/observabilityBus.js";

const DEFAULT_ALPHA = 1;
const DEFAULT_BETA = 1;
const REWARD_MAX = 2.5; // must match computeBanditReward clamp

/**
 * Internal in-memory state (can be hydrated from store)
 * {
 *   [provider]: { trials, rewardSum, alpha, beta }
 * }
 */
const banditState = Object.create(null);

/**
 * Ensure bandit state exists for provider
 */
export function ensureBandit(provider, priors = {}) {
  if (!banditState[provider]) {
    banditState[provider] = {
      trials: 0,
      rewardSum: 0,
      alpha: priors.alpha ?? DEFAULT_ALPHA,
      beta: priors.beta ?? DEFAULT_BETA
    };

    observabilityBus.emitEvent("routing.bandit.init", {
      provider,
      alpha: banditState[provider].alpha,
      beta: banditState[provider].beta
    });
  }

  return banditState[provider];
}

/**
 * Record shaped reward
 * reward can be >1 or <1 but will be normalized internally
 */
export function recordBanditReward({ provider, reward, components }) {
  const b = ensureBandit(provider);

  // normalize reward to [0,1]
  const rNorm = Math.max(0, Math.min(1, reward / REWARD_MAX));

  b.trials += 1;
  b.rewardSum += reward;

  // Thompson posterior update
  b.alpha += rNorm;
  b.beta += 1 - rNorm;

  observabilityBus.emitEvent("routing.bandit.reward", {
    provider,
    reward,
    rewardNorm: rNorm,
    trials: b.trials,
    avgReward: b.rewardSum / b.trials,
    alpha: b.alpha,
    beta: b.beta,
    components
  });
}

/**
 * Sample from Beta(alpha, beta)
 * Deterministic RNG can be injected
 */
export function sampleBeta(alpha, beta, rng = Math.random) {
  // Gamma sampling (Marsaglia & Tsang)
  const gamma = (k) => {
    if (k < 1) {
      return gamma(1 + k) * Math.pow(rng(), 1 / k);
    }

    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x, v;
      do {
        x = normalSample(rng);
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = rng();

      if (
        u < 1 - 0.0331 * Math.pow(x, 4) ||
        Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))
      ) {
        return d * v;
      }
    }
  };

  const x = gamma(alpha);
  const y = gamma(beta);
  return x / (x + y);
}

function normalSample(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Get current bandit snapshot (for debug / routing)
 */
export function getBanditSnapshot() {
  const out = {};
  for (const [provider, b] of Object.entries(banditState)) {
    out[provider] = {
      trials: b.trials,
      rewardSum: b.rewardSum,
      alpha: b.alpha,
      beta: b.beta,
      avgReward: b.trials > 0 ? b.rewardSum / b.trials : 0
    };
  }
  return out;
}

/**
 * Hydrate bandit state (from Redis / SQLite store)
 */
export function hydrateBandits(allStates) {
  for (const [provider, state] of Object.entries(allStates || {})) {
    banditState[provider] = {
      trials: state.trials ?? 0,
      rewardSum: state.rewardSum ?? 0,
      alpha: state.alpha ?? DEFAULT_ALPHA,
      beta: state.beta ?? DEFAULT_BETA
    };
  }

  observabilityBus.emitEvent("routing.bandit.hydrate", {
    providers: Object.keys(banditState)
  });
}

/**
 * Export bandit state (for persistence)
 */
export function exportBandits() {
  return getBanditSnapshot();
}
