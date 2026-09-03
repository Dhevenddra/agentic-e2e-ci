import { z } from "zod"
import OpenAI from "openai"
import type { Action } from "./types.js"
import { type A11yNode, serialize, toLocator } from "./observe.js"
import { buildResolveMessages, STEP_RESOLUTION_SCHEMA } from "./prompt.js"

/** The raw, untrusted shape the model must return for one step (schema-constrained). */
export const RawResolutionSchema = z.object({
  action: z.enum(["click", "type", "select", "press", "goto", "waitFor"]),
  ref: z.string().optional(),
  args: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
})
export type RawResolution = z.infer<typeof RawResolutionSchema>

/**
 * Turn one untrusted LLM resolution (`{action, ref, args}`) into a validated {@link Action},
 * mapping the snapshot ref to a persistable locator. LLM output is untrusted input
 * (CLAUDE.md §5): parse it with Zod, resolve the ref, never assume its shape.
 * Throws on invalid JSON, an unknown action, an unknown/absent ref where one is required,
 * or a missing argument.
 */
export function parseResolution(raw: string, nodes: A11yNode[]): Action {
  const r = RawResolutionSchema.parse(JSON.parse(raw))
  const args = r.args ?? []

  const target = () => {
    const node = nodes.find((n) => n.ref === r.ref)
    if (!node) throw new Error(`unknown or missing ref: ${JSON.stringify(r.ref)}`)
    return toLocator(node)
  }
  const arg0 = (what: string): string => {
    const v = args[0]
    if (v === undefined || v === "") throw new Error(`${r.action} action missing ${what} arg`)
    return v
  }

  switch (r.action) {
    case "click":
      return { kind: "click", target: target() }
    case "waitFor":
      return { kind: "waitFor", target: target() }
    case "type":
      return { kind: "type", target: target(), text: arg0("text") }
    case "select":
      return { kind: "select", target: target(), value: arg0("value") }
    case "press":
      return { kind: "press", key: arg0("key") }
    case "goto":
      return { kind: "goto", url: arg0("url") }
  }
}

/** Resolves one plain-English step into a validated {@link Action} against the a11y tree. */
export interface Resolver {
  resolve(intent: string, nodes: A11yNode[]): Promise<Action>
  readonly model: string
}

/**
 * Fireworks-backed resolver (DEC-011). OpenAI-compatible client with a baseURL override and
 * schema-constrained JSON output; the response is parsed through {@link parseResolution} so
 * untrusted model output is validated before it ever drives the browser.
 */
export function createFireworksResolver(opts: {
  apiKey: string
  baseUrl?: string
  model: string
}): Resolver {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseUrl?.trim() || "https://api.fireworks.ai/inference/v1",
  })
  return {
    model: opts.model,
    async resolve(intent, nodes) {
      const completion = await client.chat.completions.create({
        model: opts.model,
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: { name: "StepResolution", schema: STEP_RESOLUTION_SCHEMA },
        },
        messages: buildResolveMessages(intent, serialize(nodes)),
      })
      const raw = completion.choices[0]?.message?.content ?? ""
      return parseResolution(raw, nodes)
    },
  }
}
