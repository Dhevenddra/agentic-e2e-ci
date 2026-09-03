export class SandboxError extends Error {}
export class PreviewUnreachableError extends Error {}
export class BrowserLaunchError extends Error {}

/**
 * Infrastructure failures must never be rendered to the user as a failing test.
 * The reporter branches on these types.
 */
export const isInfrastructureError = (e: unknown): boolean =>
  e instanceof SandboxError ||
  e instanceof PreviewUnreachableError ||
  e instanceof BrowserLaunchError
