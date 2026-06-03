# Agent Instructions

BugDrop Board is an embedded, self-hostable ideas/request board. The intended stack is:

- **Backend**: Cloudflare Worker using Hono.
- **Durable state**: Cloudflare D1 for boards, items, upvotes, statuses, and polling events.
- **Files**: Cloudflare R2 only when attachments or screenshots become part of scope.
- **Widget**: vanilla TypeScript embedded in a user's app, isolated from host page styles as
  much as practical.
- **Integration**: GitHub App creates one GitHub Issue for each board item.
- **Auth**: host app signs short-lived board tokens for app users; BugDrop Board does not
  own login in v1.
- **Testing venue**: a dummy host app should exercise embed loading, signed tokens, item
  creation, upvoting, status display, and polling.

Use `docs/superpowers/specs/2026-06-03-bugdrop-board-design.md` as the current product
and architecture source of truth until it is superseded by a newer accepted spec.

## Workflow

- Before meaningful feature work, write or update a short design/plan in the repo.
- Keep changes aligned with the embedded-first, hosted-plus-self-hosted product shape.
- Prefer BugDrop's existing conventions where they fit: strict TypeScript, small focused
  modules, Worker/Hono API boundaries, vanilla TypeScript widget code, Playwright E2E
  for browser workflows, and Vitest for focused unit tests.
- Do not add a hosted standalone portal, comments, downvotes, anonymous mutations,
  GitHub Projects integration, or WebSocket/Durable Object realtime unless a newer spec
  explicitly brings that into scope.
- Treat GitHub Issues as the engineering mirror. Treat D1 as the source of truth for board
  presentation, upvotes, status, and polling.
- Keep self-hosting in mind when adding configuration. Avoid hidden managed-only behavior
  unless the hosted and self-hosted paths are both documented.

## Expected Verification Commands

Once the scaffold exists, prefer these checks before calling work complete:

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run test`
- `npm run build:widget`
- `npm run test:e2e`

When the exact scripts do not exist yet, use the closest available command and record the
gap. If a change creates a new proof need, add the narrowest useful verifier rather than
leaving the proof as a manual ritual.

## Risk-Scaled Evidence

Choose verification based on the change's real risk.

| Change category | Realistic failure modes | Expected proof |
| --- | --- | --- |
| Standard TypeScript | Type drift, lint regressions, unused code, formatting churn | lint, format check, typecheck, focused unit tests |
| Worker API | Wrong status code, bad validation, unsafe CORS, broken GitHub error path | route tests, mocked GitHub client, negative request cases |
| Host-signed auth | Expired token accepted, wrong board scope accepted, forged user id trusted | negative auth tests for missing, expired, malformed, and wrong-scope tokens |
| D1 schema/data | Migration drift, duplicate upvotes, stale counters, cross-board leakage | migration check, D1 integration test, uniqueness and transaction tests |
| Polling/freshness | Acting user waits for own write, other viewers miss events, cursor skips updates | API cursor tests, two-client Playwright smoke, direct event-log inspection |
| Widget UI | Loads in test page but fails embedded, host styles leak, mobile layout breaks | Playwright trace, screenshots, console inspection, dummy host app smoke |
| GitHub integration | Item created without issue, duplicate issue, wrong repo, noisy vote writes | mocked API tests, fixture replay, direct inspection of issue payload |
| Self-hosting/config | Hosted assumptions leak into self-hosted setup, missing secret/env binding | Wrangler config inspection, docs check, local Worker smoke with explicit env |
| Security | Secret exposed to browser, injection in rendered item content, auth bypass | direct source inspection, negative tests, dependency/config audit |

## Burden Of Proof

Assume the implementation is still wrong until evidence proves otherwise. Do not accept
optimistic UI, passing happy-path tests, generated summaries, `done`, `tests passed`, or
agent claims as proof.

For meaningful work, identify the top three realistic failure modes and verify each with
a command, test, trace, screenshot, audit record, query, deployed smoke check, diff, or
direct inspection. Either fix the failure mode or document the evidence that rules it out.
Include that evidence in the final handoff.

For auth, data durability, GitHub integration, polling, database migrations, or
user-facing workflow changes, include at least one negative or adversarial case. Treat
unverified assumptions as blockers or explicit follow-ups.

## Handoff Receipt

Final handoffs should include:

- Files changed.
- User-facing or developer-facing claims made.
- Commands/checks run and whether they passed.
- The strongest realistic failure modes considered.
- Evidence that rules those failure modes out, or the remaining proof gaps.
- Residual risks or follow-ups.

Do not convert unsupported completion claims into facts because they sound confident.
Evidence must name the exact command, artifact, file, line, trace, screenshot, URL, or
inspection result.
