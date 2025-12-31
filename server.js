import express from "express";
import { routeAI } from "./index.js";

const app = express();
app.use(express.json());

const providers = [
  { name: "openai", weight: 1, cost: 0.02, latency: 120 },
  { name: "anthropic", weight: 1, cost: 0.01, latency: 180 },
  { name: "local", weight: 0.8, cost: 0.001, latency: 300 }
];

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial; background:#111; color:#0f0; padding:20px">
        <h2>NovaMindForgeAI – Routing Engine</h2>
        <button onclick="run()">Run Routing</button>
        <pre id="out"></pre>

        <script>
          async function run() {
            const r = await fetch("/run");
            const j = await r.json();
            document.getElementById("out").innerText =
              JSON.stringify(j, null, 2);
          }
        </script>
      </body>
    </html>
  `);
});

app.get("/run", async (req, res) => {
  const result = await routeAI({
    providers,
    intent: "chat",
    request: {
      requestId: "req-" + Date.now(),
      userId: "pavlos",
      prompt: "Hello"
    },
    debug: true
  });

  res.json(result);
});

app.listen(3000, () => {
  console.log("🚀 Engine running at http://localhost:3000");
});
