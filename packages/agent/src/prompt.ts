/** A chat message in the OpenAI/Fireworks shape. */
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/** The allowed step actions the model may return. Single source of truth. */
export const ACTIONS = ["click", "type", "select", "press", "goto", "waitFor"] as const

/**
 * JSON schema for one resolved step. Passed to Fireworks `response_format` AND embedded in
 * the prompt (their guidance: include the schema in both, or the model may ramble).
 */
export const STEP_RESOLUTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: [...ACTIONS] },
    ref: { type: "string", description: "element ref from the tree (e.g. e2); omit for press/goto" },
    args: {
      type: "array",
      items: { type: "string" },
      description: "type->[text], select->[value], press->[key], goto->[url]; else []",
    },
    reasoning: { type: "string" },
  },
  required: ["action", "args", "reasoning"],
} as const

/** Build the two-message prompt that resolves one plain-English step into a step action. */
export function buildResolveMessages(intent: string, serializedTree: string): ChatMessage[] {
  const system =
    "You drive a web browser to complete one UI step. You are given an accessibility tree " +
    "(each interactive element has a stable ref like e2) and one plain-English step. " +
    `Choose exactly ONE action from: ${ACTIONS.join(", ")}. Act by ref, never by CSS.\n` +
    "Reply with ONLY a JSON object (no prose, no markdown fence) matching this schema:\n" +
    JSON.stringify(STEP_RESOLUTION_SCHEMA) +
    "\nExamples: to type, {\"action\":\"type\",\"ref\":\"e2\",\"args\":[\"Buy milk\"],\"reasoning\":\"...\"}. " +
    "To submit a form, {\"action\":\"press\",\"args\":[\"Enter\"],\"reasoning\":\"...\"}."
  const user = `Accessibility tree:\n${serializedTree}\n\nStep: ${intent}`
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ]
}
