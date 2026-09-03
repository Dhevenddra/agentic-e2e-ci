import type { Config, Scenario } from "@agentic-e2e/config"
import {
  createFireworksResolver,
  classify,
  loadPlan,
  savePlan,
  runScenario,
  type Resolver,
  type ScenarioResult,
} from "@agentic-e2e/agent"
import { createPreview, type PreviewEnv, type AppSource } from "./preview.js"
import { launchBrowser } from "./browser.js"

const DEFAULT_MODEL = "accounts/fireworks/models/deepseek-v4-flash-0731"

/** Resolve config variables to concrete strings (literal + secret; generated is M4). */
export function resolveVariables(cfg: Config): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, v] of Object.entries(cfg.variables)) {
    if (v.from === "literal") out[key] = v.value
    else if (v.from === "secret") {
      const val = process.env[v.name]
      if (val) out[key] = val
    }
  }
  return out
}

export interface RunPROptions {
  cacheDir?: string
}

/**
 * One full PR run: build the app in a sandbox preview, then run every scenario against it
 * (a fresh recording browser per scenario for a per-scenario replay), caching + healing
 * plans on disk. Infra is always torn down in `finally` — a leaked VM is a bill.
 */
export async function runScenarios(
  cfg: Config,
  source: AppSource,
  opts: RunPROptions = {},
): Promise<ScenarioResult[]> {
  const model = cfg.agent.model || DEFAULT_MODEL
  const resolver = createFireworksResolver({ apiKey: process.env.MODEL_API_KEY ?? "", model })
  const variables = resolveVariables(cfg)
  const cacheDir = opts.cacheDir

  const preview = await createPreview(cfg, source)
  const results: ScenarioResult[] = []
  try {
    for (const scenario of cfg.scenarios) {
      results.push(await runWithFlakeCheck(cfg, preview, scenario, resolver, variables, cacheDir))
    }
  } finally {
    await preview.dispose()
  }
  return results
}

/** One attempt: a fresh recording browser, cache-aware run, per-attempt replay. */
async function runOnce(
  cfg: Config,
  preview: PreviewEnv,
  scenario: Scenario,
  resolver: Resolver,
  variables: Record<string, string>,
  cacheDir: string | undefined,
): Promise<ScenarioResult> {
  const session = await launchBrowser(cfg)
  try {
    await session.page.goto(preview.url)
    const plan = await loadPlan(scenario.name, resolver.model, cacheDir)
    const { result, plan: nextPlan } = await runScenario(session.page, scenario, resolver, {
      plan,
      variables,
      maxSteps: cfg.agent.maxStepsPerScenario,
    })
    await savePlan(nextPlan, cacheDir)
    const replayUrl = await session.getReplayUrl()
    if (replayUrl) result.replayUrl = replayUrl
    return result
  } finally {
    await session.dispose()
  }
}

/**
 * A single failure is not a regression (AGENT_LOOP / flake.ts). On failure, re-run the
 * scenario `rerunsOnFailure` more times on the SAME commit; a consistent failure is a
 * regression, an inconsistent one is a flake (reported, not blocking). Re-runs are cheap:
 * the plan is cached after the first attempt, so they make ~0 LLM calls.
 */
async function runWithFlakeCheck(
  cfg: Config,
  preview: PreviewEnv,
  scenario: Scenario,
  resolver: Resolver,
  variables: Record<string, string>,
  cacheDir: string | undefined,
): Promise<ScenarioResult> {
  const first = await runOnce(cfg, preview, scenario, resolver, variables, cacheDir)
  if (first.passed) return first

  const runs = [first]
  for (let i = 0; i < cfg.flake.rerunsOnFailure; i++) {
    runs.push(await runOnce(cfg, preview, scenario, resolver, variables, cacheDir))
  }
  first.classification = classify(runs, cfg.flake.rerunsOnFailure)
  first.passed = first.classification === "pass"
  return first
}
