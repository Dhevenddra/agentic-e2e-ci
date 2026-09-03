import { describe, it, expect } from "vitest"
import { parseResolution } from "./llm.js"
import type { A11yNode } from "./observe.js"

const nodes: A11yNode[] = [
  { ref: "e1", role: "button", name: "Add" },
  { ref: "e2", role: "textbox", name: "new todo" },
]

describe("parseResolution", () => {
  it("resolves a 'type' action, mapping the ref to a persistable locator", () => {
    const action = parseResolution('{"action":"type","ref":"e2","args":["Buy milk"]}', nodes)

    expect(action).toEqual({
      kind: "type",
      target: { role: "textbox", name: "new todo", nth: 0 },
      text: "Buy milk",
    })
  })

  it("resolves a 'click' action", () => {
    const action = parseResolution('{"action":"click","ref":"e1"}', nodes)
    expect(action).toEqual({ kind: "click", target: { role: "button", name: "Add", nth: 0 } })
  })

  it("resolves 'press' from args without needing a ref", () => {
    const action = parseResolution('{"action":"press","args":["Enter"]}', nodes)
    expect(action).toEqual({ kind: "press", key: "Enter" })
  })

  it("resolves 'goto' from args", () => {
    const action = parseResolution('{"action":"goto","args":["https://example.com"]}', nodes)
    expect(action).toEqual({ kind: "goto", url: "https://example.com" })
  })

  it("resolves 'select' with a value", () => {
    const action = parseResolution('{"action":"select","ref":"e2","args":["opt1"]}', nodes)
    expect(action).toEqual({
      kind: "select",
      target: { role: "textbox", name: "new todo", nth: 0 },
      value: "opt1",
    })
  })

  it("resolves 'waitFor' against a ref", () => {
    const action = parseResolution('{"action":"waitFor","ref":"e1"}', nodes)
    expect(action).toEqual({ kind: "waitFor", target: { role: "button", name: "Add", nth: 0 } })
  })

  it("throws when a ref-requiring action names an unknown ref", () => {
    expect(() => parseResolution('{"action":"click","ref":"e99"}', nodes)).toThrow(/ref/i)
  })

  it("throws on invalid JSON", () => {
    expect(() => parseResolution("not json", nodes)).toThrow()
  })

  it("throws on an unknown action kind", () => {
    expect(() => parseResolution('{"action":"teleport","ref":"e1"}', nodes)).toThrow()
  })

  it("throws when 'type' is missing its text arg", () => {
    expect(() => parseResolution('{"action":"type","ref":"e2","args":[]}', nodes)).toThrow(/text|arg/i)
  })
})
