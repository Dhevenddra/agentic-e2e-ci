import { init } from "./init.js"
import { runAction } from "@agentic-e2e/action"

/**
 * `agentic-e2e` CLI. Two commands:
 *   init  — scaffold agent-e2e.config.ts + the fork-safe workflow pair
 *   run   — build the app preview, run the scenarios, post the PR comment + check
 *           (reads env set by the privileged workflow: SOLARI_API_KEY, MODEL_API_KEY,
 *            GITHUB_TOKEN, GITHUB_REPOSITORY, APP_DIR, PR_NUMBER, HEAD_SHA)
 */
async function main(): Promise<void> {
  const cmd = process.argv[2]
  switch (cmd) {
    case "init":
      await init()
      return
    case "run":
      await runAction()
      return
    default:
      console.log("Usage: agentic-e2e <init|run>")
      process.exitCode = cmd ? 1 : 0
  }
}

main().catch((err: unknown) => {
  console.error("agentic-e2e:", err instanceof Error ? err.message : err)
  process.exitCode = 1
})
