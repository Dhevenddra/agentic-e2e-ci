// Build the publishable `agentic-e2e` package: bundle OUR code (the @agentic-e2e/* workspace
// packages) into two entrypoints, but keep the heavy runtime deps EXTERNAL so npm installs
// them normally (patchright/Solari, OpenAI, Octokit can't be bundled — DEC-016).
import { build } from "esbuild"
import { rm, mkdir, writeFile, copyFile } from "node:fs/promises"

const external = [
  "@solarisdk/browser",
  "@solarisdk/sandbox",
  "openai",
  "@octokit/rest",
  "zod",
]

await rm("dist", { recursive: true, force: true })
await mkdir("dist", { recursive: true })

// 1. Self-contained types for the library entry. Hand-authored so the published package has
// no dangling reference to the (unpublished) @agentic-e2e/* workspace packages. defineConfig
// is a transparent identity — it preserves your config literal's own type for autocomplete.
await writeFile(
  "dist/index.d.ts",
  `export declare function defineConfig<T>(config: T): T
export declare function init(opts?: { cwd?: string; pkg?: Record<string, unknown> }): Promise<{ written: string[] }>
export declare function detectFramework(pkg: Record<string, unknown>): { build: string; serve: string; port: number } | null
export declare function run(env?: NodeJS.ProcessEnv): Promise<void>
`,
)

const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external,
  logLevel: "info",
}

// 2. CLI entry (bin) — needs a shebang.
await build({
  ...common,
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  banner: { js: "#!/usr/bin/env node" },
})

// 3. Library entry — defineConfig etc.
await build({
  ...common,
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
})

// 4. The npm page README (kept in sync with the repo root).
await copyFile("../../README.md", "README.md")

console.log("built agentic-e2e -> dist/{cli.js,index.js,index.d.ts} (+ README.md)")
