import { loadConfig } from "@agentic-e2e/config"
import { runScenarios, withWallClockCap, guardSolariShutdown } from "@agentic-e2e/runner"
import { publish } from "@agentic-e2e/reporter"
import { loadDirAsFiles } from "./source.js"

/**
 * The action entry, run in the PRIVILEGED workflow (base-branch code only, holds the secrets).
 * It never executes fork code on the runner: the fork's build output is DATA, read from the
 * downloaded artifact and served only inside the isolated Solari microVM (docs/specs/SECURITY).
 *
 * Env (set by e2e-agent.yml): SOLARI_API_KEY, MODEL_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY,
 * INPUT_CONFIG, APP_DIR (built output to serve), PR_NUMBER, HEAD_SHA.
 */
export async function runAction(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  guardSolariShutdown()

  const [owner, repo] = (env.GITHUB_REPOSITORY ?? "").split("/")
  const token = env.GITHUB_TOKEN
  const prNumber = Number(env.PR_NUMBER)
  const headSha = env.HEAD_SHA
  if (!owner || !repo) throw new Error("GITHUB_REPOSITORY not set (owner/repo)")
  if (!token) throw new Error("GITHUB_TOKEN not set")
  if (!prNumber || !headSha) throw new Error("PR_NUMBER / HEAD_SHA not set")

  const cfg = await loadConfig(env.INPUT_CONFIG ?? "agent-e2e.config.ts")
  const appDir = env.APP_DIR ?? env.ARTIFACT_PATH ?? "./artifact"
  const files = await loadDirAsFiles(appDir)
  if (Object.keys(files).length === 0) throw new Error(`no files found in APP_DIR=${appDir}`)

  const results = await withWallClockCap(cfg.solari.wallClockCapMs, "e2e run", () =>
    runScenarios(cfg, { kind: "files", files }),
  )

  await publish(token, { owner, repo, prNumber, headSha }, results)

  // The Checks API status is the merge gate; the job itself succeeds so infra ≠ test signal.
  const failed = results.filter((r) => !r.passed).length
  console.log(`agentic-e2e: ${results.length - failed}/${results.length} scenarios passed`)
}
