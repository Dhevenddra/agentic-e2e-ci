# demo-app

The controlled target for this tool's own end-to-end self-tests and for the launch demos.

Needs: a home page with a product list, a cart, a signup form, and a checkout that accepts
a test card. Small and boring on purpose — Vite + React is enough.

## Seeded branches

| Branch | Change | Expected result |
|---|---|---|
| `seed/cosmetic-change` | Renamed classes, restructured wrappers, reordered DOM | **Green**, `healed: 1+`. Equivalent Playwright test goes red. |
| `seed/broken-checkout` | Coupon logic genuinely broken | **Red**, names the failing step, links a replay |
| `seed/flaky-load` | Race on initial product fetch | **Neutral** — labelled flake, does not block |

These three branches are the test suite for the tool itself and the source material for the
launch post. Build them properly.
