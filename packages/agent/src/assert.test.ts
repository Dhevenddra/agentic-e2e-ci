import { describe, it, expect } from "vitest"
import { evaluateExpect } from "./assert.js"
import type { A11yNode } from "./observe.js"

const nodes: A11yNode[] = [
  { ref: "e1", role: "checkbox", name: "Walk dog" },
  { ref: "e2", role: "textbox", name: "new todo", value: "" },
]
const ctx = { nodes, url: "https://demo.playwright.dev/todomvc/#/active" }

describe("evaluateExpect", () => {
  it("passes 'text:' when a node contains the needle (case-insensitive)", () => {
    const r = evaluateExpect("text:walk DOG", ctx)
    expect(r.passed).toBe(true)
    expect(r.evidence).toContain("Walk dog")
  })

  it("fails 'text:' when no node contains the needle", () => {
    expect(evaluateExpect("text:Buy milk", ctx).passed).toBe(false)
  })

  it("passes 'no-text:' when the needle is absent", () => {
    expect(evaluateExpect("no-text:Buy milk", ctx).passed).toBe(true)
  })

  it("fails 'no-text:' when the needle is present", () => {
    expect(evaluateExpect("no-text:Walk dog", ctx).passed).toBe(false)
  })

  it("passes 'url:' when the URL contains the fragment", () => {
    expect(evaluateExpect("url:/active", ctx).passed).toBe(true)
  })

  it("treats a bare string as a text check", () => {
    expect(evaluateExpect("Walk dog", ctx).passed).toBe(true)
  })
})
