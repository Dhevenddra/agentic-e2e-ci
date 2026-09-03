import { describe, it, expect } from "vitest"
import { classify, shouldQuarantine } from "./flake.js"
import type { ScenarioResult } from "./types.js"

const r = (passed: boolean): ScenarioResult => ({
  scenario: "s",
  passed,
  stepsRun: passed ? 5 : 2,
  stepsTotal: 5,
  healed: 0,
  classification: passed ? "pass" : "regression",
})

describe("classify", () => {
  it("is pass when no run failed", () => {
    expect(classify([r(true)], 2)).toBe("pass")
  })

  it("is regression only when it fails consistently across all required re-runs", () => {
    // 1 original + 2 reruns, all failed
    expect(classify([r(false), r(false), r(false)], 2)).toBe("regression")
  })

  it("is flake when failure does not reproduce on every re-run", () => {
    expect(classify([r(false), r(true), r(false)], 2)).toBe("flake")
  })

  it("does not call it a regression without enough re-runs", () => {
    expect(classify([r(false)], 2)).toBe("flake") // only 1 run, needed 3
  })
})

describe("shouldQuarantine", () => {
  it("quarantines a scenario whose pass rate dropped past the threshold", () => {
    expect(shouldQuarantine(0.7, 0.2)).toBe(true) // below 1-0.2 = 0.8
    expect(shouldQuarantine(0.95, 0.2)).toBe(false)
  })
})
