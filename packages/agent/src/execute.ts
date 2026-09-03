import type { Action, Locator } from "./types.js"
import type { CdpAxNode } from "./cdp.js"

/**
 * Minimal structural view of a Playwright/patchright Page + Locator — only the methods the
 * agent uses. Structural typing keeps this package decoupled from patchright and unit-testable
 * with a fake page.
 */
export interface LocatorLike {
  nth(i: number): LocatorLike
  click(): Promise<void>
  fill(text: string): Promise<void>
  selectOption(value: string): Promise<void>
  waitFor(): Promise<void>
  press(key: string): Promise<void>
  count(): Promise<number>
}

export interface PageLike {
  goto(url: string): Promise<unknown>
  getByRole(role: string, opts?: { name?: string }): LocatorLike
  keyboard: { press(key: string): Promise<void> }
  url(): string
  /** Current-page accessibility nodes (CDP `Accessibility.getFullAXTree`). Supplied by the
   *  runner, which owns the Solari/patchright CDP session. */
  axTree(): Promise<CdpAxNode[]>
}

/** Resolve a persistable locator to a live one. Playwright locators auto-wait (no sleeps). */
export function locatorFor(page: PageLike, target: Locator): LocatorLike {
  return page.getByRole(target.role, { name: target.name }).nth(target.nth)
}

/** Execute one resolved action against the page. */
export async function execute(page: PageLike, action: Action): Promise<void> {
  switch (action.kind) {
    case "goto":
      await page.goto(action.url)
      return
    case "press":
      await page.keyboard.press(action.key)
      return
    case "click":
      await locatorFor(page, action.target).click()
      return
    case "type":
      await locatorFor(page, action.target).fill(action.text)
      return
    case "select":
      await locatorFor(page, action.target).selectOption(action.value)
      return
    case "waitFor":
      await locatorFor(page, action.target).waitFor()
      return
  }
}
