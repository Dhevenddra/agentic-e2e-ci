import type { A11yNode } from "./observe.js"

export interface AssertContext {
  nodes: A11yNode[]
  url: string
}

export interface DeterministicResult {
  passed: boolean
  evidence: string
}

/**
 * Evaluate a scenario's `expect` against the observed page state, deterministically
 * (no LLM). A tiny prefix DSL keeps assertions honest and reviewable (AGENT_LOOP.md):
 *   text:<needle>    - some node name/value contains needle (case-insensitive)
 *   no-text:<needle> - no node contains needle
 *   url:<fragment>   - the current URL contains fragment
 *   <bare string>    - treated as text:<string>
 */
export function evaluateExpect(expect: string, ctx: AssertContext): DeterministicResult {
  const haystack = (needle: string): A11yNode | undefined => {
    const n = needle.toLowerCase()
    return ctx.nodes.find(
      (node) =>
        node.name.toLowerCase().includes(n) || (node.value ?? "").toLowerCase().includes(n),
    )
  }

  if (expect.startsWith("url:")) {
    const frag = expect.slice("url:".length)
    return { passed: ctx.url.includes(frag), evidence: `url=${ctx.url}` }
  }
  if (expect.startsWith("no-text:")) {
    const needle = expect.slice("no-text:".length)
    const hit = haystack(needle)
    return { passed: !hit, evidence: hit ? `found "${hit.name}"` : `"${needle}" absent` }
  }
  const needle = expect.startsWith("text:") ? expect.slice("text:".length) : expect
  const hit = haystack(needle)
  return { passed: Boolean(hit), evidence: hit ? `found "${hit.name}"` : `"${needle}" not found` }
}
