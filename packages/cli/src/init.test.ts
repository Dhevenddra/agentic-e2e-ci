import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { detectFramework, init } from "./init.js"

describe("detectFramework", () => {
  it("detects vite / next / CRA and returns null for unknown", () => {
    expect(detectFramework({ devDependencies: { vite: "^5" } })).toEqual({
      build: "npm run build",
      serve: "npm run preview",
      port: 4173,
    })
    expect(detectFramework({ dependencies: { next: "14" } })?.port).toBe(3000)
    expect(detectFramework({ dependencies: { "react-scripts": "5" } })?.serve).toContain("serve")
    expect(detectFramework({ dependencies: {} })).toBeNull()
  })
})

describe("init", () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ae2e-init-"))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("writes the config and the fork-safe workflow pair", async () => {
    const { written } = await init({ cwd: dir, pkg: { devDependencies: { vite: "^5" } } })

    expect(written).toContain("agent-e2e.config.ts")
    expect(written).toContain(".github/workflows/e2e-build.yml")
    expect(written).toContain(".github/workflows/e2e-agent.yml")

    const cfg = await readFile(join(dir, "agent-e2e.config.ts"), "utf8")
    expect(cfg).toContain("defineConfig")
    expect(cfg).toContain("npm run preview") // vite serve
    expect(cfg).toContain("scenarios")

    const build = await readFile(join(dir, ".github/workflows/e2e-build.yml"), "utf8")
    expect(build).toContain("on:\n  pull_request") // unprivileged trigger
    expect(build).not.toContain("SOLARI_API_KEY") // no secrets in the fork-run job

    const agent = await readFile(join(dir, ".github/workflows/e2e-agent.yml"), "utf8")
    expect(agent).toContain("workflow_run") // privileged trigger
    expect(agent).toContain("SOLARI_API_KEY")
  })
})
