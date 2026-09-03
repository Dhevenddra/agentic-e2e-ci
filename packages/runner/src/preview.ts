import { SandboxClient } from "@solarisdk/sandbox"
import type { Config } from "@agentic-e2e/config"
import { toArgv } from "@agentic-e2e/config"
import { PreviewUnreachableError, SandboxError } from "./errors.js"

/**
 * The ONLY module allowed to import @solarisdk/sandbox (CODING_STANDARDS). All the M0-verified
 * gotchas live here: `previewUrl` (not exposePort), `commands.start` for the detached server,
 * `connect()` before control-channel RPCs, `kill()` (not close) in dispose.
 */

const BASE_URL = process.env.SOLARI_BASE_URL ?? "https://api.getsolari.com"

/** Where the app's source comes from inside the sandbox. */
export type AppSource =
  | { kind: "files"; files: Record<string, string> }
  | { kind: "git"; url: string; ref?: string }

export interface PreviewEnv {
  url: string
  sandboxId: string
  dispose(): Promise<void>
}

/** Insert a path into a preview URL while preserving its query (the pt_token). */
export function withPath(previewUrl: string, path: string): string {
  const u = new URL(previewUrl)
  if (path && path !== "/") u.pathname = path.startsWith("/") ? path : `/${path}`
  return u.toString()
}

async function poll(attempts: number, delayMs: number, fn: () => Promise<boolean>): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await fn().catch(() => false)) return true
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

/**
 * Build the app under test inside a sandbox and expose it on a public preview URL.
 * `cwd` is where source lands and commands run (default /app).
 */
export async function createPreview(
  cfg: Config,
  source: AppSource,
  cwd = "/app",
): Promise<PreviewEnv> {
  const sandboxes = new SandboxClient({ apiKey: process.env.SOLARI_API_KEY!, baseUrl: BASE_URL })
  const sbx = await sandboxes.create({
    template: cfg.solari.template,
    timeoutMs: cfg.solari.wallClockCapMs,
    lifecycle: { onTimeout: "kill" }, // never leave a paused VM billing
  })
  const dispose = async () => {
    await sbx.kill().catch(() => {}) // kill() can throw a benign channel-close; swallow it
  }

  try {
    await sbx.connect() // control-channel RPCs (files/commands.start) need this

    // 1. Materialize the source.
    if (source.kind === "files") {
      await sbx.files.mkdir(cwd)
      for (const [rel, content] of Object.entries(source.files)) {
        const path = `${cwd}/${rel}`.replace(/\/+/g, "/")
        await sbx.files.mkdir(path.slice(0, path.lastIndexOf("/")) || "/")
        await sbx.files.write(path, content)
      }
    } else {
      await sbx.git.clone(source.url, { path: cwd, ...(source.ref ? { branch: source.ref } : {}) })
    }

    // 2. Build (blocking). Empty build => skip.
    if (cfg.build.trim()) {
      const b = toArgv(cfg.build)
      const res = await sbx.commands.run(b.cmd, { args: b.args, cwd })
      if (res.exitCode !== 0) {
        throw new SandboxError(`build failed (exit ${res.exitCode}): ${res.stderr.slice(-500)}`)
      }
    }

    // 3. Start the server DETACHED (commands.start returns immediately).
    const s = toArgv(cfg.serve)
    await sbx.commands.start(s.cmd, { args: s.args, cwd })

    // 4. Wait until the server answers INSIDE the guest before exposing it.
    const ready = await poll(cfg.readyTimeoutMs / 500, 500, async () => {
      const probe = await sbx.commands.run("sh", {
        args: [
          "-c",
          `curl -sf -o /dev/null -w '%{http_code}' http://localhost:${cfg.port}${cfg.readyPath} || true`,
        ],
      })
      return probe.stdout.trim().startsWith("2") || probe.stdout.trim().startsWith("3")
    })
    if (!ready) throw new PreviewUnreachableError(`server not listening on :${cfg.port} in time`)

    // 5. Expose the port (previewUrl -> { url, token? }; token already embedded in url).
    const preview = await sbx.previewUrl(cfg.port)
    const url = withPath(preview.url, cfg.readyPath)

    // 6. Confirm external reachability.
    const reachable = await poll(20, 750, async () => {
      const r = await fetch(url, { redirect: "follow" })
      return r.ok
    })
    if (!reachable) throw new PreviewUnreachableError(`preview URL not reachable: ${url}`)

    return { url, sandboxId: sbx.sandboxId, dispose }
  } catch (err) {
    await dispose()
    throw err instanceof SandboxError || err instanceof PreviewUnreachableError
      ? err
      : new SandboxError(err instanceof Error ? err.message : String(err))
  }
}

/** External readiness probe (kept for callers that already have a URL). */
export async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" })
      if (res.status < 500) return
    } catch (e) {
      lastError = e
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new PreviewUnreachableError(`Preview URL ${url} not ready within ${timeoutMs}ms (${String(lastError)})`)
}
