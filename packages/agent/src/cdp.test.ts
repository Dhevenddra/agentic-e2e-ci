import { describe, it, expect } from "vitest"
import { cdpAxToRaw, type CdpAxNode } from "./cdp.js"
import { buildNodes } from "./observe.js"

const nodes: CdpAxNode[] = [
  { nodeId: "1", role: { value: "RootWebArea" }, name: { value: "todos" }, childIds: ["2", "3", "4"] },
  { nodeId: "2", role: { value: "heading" }, name: { value: "todos" }, childIds: [] },
  { nodeId: "3", role: { value: "textbox" }, name: { value: "What needs to be done?" }, childIds: [] },
  {
    nodeId: "4",
    role: { value: "button" },
    name: { value: "Clear" },
    childIds: [],
    properties: [{ name: "disabled", value: { value: true } }],
  },
]

describe("cdpAxToRaw", () => {
  it("reconstructs a nested tree from the flat CDP node list via childIds", () => {
    const raw = cdpAxToRaw(nodes)
    expect(raw?.role).toBe("RootWebArea")
    expect(raw?.children?.map((c) => `${c.role}:${c.name}`)).toEqual([
      "heading:todos",
      "textbox:What needs to be done?",
      "button:Clear",
    ])
  })

  it("maps the disabled property through", () => {
    const raw = cdpAxToRaw(nodes)
    const button = raw?.children?.find((c) => c.role === "button")
    expect(button?.disabled).toBe(true)
  })

  it("feeds buildNodes to yield interactive refs (integration of the two pure steps)", () => {
    expect(buildNodes(cdpAxToRaw(nodes))).toEqual([
      { ref: "e1", role: "textbox", name: "What needs to be done?" },
      { ref: "e2", role: "button", name: "Clear", disabled: true },
    ])
  })

  it("returns null for an empty node list", () => {
    expect(cdpAxToRaw([])).toBeNull()
  })
})
