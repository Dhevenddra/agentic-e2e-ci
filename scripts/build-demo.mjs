// Builds the demo app into ./dist for the e2e workflow (static copy; no bundler needed).
import { cp, rm, mkdir } from "node:fs/promises"

await rm("dist", { recursive: true, force: true })
await mkdir("dist", { recursive: true })
await cp("examples/demo-app", "dist", { recursive: true })
console.log("build-demo: copied examples/demo-app -> dist")
