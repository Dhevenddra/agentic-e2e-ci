import type { ScenarioResult } from "./types.js"

/**
 * A single failure is not a regression.
 *
 * The worst failure mode this tool has is reporting a flake as a regression — that's how
 * teams learn to ignore the check, which is exactly the disease we're treating.
 */
export function classify(
  runs: ScenarioResult[],
  rerunsOnFailure: number,
): ScenarioResult["classification"] {
  if (runs.length === 0) return "inconclusive"
  const failures = runs.filter((r) => !r.passed).length
  if (failures === 0) return "pass"
  if (failures === runs.length && runs.length >= rerunsOnFailure + 1) return "regression"
  return "flake"
}

/** Scenarios that fail intermittently over time get quarantined and reported separately. */
export function shouldQuarantine(passRate: number, threshold: number): boolean {
  return passRate < 1 - threshold
}
