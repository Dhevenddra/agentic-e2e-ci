import { Octokit } from "@octokit/rest"
import type { ScenarioResult } from "@agentic-e2e/agent"
import { renderBody, postSticky } from "./comment.js"
import { createCheck } from "./checks.js"

export interface PublishContext {
  owner: string
  repo: string
  prNumber: number
  headSha: string
}

/**
 * Post the run to the PR: one sticky comment (find-or-create) + a Checks API status.
 * `token` is the installation/`github.token` from the PRIVILEGED workflow — it never
 * reaches fork code. Everything outbound is redacted (comment.ts / checks.ts).
 */
export async function publish(
  token: string,
  ctx: PublishContext,
  results: ScenarioResult[],
): Promise<void> {
  const octokit = new Octokit({ auth: token })
  await postSticky(
    octokit.rest,
    { owner: ctx.owner, repo: ctx.repo, issue_number: ctx.prNumber },
    renderBody(results),
  )
  await createCheck(octokit.rest, { owner: ctx.owner, repo: ctx.repo }, ctx.headSha, results)
}
