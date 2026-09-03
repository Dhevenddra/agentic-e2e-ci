/**
 * Split a plain-English scenario blob into ordered atomic step-intents.
 *
 * Deterministic (same blob -> same steps) so a step's index is stable, which is what the
 * M2 cache keys on. Splits on sentence terminators (`.`) and newlines only; commas are kept
 * inside a step so values like "a, b, c" survive. The per-step LLM resolver handles each.
 */
export function splitSteps(blob: string): string[] {
  return blob
    .split(/[.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Replace `%name%` tokens with values from `vars` so one cached locator serves many data
 * inputs (AGENT_LOOP.md). Unknown tokens are left untouched so the intent — and thus the
 * cache key/step index — stays stable across data changes.
 */
export function substituteVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/%([a-zA-Z0-9_]+)%/g, (whole, name: string) =>
    name in vars ? vars[name]! : whole,
  )
}
