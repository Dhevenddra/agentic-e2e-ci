import { describe, it, expect } from "vitest"
import { planDiff, targetOf } from "./plan.js"
import type { Plan } from "./types.js"

const mk = (name: string): Plan => ({
  scenario: "s",
  modelVersion: "m",
  cachedAt: "t",
  steps: [
    { intent: "click submit", action: { kind: "click", target: { role: "button", name, nth: 0 } } },
    { intent: "press enter", action: { kind: "press", key: "Enter" } },
  ],
})

describe("targetOf", () => {
  it("returns the locator for actions that have one, null otherwise", () => {
    expect(targetOf({ kind: "press", key: "Enter" })).toBeNull()
    expect(targetOf({ kind: "click", target: { role: "button", name: "x", nth: 0 } })).toEqual({
      role: "button",
      name: "x",
      nth: 0,
    })
  })
})

describe("planDiff", () => {
  it("reports steps whose locator changed (healed)", () => {
    const diff = planDiff(mk("Sign in"), mk("Log in"))
    expect(diff).toEqual([
      {
        index: 0,
        intent: "click submit",
        from: { role: "button", name: "Sign in", nth: 0 },
        to: { role: "button", name: "Log in", nth: 0 },
      },
    ])
  })

  it("returns [] when nothing changed", () => {
    expect(planDiff(mk("Sign in"), mk("Sign in"))).toEqual([])
  })

  it("reports from:null for every located step when there is no prior plan", () => {
    const diff = planDiff(null, mk("Sign in"))
    expect(diff).toEqual([
      { index: 0, intent: "click submit", from: null, to: { role: "button", name: "Sign in", nth: 0 } },
    ])
  })
})
