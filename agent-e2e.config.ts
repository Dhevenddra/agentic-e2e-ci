import { defineConfig } from "@agentic-e2e/config"

/**
 * Config for THIS repo's own dogfood run: the agent tests examples/demo-app, which the CI
 * builds into ./dist. Serving is a plain static server inside the Solari sandbox.
 */
export default defineConfig({
  build: "true", // the demo is prebuilt to dist/ in CI; nothing to build in the sandbox
  serve: "python3 -m http.server 8080",
  port: 8080,
  readyPath: "/",
  scenarios: [
    {
      name: "search",
      steps: "Type 'shoes' into the Query field. Click the Search button.",
      expect: "text:Searched",
    },
  ],
  agent: { model: "accounts/fireworks/models/deepseek-v4-flash-0731" },
})
