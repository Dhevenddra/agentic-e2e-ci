import { z } from "zod"

/** A locator we can persist. NOT a ref — refs are regenerated per snapshot. */
export const LocatorSchema = z.object({
  role: z.string(),
  name: z.string(),
  nth: z.number().int().min(0).default(0),
  cssFallback: z.string().optional(),
})

export const ActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("click"), target: LocatorSchema }),
  z.object({ kind: z.literal("type"), target: LocatorSchema, text: z.string() }),
  z.object({ kind: z.literal("select"), target: LocatorSchema, value: z.string() }),
  z.object({ kind: z.literal("press"), key: z.string() }),
  z.object({ kind: z.literal("goto"), url: z.string().url() }),
  z.object({ kind: z.literal("waitFor"), target: LocatorSchema }),
])

export const StepPlanSchema = z.object({
  intent: z.string(),
  action: ActionSchema,
})

export const PlanSchema = z.object({
  scenario: z.string(),
  modelVersion: z.string(),
  cachedAt: z.string(),
  steps: z.array(StepPlanSchema),
})

/** LLM output is untrusted input. Parse it, never assume its shape. */
export const AssertionResultSchema = z.object({
  passed: z.boolean(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1),
})

export type Locator = z.infer<typeof LocatorSchema>
export type Action = z.infer<typeof ActionSchema>
export type Plan = z.infer<typeof PlanSchema>
export type StepPlan = z.infer<typeof StepPlanSchema>

export type StepOutcome =
  | { status: "cached" } // locator validated, no LLM call
  | { status: "resolved" } // first-time LLM resolution (cold cache)
  | { status: "healed"; previous: Locator; next: Locator } // drift -> re-resolved
  | { status: "failed"; reason: string }

export interface ScenarioResult {
  scenario: string
  passed: boolean
  stepsRun: number
  stepsTotal: number
  healed: number
  failureStep?: { index: number; intent: string; reason: string }
  replayUrl?: string
  classification: "pass" | "regression" | "flake" | "inconclusive"
}
