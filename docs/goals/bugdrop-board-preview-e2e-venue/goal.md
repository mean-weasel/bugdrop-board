# BugDrop Board Preview E2E Venue

## Objective

Mirror the original BugDrop preview-testing pattern for BugDrop Board by delivering a dedicated
companion venue, a real isolated preview Worker/D1 environment, and protected CI that proves the
live signed-user workflow against those deployed surfaces.

The finished system should let maintainers and closed-beta evaluators open a stable demo URL while
the BugDrop Board repository continuously proves that the preview venue, preview Worker, D1 state,
host-signed authentication, GitHub Issue mirroring, upvoting, polling, cleanup, and deployment
provenance work together.

## Original Request

> Let's mirror this pattern, take a deep look at that test repo, as well as the additional items you
> know we will need. Make a detailed goal buddy prep plan to implement it, and then for the bug drop
> board repo to test against it in the CI mirroring our preview end-to-end tests in the original
> bugdrop.

## Intake Summary

- Input shape: `specific`
- Audience: BugDrop Board maintainers, closed-beta evaluators, and future contributors
- Authority: `requested`
- Proof type: `test`
- Completion proof: A protected pull request and merge-group run deploy the intended preview build,
  exercise the dedicated Vercel venue against the isolated preview Worker/D1 and mirror repository,
  pass the signed two-user create/upvote/polling flow, independently verify and clean the synthetic
  GitHub Issue, and leave durable redacted receipts.
- Goal oracle: The live preview system passes from a clean protected CI run using deployed surfaces,
  real server-signed tokens, real D1, and a real but tightly attributed GitHub Issue.
- Likely misfire: Building a polished static demo or green mocked Playwright test that bypasses
  server-side token signing, real preview D1, GitHub mirroring, same-build provenance, independent
  verification, or cleanup.
- Blind spots considered: Cross-repository ownership; stable versus per-commit Vercel URLs;
  serverless token secret containment; preview D1 migration lifecycle; exact CORS origins;
  synthetic Issue attribution and cleanup; concurrency; fork safety; merge-group behavior;
  deployment provenance; rate limits; secret rotation; rollback; accessibility; mobile layout;
  demo-data durability; production isolation; and CI cost/noise.
- Existing plan facts: Mirror `mean-weasel/bugdrop-widget-test`; use a separate Vercel venue and
  GitHub mirror repository; add the server-side signer that BugDrop Board requires; test against a
  Cloudflare preview deployment; and mirror the original BugDrop live-preview/merge-queue E2E model.

## Goal Oracle

The oracle for this goal is:

`A live Vercel preview venue and isolated BugDrop Board preview Worker complete and independently
verify the signed two-viewer item-create -> GitHub Issue -> upvote -> polling workflow in both PR and
merge-group CI, then clean every attributable synthetic Issue without touching unrelated data.`

The PM must keep comparing task receipts to this oracle. Repository creation, a deployed homepage,
passing unit tests, a successful Worker deploy, or a single browser screenshot is not enough. The
goal finishes only when a final Judge maps live URLs, build provenance, CI runs, issue verification,
cleanup evidence, secret boundaries, rollback instructions, and protected-branch results back to
the oracle and records `full_outcome_complete: true`.

## Goal Kind

`specific`

## Current Tranche

Complete the whole preview-system vertical slice:

1. Discover and preserve the proven contracts in `mean-weasel/bugdrop-widget-test` and the original
   BugDrop preview/live-test workflows.
2. Decide the cross-repository architecture and threat model before writes.
3. Establish the companion venue and its server-side signed-token contract.
4. Establish a production-isolated Cloudflare preview Worker/D1 configuration.
5. Add live PR and merge-group E2E, independent Issue verification, and deterministic cleanup.
6. Provision only the approved external resources and secrets with least privilege.
7. Prove the live system, repair defects through bounded Worker packages, and finish with a
   skeptical security/readiness audit.

This is a continuous implementation goal, not a plan-only tranche. The prep turn stops before
execution; the later `/goal` run continues until the full oracle is proven or the exact remaining
external approval is the only blocker.

## Required System Shape To Validate

The Scouts and Judge must validate rather than blindly copy this candidate shape:

```text
bugdrop-board-widget-test (Vercel)
  stable production demo + fixed preview alias
  serverless /api/board-token endpoint
  two deterministic synthetic users
  allowlisted preview Worker selection
                 |
                 v
bugdrop-board preview Worker (Cloudflare)
  immutable build identity
  exact venue CORS origin
  isolated preview D1 + migrations
  preview-only board configuration
                 |
                 v
bugdrop-board-widget-test Issues
  unique CI marker + title prefix
  independent read/verification credential
  close-on-success + final sweep-on-failure
```

The Judge must explicitly decide whether the Vercel venue is one stable preview alias, a per-commit
deployment, or a stable shell that receives an allowlisted Worker origin/build identifier. It must
also decide how same-build provenance is proven without allowing arbitrary origins or exposing
secrets to the browser.

## Non-Negotiable Constraints

