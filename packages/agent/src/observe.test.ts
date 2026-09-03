import { describe, it, expect } from "vitest"
import { buildNodes, type RawA11yNode } from "./observe.js"

describe("buildNodes", () => {
  it("assigns sequential refs to interactive nodes in document order and skips non-interactive ones", () => {
    const root: RawA11yNode = {
      role: "WebArea",
      name: "todos",
      children: [
        { role: "heading", name: "todos" }, // non-interactive: dropped
        { role: "textbox", name: "What needs to be done?" },
        { role: "button", name: "Add" },
      ],
    }

    const nodes = buildNodes(root)

    expect(nodes).toEqual([
      { ref: "e1", role: "textbox", name: "What needs to be done?" },
      { ref: "e2", role: "button", name: "Add" },
    ])
  })

  it("captures value and disabled state on interactive nodes", () => {
    const root: RawA11yNode = {
      role: "WebArea",
      name: "",
      children: [
        { role: "textbox", name: "email", value: "a@b.com" },
        { role: "button", name: "Submit", disabled: true },
      ],
    }

    expect(buildNodes(root)).toEqual([
      { ref: "e1", role: "textbox", name: "email", value: "a@b.com" },
      { ref: "e2", role: "button", name: "Submit", disabled: true },
    ])
  })

  it("keeps depth-first document order with continuous refs across nesting", () => {
    const root: RawA11yNode = {
      role: "WebArea",
      children: [
        { role: "list", children: [{ role: "checkbox", name: "Buy milk" }, { role: "checkbox", name: "Walk dog" }] },
        { role: "button", name: "Clear completed" },
      ],
    }

    expect(buildNodes(root).map((n) => `${n.ref}:${n.name}`)).toEqual([
      "e1:Buy milk",
      "e2:Walk dog",
      "e3:Clear completed",
    ])
  })

  it("returns [] for a null snapshot", () => {
    expect(buildNodes(null)).toEqual([])
  })
})
