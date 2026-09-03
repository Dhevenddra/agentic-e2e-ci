/**
 * Killing a sandbox closes its control channel, which rejects any still-pending command
 * stream (e.g. the detached dev server) with "Control channel closed". That rejection lands
 * as an unhandled rejection a `.catch` on `kill()` cannot intercept. Entry points install
 * this guard to swallow that ONE benign message; genuine rejections still crash the process.
 */
export function guardSolariShutdown(): void {
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason)
    if (msg.includes("Control channel closed")) return
    throw reason
  })
}

/**
 * Solari's timeoutMs is a ROLLING IDLE WINDOW that resets on every use — it is not a
 * deadline. Anything long-running needs our own wall-clock cap or a runaway agent can
 * keep a VM alive indefinitely and bill for it.
 */
export async function withWallClockCap<T>(
  ms: number,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const cap = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded wall-clock cap of ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([fn(), cap])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Every acquisition paired with a release. Leaked VMs are a bill, not a warning. */
export async function using<R extends { dispose(): Promise<void> }, T>(
  acquire: () => Promise<R>,
  use: (r: R) => Promise<T>,
): Promise<T> {
  const resource = await acquire()
  try {
    return await use(resource)
  } finally {
    await resource.dispose().catch(() => {})
  }
}
