# agentic-e2e-ci

**Plain-English end-to-end tests, run by an agent against an ephemeral preview of your
PR's own build, with a video replay of every failure.**

Built on [Solari](https://getsolari.com) — sandboxes, stealth browsers and session
recording behind one API key.

```ts
// agent-e2e.config.ts
export default defineConfig({
  build: "npm run build",
  serve: "npm run preview",
  port: 4173,
  scenarios: [{
    name: "signup-and-checkout",
    steps: `
      Sign up with email %email% and password %password%.
      Add the first item on the home page to the cart.
      Go to the cart and check out with test card %card%.
    `,
    expect: "The order confirmation page shows an order number.",
  }],
})
```

Open a PR. Get this back:

```
### Agentic E2E — 3 scenarios

| Scenario            | Result | Steps | Healed | Replay |
|---------------------|--------|-------|--------|--------|
| signup-and-checkout | pass   | 7/7   | 1      | watch  |
| guest-browse        | pass   | 4/4   | 0      | —      |
| apply-coupon        | FAIL   | 3/5   | 0      | watch  |
```

---

## Why

End-to-end tests are the tests teams most want and least keep.

- ~**16% of tests** exhibit flaky behaviour — roughly 1 in 7 (Google Engineering
  Productivity Research), and ~84% of pass→fail transitions involve a flaky test.
- **~3.7 engineering hours** to fix a single flaky test (Google, 2020).
- **25–50% of QA budgets** go to test maintenance (World Quality Report).
- **10–15% of E2E tests break** after a significant frontend deploy — through selector rot
  alone, with no behaviour change at all.

Do the arithmetic on a 300-test suite where each test independently fails 0.5% of runs:
`1 − 0.995³⁰⁰ ≈ 78%` of suite runs contain at least one flaky failure. That's why the check
goes yellow, then ignored, then deleted.

The root cause of selector rot: tests are written against implementation details that
change for reasons unrelated to behaviour. So don't write them against implementation
details.

## How it works

1. A Solari **sandbox** builds and serves your PR's code, exposed on a public preview URL.
2. A Solari **stealth browser** opens it, with recording on.
3. An agent reads the **accessibility tree** and executes your English scenarios.
4. Each resolved step is **cached to your repo** — repeat runs make zero LLM calls.
5. When a cached step drifts, the agent **re-resolves it** and the new locator shows up in
   your diff.
6. A failure is only a **regression** if it reproduces on re-runs of the same commit.
   Otherwise it's labelled a flake and doesn't block your merge.

The healed count is printed on every run. That number is the argument: it's the change
that would have broken a brittle test, absorbed, and made visible in code review.

## What you need (bring your own keys)

This tool is the **engine**; the API keys are the **fuel** — and everyone brings their own.
Installing it shares the code, never anyone's keys. To use it on your repo you sign up for
two accounts and add their keys as **your** repo secrets:

- a **[Solari](https://getsolari.com)** account — the sandbox that builds your PR, the stealth
  browser, and the session recording, and
- a **model** account for the agent's brain — [Fireworks](https://fireworks.ai), OpenAI, or any
  OpenAI-compatible endpoint.

Your runs bill **your** Solari and model accounts, not ours. The keys live only in your repo's
encrypted secrets — they are never in the published package and never reach fork-controlled code.
(It's like a game you download for free but log into with your own account.)

## Install

```
npm i -D agentic-e2e
npx agentic-e2e init
```

Then add `SOLARI_API_KEY` and `MODEL_API_KEY` as repo secrets and open a PR. Two workflows
are written for you:

- **`e2e-build`** (`pull_request`) — runs your fork's code with **no secrets**, builds it,
  uploads the build as an artifact.
- **`e2e-agent`** (`workflow_run`) — runs **base-branch code only**, holds the secrets,
  downloads the artifact, and runs the agent inside an isolated Solari microVM.

That split is deliberate: a fork PR can never reach your API key, because the job that holds
it never checks out fork-controlled code. Gate the privileged job behind a GitHub
**Environment** with a required reviewer for the strongest guarantee.

## What this is not

Not a Playwright replacement for unit-level or component tests. Not multi-browser. Not
visual regression. Not a hosted service — there's no backend, state lives in your repo and
in GitHub.

## Credits

Built for the Pinetree Research build challenge. Browser automation patterns owe a lot to
Stagehand's observe/cache/heal design.

MIT.
