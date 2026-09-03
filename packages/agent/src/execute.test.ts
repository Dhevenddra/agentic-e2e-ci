import { describe, it, expect } from "vitest"
import { execute } from "./execute.js"
import type { PageLike, LocatorLike } from "./execute.js"
import type { Action } from "./types.js"

/** Fake page/locator that records the calls execute() makes, so we test the mapping. */
function fakePage() {
  const calls: string[] = []
  const locator = (desc: string): LocatorLike => ({
    nth(i) {
      return locator(`${desc}.nth(${i})`)
    },
    async click() {
      calls.push(`${desc}.click`)
    },
    async fill(t) {
      calls.push(`${desc}.fill(${t})`)
    },
    async selectOption(v) {
      calls.push(`${desc}.selectOption(${v})`)
    },
    async waitFor() {
      calls.push(`${desc}.waitFor`)
    },
    async press(k) {
      calls.push(`${desc}.press(${k})`)
    },
    async count() {
      return 1
    },
  })
  const page: PageLike = {
    calls,
    async goto(url) {
      calls.push(`goto(${url})`)
      return null
    },
    getByRole(role, opts) {
      return locator(`role=${role}[name=${opts?.name ?? ""}]`)
    },
    keyboard: {
      async press(k) {
        calls.push(`keyboard.press(${k})`)
      },
    },
    url() {
      return "about:blank"
    },
    async axTree() {
      return []
    },
  } as PageLike & { calls: string[] }
  return page as PageLike & { calls: string[] }
}

const target = { role: "textbox", name: "new todo", nth: 0 }

describe("execute", () => {
  it("maps 'type' to getByRole(...).nth(0).fill(text)", async () => {
    const page = fakePage()
    await execute(page, { kind: "type", target, text: "Buy milk" } as Action)
    expect(page.calls).toEqual(["role=textbox[name=new todo].nth(0).fill(Buy milk)"])
  })

  it("maps 'click' to getByRole(...).nth(0).click()", async () => {
    const page = fakePage()
    await execute(page, { kind: "click", target: { role: "button", name: "Add", nth: 0 } } as Action)
    expect(page.calls).toEqual(["role=button[name=Add].nth(0).click"])
  })

  it("maps 'press' to keyboard.press (no locator)", async () => {
    const page = fakePage()
    await execute(page, { kind: "press", key: "Enter" } as Action)
    expect(page.calls).toEqual(["keyboard.press(Enter)"])
  })

  it("maps 'goto' to page.goto", async () => {
    const page = fakePage()
    await execute(page, { kind: "goto", url: "https://example.com" } as Action)
    expect(page.calls).toEqual(["goto(https://example.com)"])
  })

  it("maps 'select' to selectOption and 'waitFor' to waitFor", async () => {
    const page = fakePage()
    await execute(page, { kind: "select", target, value: "opt1" } as Action)
    await execute(page, { kind: "waitFor", target } as Action)
    expect(page.calls).toEqual([
      "role=textbox[name=new todo].nth(0).selectOption(opt1)",
      "role=textbox[name=new todo].nth(0).waitFor",
    ])
  })
})
