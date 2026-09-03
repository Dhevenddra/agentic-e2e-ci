import { readdir, readFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"

/**
 * Read a directory tree (the downloaded build artifact) into a `{ relPath: content }` map
 * for the sandbox `files` source. Keys use forward slashes. Text is read as UTF-8 — fine for
 * the HTML/JS/CSS of a static build (binary assets are out of scope for the M3 demo).
 */
export async function loadDirAsFiles(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const abs = join(current, entry.name)
      if (entry.isDirectory()) await walk(abs)
      else out[relative(dir, abs).split(sep).join("/")] = await readFile(abs, "utf8")
    }
  }
  await walk(dir)
  return out
}
