import { route } from "./index.js";

const providers = [
  {
    name: "openai",
    weight: 1,
    cost: 0.02,
    latency: 120
  },
  {
    name: "anthropic",
    weight: 1,
    cost: 0.01,
    latency: 180
  }
];

const context = {
  intent: "chat",
  userId: "pavlos",
  requestId: "req-1"
};

const result = route({
  providers,
  context
});

console.log("=== AI ROUTING ENGINE ===");
console.log(JSON.stringify(result, null, 2));
