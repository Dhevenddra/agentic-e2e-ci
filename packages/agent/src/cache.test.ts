import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { slugify, loadPlan, savePlan } from "./cache.js"
import type { Plan } from "./types.js"

const plan: Plan = {
  scenario: "Add + Filter!",
  modelVersion: "model-x",
  cachedAt: "2026-09-03T00:00:00.000Z",
  steps: [
    { intent: "type a todo", action: { kind: "type", target: { role: "textbox", name: "todo", nth: 0 }, text: "hi" } },
  ],
}

describe("cache", () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ae2e-"))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("slugifies scenario names into safe filenames", () => {
    expect(slugify("Add + Filter!")).toBe("add-filter")
    expect(slugify("signup/checkout flow")).toBe("signup-checkout-flow")
  })

  it("round-trips a plan through disk", async () => {
    await savePlan(plan, dir)
    const loaded = await loadPlan(plan.scenario, "model-x", dir)
    expect(loaded).toEqual(plan)
  })

  it("returns null when the plan was resolved by a different model", async () => {
    await savePlan(plan, dir)
    expect(await loadPlan(plan.scenario, "model-y", dir)).toBeNull()
  })

  it("returns null when no plan exists", async () => {
    expect(await loadPlan("never saved", "model-x", dir)).toBeNull()
  })
})
