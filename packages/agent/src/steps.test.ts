import { describe, it, expect } from "vitest"
import { splitSteps, substituteVariables } from "./steps.js"

describe("splitSteps", () => {
  it("splits a blob into ordered step-intents on sentence boundaries", () => {
    expect(splitSteps('Add "Buy milk". Add "Walk dog". Complete the first todo.')).toEqual([
      'Add "Buy milk"',
      'Add "Walk dog"',
      "Complete the first todo",
    ])
  })

  it("splits on newlines too and trims whitespace", () => {
    expect(splitSteps("Open the app\nType a todo\nPress Enter\n")).toEqual([
      "Open the app",
      "Type a todo",
      "Press Enter",
    ])
  })

  it("drops empty segments and is deterministic (stable indices for caching)", () => {
    const blob = "Step one.  . Step two."
    expect(splitSteps(blob)).toEqual(["Step one", "Step two"])
  })

  it("keeps commas inside a step (they are not separators)", () => {
    expect(splitSteps("Type 'a, b, c' into the box.")).toEqual(["Type 'a, b, c' into the box"])
  })
})

describe("substituteVariables", () => {
  it("replaces %name% tokens from the variable map", () => {
    expect(substituteVariables("Type %email% into the field", { email: "a@b.com" })).toBe(
      "Type a@b.com into the field",
    )
  })

  it("replaces every occurrence", () => {
    expect(substituteVariables("%x% and %x%", { x: "1" })).toBe("1 and 1")
  })

  it("leaves unknown tokens untouched (so the cache key stays stable)", () => {
    expect(substituteVariables("Type %missing% here", {})).toBe("Type %missing% here")
  })
})
