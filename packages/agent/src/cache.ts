import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { PlanSchema, type Plan } from "./types.js"

const DEFAULT_CACHE_DIR = ".agent-e2e/cache"

/** Scenario name -> a safe, stable filename slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * DEC-004: plans are committed to the repo, so healing shows up in the PR diff. A plan
 * resolved by a different model is not trustworthy — return null so the agent re-resolves.
 */
export async function loadPlan(
  scenario: string,
  modelVersion: string,
  baseDir: string = DEFAULT_CACHE_DIR,
): Promise<Plan | null> {
  try {
    const raw = await readFile(join(baseDir, `${slugify(scenario)}.json`), "utf8")
    const parsed = PlanSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    if (parsed.data.modelVersion !== modelVersion) return null
    return parsed.data
  } catch {
    return null
  }
}

export async function savePlan(plan: Plan, baseDir: string = DEFAULT_CACHE_DIR): Promise<void> {
  const path = join(baseDir, `${slugify(plan.scenario)}.json`)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(plan, null, 2) + "\n", "utf8")
}
