import type { ScenarioResult } from "@agentic-e2e/agent"
import { redact } from "./redact.js"

export const CHECK_NAME = "agentic-e2e"

/**
 * `neutral` for flake-only results: a suspected flake must be visible but must not
 * block a merge. Blocking on flakes is how the check earns its way onto the ignore list.
 */
export function conclusionFor(results: ScenarioResult[]): "success" | "failure" | "neutral" {
  if (results.some((r) => r.classification === "regression")) return "failure"
  if (results.some((r) => r.classification === "flake" || r.classification === "inconclusive"))
    return "neutral"
  return "success"
}

/** Minimal shape of the Octokit checks API we call. `any` arg = SDK boundary (params vary). */
interface ChecksApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checks: { create(args: any): Promise<unknown> }
}

/** Publish the pass/fail status to the Checks API so the PR gets a required green/red gate. */
export async function createCheck(
  octokit: ChecksApi,
  ctx: { owner: string; repo: string },
  headSha: string,
  results: ScenarioResult[],
): Promise<void> {
  const conclusion = conclusionFor(results)
  const passed = results.filter((r) => r.passed).length
  const healed = results.reduce((n, r) => n + r.healed, 0)
  const title =
    conclusion === "success"
      ? `All ${results.length} scenario${results.length === 1 ? "" : "s"} passed`
      : conclusion === "failure"
        ? `${results.length - passed} of ${results.length} scenarios failed`
        : `Passed with flakes (${passed}/${results.length})`
  const summary = redact(
    `${passed}/${results.length} passed · ${healed} selector${healed === 1 ? "" : "s"} healed.`,
  )
  await octokit.checks.create({
    owner: ctx.owner,
    repo: ctx.repo,
    name: CHECK_NAME,
    head_sha: headSha,
    status: "completed",
    conclusion,
    output: { title, summary },
  })
}
