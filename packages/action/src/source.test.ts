import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadDirAsFiles } from "./source.js"

describe("loadDirAsFiles", () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ae2e-src-"))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("reads files recursively into a path->content map with forward-slash keys", async () => {
    await writeFile(join(dir, "index.html"), "<h1>hi</h1>")
    await mkdir(join(dir, "assets"), { recursive: true })
    await writeFile(join(dir, "assets", "app.js"), "console.log(1)")

    const files = await loadDirAsFiles(dir)

    expect(files).toEqual({
      "index.html": "<h1>hi</h1>",
      "assets/app.js": "console.log(1)",
    })
  })
})