- Preserve the embedded-first architecture: the venue is a host app, not a new hosted control plane.
- Never expose `BOARD_TOKEN_SECRET`, GitHub credentials, Cloudflare credentials, Vercel credentials,
  raw bearer tokens, cookies, or secret-file contents to browser code, logs, traces, screenshots,
  receipts, artifacts, or committed files.
- The token endpoint must sign on the server, use stable synthetic user ids, scope tokens to exactly
  one board, and honor the configured audience, issuer, and maximum TTL.
- Preview must use a D1 database and board configuration isolated from staging and production.
- Preview CORS must name the exact approved venue origins; do not use `*` for the live proof.
- The Issue target must be dedicated to this preview system. Verification and cleanup credentials
  must be least-privilege and separate from browser/runtime credentials where practical.
- Synthetic Issues need an unambiguous title prefix and body marker containing run/build identity.
  Cleanup may touch only Issues matching the exact allowlisted repository and marker contract.
- Cleanup must run on success, failure, timeout, and cancellation where GitHub Actions permits it,
  with a final sweep that rejects duplicates and reports leftovers.
- PRs from forks or untrusted code must not receive deployment or cleanup secrets. Design explicit
  event, environment, and permission gates.
- Preview and production concurrency, prefixes, markers, resource names, secrets, and cleanup
  selectors must never overlap.
- PR and `merge_group` behavior must be intentionally supported; required-check names must remain
  stable and the merge queue must not be bypassed.
- Deployment provenance must connect the tested Worker response and venue configuration to the
  intended commit/build, not merely to a mutable URL.
- Do not add npm distribution, billing, comments, downvotes, realtime transport, GitHub Projects,
  or a general hosted admin portal.
- Do not deploy or modify production resources as part of this goal.
- External repository/project creation, persistent credentials, environment permissions, and DNS
  changes require exact target resolution and any action-time approval required by the execution
  surface. Continue all safe local work while an external slice waits.
- Keep self-hosted behavior documented and free of preview-only hidden assumptions.
- Use protected branches and the merge queue for both repositories once their CI contracts exist.
- Workers must preserve unrelated user changes and may edit only their task's `allowed_files`.

## Verification Expectations

The Judge may refine commands after discovery, but completion must include the closest supported
equivalents of:

- Companion venue: clean install, lint, formatting, typecheck, unit tests, production build, token
  endpoint negative tests, and a secret-prefix scan.
- BugDrop Board: `make check`, `npm run test`, `npm run build:widget`, deploy dry run for preview,
  migration/config validation, focused Playwright, and workflow-contract tests.
- Live smoke: venue health/page load, preview Worker `/health` and `/board.js`, expected environment
  and build identity, exact allowed-origin CORS, disallowed-origin rejection, valid token flow, and
  missing/expired/malformed/wrong-board token rejection.
- Live browser: two isolated contexts, real item creation, GitHub Issue link, second-viewer polling,
  acting-viewer pressed state, second-viewer unpressed state with shared count, refresh persistence,
  console/network error inspection, trace on failure, and one mobile viewport smoke.
- GitHub canary: independent Issue read, exact repo/title/body marker/build checks, duplicate
  rejection, close-on-success, failure-path cleanup, and zero attributable leftovers.
- CI: pull-request checks and merge-group checks pass from protected branches; untrusted/fork paths
  demonstrably cannot access preview or cleanup credentials.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after discovery, architecture selection, companion-repo scaffolding, deployment, or one
green happy-path run. If live proof finds defects, the PM must create the largest safe bounded
Worker repair package, verify it, and continue.

Do not stop because Vercel, Cloudflare, GitHub, or environment credentials require owner input.
Record the exact blocked external slice, continue every safe local task, and request the smallest
specific approval only when it is the sole remaining blocker.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

The companion venue should be implemented as one coherent vertical slice after its architecture is
approved. The BugDrop Board preview environment and its validation should be one coherent slice.
The live workflow, browser test, verification, and cleanup contract should be one coherent slice
unless the Judge finds that secret/event risk requires a separate boundary.

## Board Health

The PM owns board health. Validate the board with:

```bash
node /Users/neonwatty/.codex/plugins/cache/goalbuddy/goalbuddy/0.4.3/skills/goal-prep/scripts/check-goal-state.mjs \
  docs/goals/bugdrop-board-preview-e2e-venue
```

## Canonical Board

Machine truth lives at:

`docs/goals/bugdrop-board-preview-e2e-venue/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts,
verification freshness, and completion truth.

## Run Command

```text
Codex: /goal Follow docs/goals/bugdrop-board-preview-e2e-venue/goal.md.
Claude Code: /goalbuddy Follow docs/goals/bugdrop-board-preview-e2e-venue/goal.md.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter, the GoalBuddy execution contract, and `state.yaml`.
2. Run the GoalBuddy update checker when available.
3. Work only on the active board task and dispatch its exact role.
4. Write a compact evidence-backed receipt and update board truth.
5. Keep one active task; keep at most one write Worker.
6. Recheck the oracle after every Worker package.
7. Use Judge review at the architecture, security, live-proof, and final boundaries.
8. Convert live defects into bounded repair tasks rather than weakening assertions.
9. Before stopping, run `check-can-stop.mjs`; continue if safe required work remains.
