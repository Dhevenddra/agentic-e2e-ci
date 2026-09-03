/**
 * CONFIRMED gotcha: replays upload ASYNCHRONOUSLY after the session is released.
 * Poll for roughly 30 seconds before giving up. A missing replay is a degraded comment,
 * never a failed run.
 */
export async function fetchReplayUrl(
  sessionId: string,
  { timeoutMs = 30_000, intervalMs = 2_000 } = {},
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    // [INFERRED] GET /v1/sessions/{sessionId}/recording — verify in /derisk
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return undefined
}
