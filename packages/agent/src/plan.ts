import type { Action, Locator, Plan } from "./types.js"

/** The locator an action targets, or null for target-less actions (press/goto). */
export function targetOf(action: Action): Locator | null {
  return "target" in action ? action.target : null
}

export interface StepDiff {
  index: number
  intent: string
  from: Locator | null
  to: Locator | null
}

const sameLocator = (a: Locator | null, b: Locator | null): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * Per-step locator changes between the previously cached plan and the freshly resolved one.
 * This is what surfaces self-healing in the PR diff (M2 gate): a changed locator means the
 * agent re-resolved a drifted element. Target-less steps that didn't change are omitted.
 */
export function planDiff(oldPlan: Plan | null, newPlan: Plan): StepDiff[] {
  const out: StepDiff[] = []
  newPlan.steps.forEach((step, index) => {
    const to = targetOf(step.action)
    const from = oldPlan?.steps[index] ? targetOf(oldPlan.steps[index]!.action) : null
    if (to === null && from === null) return
    if (sameLocator(from, to)) return
    out.push({ index, intent: step.intent, from, to })
  })
  return out
}
