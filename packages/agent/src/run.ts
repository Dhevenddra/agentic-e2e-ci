import type { Action, Plan, ScenarioResult, StepOutcome, StepPlan } from "./types.js"
import { observe } from "./observe.js"
import { execute, type PageLike } from "./execute.js"
import { splitSteps, substituteVariables } from "./steps.js"
import { evaluateExpect } from "./assert.js"
import { targetOf } from "./plan.js"
import type { Resolver } from "./llm.js"

/** Minimal scenario shape (mirrors @agentic-e2e/config's Scenario; kept local for now). */
export interface ScenarioInput {
  name: string
  steps: string
  expect?: string | undefined
}

export interface RunOptions {
  /** A previously cached plan (already model-validated by loadPlan), or null for cold. */
  plan?: Plan | null
  variables?: Record<string, string>
  maxSteps?: number
  onStep?: (i: number, intent: string, action: Action, outcome: StepOutcome["status"]) => void
}

export interface RunResult {
  result: ScenarioResult
  /** The freshly resolved/validated plan to persist (rewrites the cache). */
  plan: Plan
  outcomes: StepOutcome[]
}

/** How many elements the page currently matches for a locator (drift check). */
async function matchCount(page: PageLike, target: { role: string; name: string }): Promise<number> {
  return page.getByRole(target.role, { name: target.name }).count()
}

/**
 * The loop (docs/research/AGENT_LOOP.md):
 *   cache hit  -> validate locator (matches exactly one) -> execute       0 LLM calls
 *   drift/miss -> observe -> LLM resolve -> execute -> rewrite cache entry
 * Bias to safety: a locator matching 0 or >1 elements is drift, not a hit.
 */
export async function runScenario(
  page: PageLike,
  scenario: ScenarioInput,
  resolver: Resolver,
  opts: RunOptions = {},
): Promise<RunResult> {
  const vars = opts.variables ?? {}
  const steps = splitSteps(scenario.steps).map((s) => substituteVariables(s, vars))
  const max = Math.min(opts.maxSteps ?? 25, steps.length)
  const cachedUsable = opts.plan && opts.plan.modelVersion === resolver.model ? opts.plan : null

  const newSteps: StepPlan[] = []
  const outcomes: StepOutcome[] = []
  let stepsRun = 0

  for (let i = 0; i < max; i++) {
    const intent = steps[i]!
    try {
      const cached = cachedUsable?.steps[i]
      let action: Action | undefined
      let outcome: StepOutcome | undefined

      if (cached && cached.intent === intent) {
        const t = targetOf(cached.action)
        const valid = t === null || (await matchCount(page, t)) === 1
        if (valid) {
          action = cached.action
          outcome = { status: "cached" }
        }
      }

      const previous = cached ? targetOf(cached.action) : null
      if (!action) {
        const nodes = await observe(page)
        action = await resolver.resolve(intent, nodes)
        const next = targetOf(action)
        outcome =
          previous && next ? { status: "healed", previous, next } : { status: "resolved" }
      }

      opts.onStep?.(i, intent, action, outcome!.status)
      await execute(page, action)
      newSteps.push({ intent, action })
      outcomes.push(outcome!)
      stepsRun++
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      outcomes.push({ status: "failed", reason })
      return {
        result: {
          scenario: scenario.name,
          passed: false,
          stepsRun,
          stepsTotal: steps.length,
          healed: outcomes.filter((o) => o.status === "healed").length,
          failureStep: { index: i, intent, reason },
          classification: "regression",
        },
        plan: buildPlan(scenario.name, resolver.model, newSteps),
        outcomes,
      }
    }
  }

  const finalNodes = await observe(page)
  const assertion = scenario.expect
    ? evaluateExpect(scenario.expect, { nodes: finalNodes, url: page.url() })
    : { passed: true, evidence: "no assertion configured" }

  const result: ScenarioResult = {
    scenario: scenario.name,
    passed: assertion.passed,
    stepsRun,
    stepsTotal: steps.length,
    healed: outcomes.filter((o) => o.status === "healed").length,
    classification: assertion.passed ? "pass" : "regression",
  }
  if (!assertion.passed) {
    result.failureStep = { index: steps.length, intent: `expect: ${scenario.expect}`, reason: assertion.evidence }
  }
  return { result, plan: buildPlan(scenario.name, resolver.model, newSteps), outcomes }
}

function buildPlan(scenario: string, modelVersion: string, steps: StepPlan[]): Plan {
  return { scenario, modelVersion, cachedAt: new Date().toISOString(), steps }
}

/** M2: a cached locator is trustworthy only when it matches exactly one node. */
export function validateLocator(count: number): StepOutcome | null {
  if (count === 1) return { status: "cached" }
  return null // 0 or many -> drift -> heal
}
