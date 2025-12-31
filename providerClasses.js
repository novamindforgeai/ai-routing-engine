export const PROVIDER_CLASSES = {
  fast_pricey: { alpha: 3, beta: 1 },
  slow_cheap: { alpha: 2, beta: 2 },
  unstable_powerful: { alpha: 1.5, beta: 2.5 },
  default: { alpha: 1, beta: 1 }
};

export function getProviderPrior(cls = "default") {
  return PROVIDER_CLASSES[cls] || PROVIDER_CLASSES.default;
}
