import { ConfigSchema, type Config } from "./schema.js"

/** Identity at runtime; exists purely for editor autocompletion at authoring time. */
export function defineConfig(cfg: Config): Config {
  return cfg
}

/**
 * Validate before any billable resource is created. A bad config must never cost
 * a sandbox.
 */
export async function loadConfig(path: string): Promise<Config> {
  const mod = (await import(path)) as { default?: unknown }
  const parsed = ConfigSchema.safeParse(mod.default)
  if (!parsed.success) {
    throw new Error(
      `Invalid ${path}:\n` +
        parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
    )
  }
  return parsed.data
}
