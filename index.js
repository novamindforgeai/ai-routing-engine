// index.js
// Entry point for AI Routing Engine

import { routeProvidersWeighted } from "./weightedRouting.js";
import { routeWithSticky } from "./stickyRouting.js";
import { fallbackOrchestrator } from "./fallbackOrchestrator.js";
import { isProviderDisabled } from "./providerRegistry.js";
import { recordBanditReward } from "./banditEngine.js";
import { RoutingError } from "./errors.js";

/**
 * Main routing function
 */
export async function routeAI({
  providers,
  request,
  intent,
  debug = false
}) {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new RoutingError("NO_PROVIDERS");
  }

  // 1. Filter disabled providers
  const available = providers.filter(
    (p) => !isProviderDisabled(p.name)
  );

  if (available.length === 0) {
    throw new RoutingError("ALL_PROVIDERS_DISABLED");
  }

  // 2. Sticky routing
  const stickyResult = routeWithSticky({
    providers: available,
    request,
    intent
  });

  if (stickyResult?.provider) {
    return stickyResult;
  }

  // 3. Weighted routing (bandits)
  const weighted = await routeProvidersWeighted({
    providers: available,
    request,
    intent,
    debug
  });

  // 4. Fallback orchestration
  const result = await fallbackOrchestrator({
    orderedProviders: weighted.ordered,
    request
  });

  // 5. Bandit reward recording
  if (result?.providerUsed) {
    recordBanditReward({
      provider: result.providerUsed,
      reward: result.reward,
      components: result.components
    });
  }

  return result;
}

export default {
  routeAI
};
