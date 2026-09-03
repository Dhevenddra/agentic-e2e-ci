const SHELL_SYNTAX = /[|&;><*$`]/

/**
 * Solari's commands.run is argv-based, not shell-interpreted:
 *   run("npm run dev")            -> looks for a binary literally named "npm run dev"
 *   run("npm", {args:["run","dev"]}) -> correct
 * Anything with real shell syntax gets an explicit `sh -c` wrapper.
 */
export function toArgv(command: string): { cmd: string; args: string[] } {
  if (SHELL_SYNTAX.test(command)) {
    return { cmd: "sh", args: ["-c", command] }
  }
  const parts = command.trim().split(/\s+/)
  const cmd = parts[0]
  if (!cmd) throw new Error("Empty command")
  return { cmd, args: parts.slice(1) }
}
