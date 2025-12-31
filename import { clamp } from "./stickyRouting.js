import { clamp } from "./utils.js";

const store = new Map();
const EWMA_ALPHA = 0.2;

export function defaultStickyKey({ userId, intent, requestId }) {
  return (userId || intent || requestId || "default").toLowerCase();
}

export function applyStickyRouting({
  orderedProviders,
  stickyKey,
  pressureView = [],
  now = Date.now()
}) {
  const entry = store.get(stickyKey);
  if (!entry) return orderedProviders;

  if (entry.expiresAt < now) {
    store.delete(stickyKey);
    return orderedProviders;
  }

  const idx = orderedProviders.findIndex(
    p => p.name === entry.provider
  );

  if (idx === -1) return orderedProviders;

  const out = [...orderedProviders];
  const [p] = out.splice(idx, 1);
  out.unshift(p);
  return out;
}

export function recordStickySuccess({ stickyKey, provider }) {
  const prev = store.get(stickyKey);
  const successRate = prev
    ? prev.ewma * (1 - EWMA_ALPHA) + EWMA_ALPHA
    : 1;

  const ttl =
    60000 * clamp(0.5 + successRate, 0.5, 2);

  store.set(stickyKey, {
    provider,
    ewma: successRate,
    expiresAt: Date.now() + ttl
  });
}
