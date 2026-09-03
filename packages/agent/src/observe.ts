import type { Locator } from "./types.js"
import type { PageLike } from "./execute.js"
import { cdpAxToRaw } from "./cdp.js"

/**
 * DEC-001: accessibility tree, not screenshots. ~200-400 tokens vs 100KB+.
 *
 * Snapshot the CURRENT page only. Context blowups come from accumulating snapshots of
 * pages already navigated away from.
 */
export interface A11yNode {
  ref: string // e1, e2, ... stable within this snapshot only
  role: string
  name: string
  value?: string
  disabled?: boolean
  children?: A11yNode[]
}

/** Shape returned by Playwright's `page.accessibility.snapshot()` (the fields we use). */
export interface RawA11yNode {
  role: string
  name?: string
  value?: string | number
  disabled?: boolean
  children?: RawA11yNode[]
}

/** Roles the agent can act on. We keep only these; everything else is context noise. */
const INTERACTIVE_ROLES = new Set<string>([
  "button",
  "link",
  "textbox",
  "searchbox",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "option",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tab",
  "switch",
  "slider",
  "spinbutton",
])

/**
 * Pure transform: a raw accessibility tree -> a flat list of interactive nodes in
 * document order, each with a stable ref (`e1`, `e2`, …) valid only within this snapshot.
 * Non-interactive nodes are dropped; the model acts by ref, never by CSS (DEC-001).
 */
export function buildNodes(root: RawA11yNode | null): A11yNode[] {
  if (!root) return []
  const out: A11yNode[] = []
  let counter = 0
  const walk = (n: RawA11yNode): void => {
    if (INTERACTIVE_ROLES.has(n.role)) {
      counter += 1
      const node: A11yNode = { ref: `e${counter}`, role: n.role, name: n.name ?? "" }
      if (n.value !== undefined) node.value = String(n.value)
      if (n.disabled) node.disabled = true
      out.push(node)
    }
    for (const c of n.children ?? []) walk(c)
  }
  walk(root)
  return out
}

/** Live observation: snapshot the CURRENT page's a11y tree and reduce to interactive nodes. */
export async function observe(page: PageLike): Promise<A11yNode[]> {
  return buildNodes(cdpAxToRaw(await page.axTree()))
}

/** Render for the model. Keep it terse — every token here is paid on every heal. */
export function serialize(nodes: A11yNode[]): string {
  const line = (n: A11yNode, depth: number): string =>
    `${"  ".repeat(depth)}[${n.ref}] ${n.role} "${n.name}"${n.disabled ? " (disabled)" : ""}`
  const walk = (n: A11yNode, d: number): string[] => [
    line(n, d),
    ...(n.children ?? []).flatMap((c) => walk(c, d + 1)),
  ]
  return nodes.flatMap((n) => walk(n, 0)).join("\n")
}

export function toLocator(node: A11yNode): Locator {
  return { role: node.role, name: node.name, nth: 0 }
}
