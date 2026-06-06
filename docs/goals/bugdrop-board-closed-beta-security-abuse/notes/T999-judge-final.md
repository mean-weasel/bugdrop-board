# T999 Final Judge Audit

Status: pass

Decision: complete. Closed Beta Board 2 satisfies the security/abuse hardening oracle.

## Requirement Audit

- Read and events endpoints have bounded misuse controls: pass. `list_items` and `list_events`
  actions are enforced through the shared D1-backed throttle path after auth and board existence
  checks.
- Focused tests for allowed and over-limit read/event behavior: pass. `test/request-throttling.test.ts`
  covers allowed reads/events, `429` responses, and isolation from other throttle actions.
- Board token max TTL: pass. `verifyBoardToken` rejects tokens whose `exp` is beyond the configured
  max future TTL, defaulting to `300` seconds.
- Event payload privacy: pass. New upvote events serialize only `itemId`, and `listEvents` scrubs
  `externalUserId` from legacy payload rows before returning viewer events.
- CORS negative smoke proof: pass. `scripts/verify-deployed-worker.js` supports
  `--cors-disallowed-origin` / `DEPLOY_SMOKE_CORS_DISALLOWED_ORIGIN` and fails on wildcard or
  disallowed-origin CORS exposure.
- Docs: pass. README and closed-beta setup guidance describe read/event throttles, max TTL,
  event-payload privacy, and the CORS/auth boundary.
- Exclusions: pass. No npm publish, package version bump, Cloudflare deploy, credential/secret edit,
  hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, status workflow, or
  ops monitoring implementation was introduced.

## Proof

- `npm run validate` passed: lint, format, typecheck, package workflow check, and 72 tests.
- `npm run test -- request-throttling routes board-token board-repository verify-deployed-worker`
  passed: 5 files, 43 tests.
- `npx prettier --check README.md docs/closed-beta-setup.md docs/goals/bugdrop-board-closed-beta-security-abuse/goal.md docs/goals/bugdrop-board-closed-beta-security-abuse/state.yaml docs/goals/bugdrop-board-closed-beta-security-abuse/notes/*.md scripts/verify-deployed-worker.js test/verify-deployed-worker.test.ts src/routes/api.ts src/lib/request-throttle.ts`
  passed.
- `node /Users/neonwatty/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.8/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/bugdrop-board-closed-beta-security-abuse/state.yaml`
  passed.
- `git diff -U0 -- scripts src test wrangler.toml package.json .github | rg --pcre2 -n "^\\+.*(npm publish|npm version|wrangler deploy(?! --dry-run)|secret put|GitHub Projects|downvotes|comments|realtime|billing|hosted control plane|status workflow|incident response|backup/export|restore)" || true`
  returned no code/config/workflow hits.
