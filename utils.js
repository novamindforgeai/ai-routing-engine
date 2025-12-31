export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function relativeDelta(value, baseline) {
  if (!baseline || baseline === 0) return 0;
  const d = (baseline - value) / baseline;
  return clamp(d, -1, 1);
}
