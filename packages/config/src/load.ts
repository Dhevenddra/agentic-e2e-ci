import { pathToFileURL } from "node:url"
import { resolve, isAbsolute } from "node:path"
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
  // A bare relative path is a PACKAGE specifier to dynamic import(); resolve to a file URL.
  const url = /^[a-z]+:\/\//i.test(path)
    ? path
    : pathToFileURL(isAbsolute(path) ? path : resolve(process.cwd(), path)).href
  const mod = (await import(url)) as { default?: unknown }
  const parsed = ConfigSchema.safeParse(mod.default)
  if (!parsed.success) {
    throw new Error(
      `Invalid ${path}:\n` +
        parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
    )
  }
  return parsed.data
}
