import { describe, it, expect } from "vitest"
import type { ScenarioResult } from "@agentic-e2e/agent"
import { conclusionFor, createCheck } from "./checks.js"
import { renderBody, postSticky, MARKER } from "./comment.js"
import { redact } from "./redact.js"

const mk = (over: Partial<ScenarioResult>): ScenarioResult => ({
  scenario: "s",
  passed: true,
  stepsRun: 3,
  stepsTotal: 3,
  healed: 0,
  classification: "pass",
  ...over,
})

describe("conclusionFor", () => {
  it("is failure if any scenario is a regression", () => {
    expect(conclusionFor([mk({}), mk({ classification: "regression", passed: false })])).toBe("failure")
  })
  it("is neutral if any is a flake/inconclusive but none a regression", () => {
    expect(conclusionFor([mk({}), mk({ classification: "flake" })])).toBe("neutral")
  })
  it("is success when all pass", () => {
    expect(conclusionFor([mk({}), mk({})])).toBe("success")
  })
})

describe("createCheck", () => {
  it("creates a completed check with the mapped conclusion and head sha", async () => {
    let arg: any
    const octokit = { checks: { async create(a: unknown) { arg = a } } }
    await createCheck(octokit, { owner: "o", repo: "r" }, "abc123", [
      mk({ classification: "regression", passed: false }),
    ])
    expect(arg.owner).toBe("o")
    expect(arg.head_sha).toBe("abc123")
    expect(arg.status).toBe("completed")
    expect(arg.conclusion).toBe("failure")
    expect(arg.output.title).toBeTruthy()
  })
})

describe("renderBody", () => {
  it("embeds the hidden marker so the comment can be found and updated", () => {
    expect(renderBody([mk({})])).toContain(MARKER)
  })
  it("renders a replay link when present and a heal note when selectors healed", () => {
    const body = renderBody([mk({ scenario: "checkout", healed: 2, replayUrl: "https://replay/x" })])
    expect(body).toContain("checkout")
    expect(body).toContain("[watch](https://replay/x)")
    expect(body).toMatch(/2 selectors healed/)
  })
  it("omits the heal note when nothing healed", () => {
    expect(renderBody([mk({})])).not.toMatch(/healed this run/)
  })
})

describe("postSticky", () => {
  function fakeOctokit(existing: Array<{ id: number; body?: string }>) {
    const calls: string[] = []
    return {
      calls,
      issues: {
        async listComments() {
          return { data: existing }
        },
        async updateComment(a: { comment_id: number }) {
          calls.push(`update:${a.comment_id}`)
        },
        async createComment() {
          calls.push("create")
        },
      },
    }
  }
  const ctx = { owner: "o", repo: "r", issue_number: 1 }

  it("creates a comment when none carries the marker", async () => {
    const oct = fakeOctokit([{ id: 5, body: "unrelated" }])
    await postSticky(oct, ctx, "body")
    expect(oct.calls).toEqual(["create"])
  })
  it("updates the existing marked comment instead of spamming", async () => {
    const oct = fakeOctokit([{ id: 9, body: `hello ${MARKER}` }])
    await postSticky(oct, ctx, "body")
    expect(oct.calls).toEqual(["update:9"])
  })
})

describe("redact", () => {
  it("masks slr_live_ keys and any provided secret values", () => {
    const out = redact("key=slr_live_ABC123 pw=hunter2", ["hunter2"])
    expect(out).not.toContain("slr_live_ABC123")
    expect(out).not.toContain("hunter2")
  })
})
