import type { ScenarioResult } from "@agentic-e2e/agent"
import { redact } from "./redact.js"

export const MARKER = "<!-- agentic-e2e-ci -->"

/** One comment per PR, updated in place. Never spam a thread. */
export function renderBody(results: ScenarioResult[]): string {
  const healed = results.reduce((n, r) => n + r.healed, 0)
  const rows = results
    .map((r) => {
      const icon = r.classification === "pass" ? "pass" : r.classification === "flake" ? "flaky" : "FAIL"
      const replay = r.replayUrl ? `[watch](${r.replayUrl})` : "—"
      return `| ${r.scenario} | ${icon} | ${r.stepsRun}/${r.stepsTotal} | ${r.healed} | ${replay} |`
    })
    .join("\n")

  const failures = results
    .filter((r) => r.classification === "regression" || r.classification === "flake")
    .map((r) => {
      const f = r.failureStep
      const note =
        r.classification === "flake"
          ? "Did not reproduce on re-runs of the same commit — treating as a flake, not blocking."
          : "Reproduced on every re-run of the same commit — treating as a regression."
      return `**${r.scenario}** failed at step ${(f?.index ?? 0) + 1}: "${f?.intent ?? "?"}".\n${f?.reason ?? ""}\n${note}`
    })
    .join("\n\n")

  // The healed count is the product's whole argument — surface it every run.
  const healNote = healed > 0
    ? `\n${healed} selector${healed === 1 ? "" : "s"} healed this run — see the diff in \`.agent-e2e/cache/\`.`
    : ""

  return redact(
    `${MARKER}
### Agentic E2E — ${results.length} scenario${results.length === 1 ? "" : "s"}

| Scenario | Result | Steps | Healed | Replay |
|---|---|---|---|---|
${rows}

${failures}${healNote}
`,
  )
}

export async function postSticky(
  octokit: any,
  ctx: { owner: string; repo: string; issue_number: number },
  body: string,
): Promise<void> {
  const { data } = await octokit.issues.listComments({ ...ctx })
  const existing = data.find((c: { body?: string }) => c.body?.includes(MARKER))
  existing
    ? await octokit.issues.updateComment({ owner: ctx.owner, repo: ctx.repo, comment_id: existing.id, body })
    : await octokit.issues.createComment({ ...ctx, body })
}
