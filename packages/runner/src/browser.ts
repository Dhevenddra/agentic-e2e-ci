import { Solari } from "@solarisdk/browser"
import type { Config } from "@agentic-e2e/config"
import type { PageLike } from "@agentic-e2e/agent"
import { BrowserLaunchError } from "./errors.js"

/**
 * Gotchas encoded here, not left to memory (CLAUDE.md §4):
 *  - recording MUST be requested at creation or the replay endpoint 404s forever
 *  - you must await solari.close() or the process hangs forever (loopback proxy)
 *  - browser.close() releases the session; call it AND solari.close(), in that order
 *  - patchright has no page.accessibility — the a11y tree comes over CDP (DEC-012)
 */
export interface BrowserSession {
  page: PageLike
  sessionId: string
  /** Best-effort replay URL (KI-007: async + variable latency). Releases the session. */
  getReplayUrl(): Promise<string | undefined>
  dispose(): Promise<void>
}

export async function launchBrowser(cfg: Config): Promise<BrowserSession> {
  const apiKey = process.env.SOLARI_API_KEY
  if (!apiKey) throw new BrowserLaunchError("SOLARI_API_KEY not set")

  const solari = new Solari({ apiKey })
  const browser = await solari.launch({
    recording: cfg.solari.recording, // CONFIRMED: must be set here
    stealth: cfg.solari.stealth,
  })
  const sessionId = browser.id

  // patchright Page -> agent PageLike, with the a11y tree served over a CDP session.
  const raw = (await browser.newPage()) as unknown as {
    goto(url: string): Promise<unknown>
    getByRole(role: string, opts?: { name?: string }): unknown
    keyboard: { press(key: string): Promise<void> }
    url(): string
    context(): { newCDPSession(p: unknown): Promise<{ send(m: string): Promise<{ nodes: unknown[] }> }> }
  }
  const cdp = await raw.context().newCDPSession(raw)
  const page: PageLike = {
    goto: (url) => raw.goto(url),
    getByRole: (role, opts) => raw.getByRole(role, opts) as ReturnType<PageLike["getByRole"]>,
    keyboard: { press: (k) => raw.keyboard.press(k) },
    url: () => raw.url(),
    axTree: async () => (await cdp.send("Accessibility.getFullAXTree")).nodes as never,
  }

  let released = false
  return {
    page,
    sessionId,
    async getReplayUrl() {
      try {
        if (!released) {
          await solari.sessions.releaseAndWait(sessionId)
          released = true
        }
        for (let i = 0; i < 20; i++) {
          // getReplayUrl confirms a replay exists; its presigned URL expires (~900s), so we
          // link the PERMANENT console viewer instead of pasting an expiring URL in the PR.
          const r = await solari.sessions.getReplayUrl(sessionId).catch(() => undefined)
          if (r?.url) {
            // KI-010: console deep-link pattern inferred; verify against a real console.
            return `https://console.getsolari.com/sessions/${encodeURIComponent(sessionId)}`
          }
          await new Promise((res) => setTimeout(res, 3000))
        }
      } catch {
        /* best-effort; a missing replay is a degraded comment, never a failed run */
      }
      return undefined
    },
    async dispose() {
      try {
        await browser.close()
      } finally {
        await solari.close()
      }
    },
  }
}
