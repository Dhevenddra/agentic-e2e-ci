/**
 * Applied to EVERY outbound string: comment body, check output, artifacts, logs.
 * One implementation, used everywhere — a second one is how a leak happens.
 */
const SECRET_ENV_KEYS = ["SOLARI_API_KEY", "MODEL_API_KEY", "GITHUB_TOKEN", "TEST_PASSWORD"]

export function redact(text: string, extra: string[] = []): string {
  const values = [
    ...SECRET_ENV_KEYS.map((k) => process.env[k]).filter((v): v is string => !!v && v.length > 6),
    ...extra,
  ]
  return values.reduce((acc, v) => acc.split(v).join("***REDACTED***"), text)
    .replace(/slr_live_[A-Za-z0-9]+/g, "slr_live_***")
}
