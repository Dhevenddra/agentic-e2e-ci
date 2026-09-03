import { runAction } from "./run.js"

/** GitHub Action entry (action.yml `main: dist/main.js`). */
runAction().catch((err: unknown) => {
  // Infra/config failures fail the job; test outcomes go to the Checks API, not the exit code.
  console.error("agentic-e2e action failed:", err instanceof Error ? err.message : err)
  process.exitCode = 1
})
