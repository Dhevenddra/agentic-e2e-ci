// Library surface of the `agentic-e2e` package. Consumers import defineConfig here:
//   import { defineConfig } from "agentic-e2e"
export { defineConfig } from "@agentic-e2e/config"
export type { Config, Scenario } from "@agentic-e2e/config"
export { init, detectFramework } from "./init.js"
export type { Detected } from "./init.js"
export { runAction as run } from "@agentic-e2e/action"
