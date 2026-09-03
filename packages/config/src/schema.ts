import { z } from "zod"

export const VariableSchema = z.discriminatedUnion("from", [
  z.object({ from: z.literal("literal"), value: z.string() }),
  z.object({ from: z.literal("secret"), name: z.string() }),
  z.object({ from: z.literal("generated"), pattern: z.string() }),
])

export const ScenarioSchema = z.object({
  name: z.string().min(1),
  steps: z.string().min(1),
  expect: z.string().optional(),
})

/**
 * Shell syntax is a footgun: Solari's commands.run is argv-based and NOT shell
 * interpreted (CLAUDE.md §4 gotcha 3). We detect it here and wrap in `sh -c` at
 * execution time rather than letting it fail confusingly inside the sandbox.
 */
const SHELL_SYNTAX = /[|&;><*$`]/

export const ConfigSchema = z
  .object({
    build: z.string().min(1),
    serve: z.string().min(1),
    port: z.number().int().positive(),
    readyPath: z.string().default("/"),
    readyTimeoutMs: z.number().int().positive().default(60_000),

    scenarios: z.array(ScenarioSchema).min(1),
    variables: z.record(z.string(), VariableSchema).default({}),

    // Zod 4: object .default() takes the OUTPUT type, so give the full default object.
    agent: z
      .object({
        model: z.string(),
        maxStepsPerScenario: z.number().int().positive().default(25),
        stepTimeoutMs: z.number().int().positive().default(20_000),
        vision: z.boolean().default(false),
        assertionConfidenceThreshold: z.number().min(0).max(1).default(0.7),
      })
      .default({
        model: "",
        maxStepsPerScenario: 25,
        stepTimeoutMs: 20_000,
        vision: false,
        assertionConfidenceThreshold: 0.7,
      }),

    flake: z
      .object({
        rerunsOnFailure: z.number().int().min(0).default(2),
        quarantineAbovePassRateDrop: z.number().min(0).max(1).default(0.2),
      })
      .default({ rerunsOnFailure: 2, quarantineAbovePassRateDrop: 0.2 }),

    solari: z
      .object({
        template: z.string().default("base"),
        // We test our own preview URL: no proxy, no captcha, stealth off (SOLARI_API.md).
        stealth: z.boolean().default(false),
        // MUST be true at session creation or the replay endpoint 404s forever.
        recording: z.boolean().default(true),
        wallClockCapMs: z.number().int().positive().default(900_000),
      })
      .default({ template: "base", stealth: false, recording: true, wallClockCapMs: 900_000 }),
  })
  .strict() // unknown keys are a hard error — typos in configs fail silently otherwise

export type Config = z.infer<typeof ConfigSchema>
export type Scenario = z.infer<typeof ScenarioSchema>

export function warnOnShellSyntax(cfg: Config): string[] {
  return [cfg.build, cfg.serve]
    .filter((c) => SHELL_SYNTAX.test(c))
    .map((c) => `"${c}" contains shell syntax; it will be wrapped in \`sh -c\``)
}
