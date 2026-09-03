import { describe, it, expect } from "vitest"
import { buildResolveMessages } from "./prompt.js"

describe("buildResolveMessages", () => {
  const tree = '[e1] button "Add"\n[e2] textbox "new todo"'
  const intent = "Type 'Buy milk' into the new todo field"

  it("produces a system+user pair that carries the intent and the tree verbatim", () => {
    const msgs = buildResolveMessages(intent, tree)

    expect(msgs).toHaveLength(2)
    expect(msgs[0]!.role).toBe("system")
    expect(msgs[1]!.role).toBe("user")
    expect(msgs[1]!.content).toContain(intent)
    expect(msgs[1]!.content).toContain(tree)
  })

  it("instructs JSON-only output and names the allowed actions (Fireworks JSON guidance)", () => {
    const sys = buildResolveMessages(intent, tree)[0]!.content

    expect(sys).toMatch(/json/i)
    for (const a of ["click", "type", "select", "press", "goto", "waitFor"]) {
      expect(sys).toContain(a)
    }
  })
})
