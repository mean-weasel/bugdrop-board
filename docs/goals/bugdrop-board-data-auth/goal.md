# BugDrop Board Data And Auth

## Objective

Build Conveyor Board 1 from the BugDrop Board implementation plan: add the D1 data model,
repository layer, local D1 test harness, and host-signed board token verification needed for
later item/API work.

## Original Request

`$goal-prep Build Conveyor Board 1 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md, preserving the Board 1 D1/auth oracle and excluding GitHub mirroring/widget/polling work.`

## Intake Summary

- Input shape: `existing_plan`
- Audience: BugDrop Board implementation workers and reviewers
- Authority: `requested`
- Proof type: `test`
- Completion proof: D1 migrations apply locally; repository tests prove board/item/vote
  uniqueness and cross-board isolation; token tests reject missing, malformed, expired,
  wrong-board, wrong-audience, wrong-issuer, tampered, and missing-user tokens; `make check`
  and `npm run validate` pass after final edits.
- Goal oracle: run the D1 migration/repository tests against the chosen local Workers/D1
  harness, run host-signed token negative tests, run `make check`, run `npm run validate`,
  inspect the D1 migration constraints directly, and audit that no GitHub mirroring, widget,
  polling, comments, downvotes, GitHub Projects, or realtime behavior was added.
- Likely misfire: accepting a forged user id, allowing duplicate upvotes under racing
  requests, leaking records across boards, or drifting into Board 2+ product behavior.
- Blind spots considered: Board 0 intentionally deferred the D1 harness, so Scout must
  validate the current Cloudflare Workers/Vitest/D1 setup before Worker edits; the token
  envelope should be durable enough for later embedded host use without implementing the host
  app yet.
- Existing plan facts: use
  `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`; preserve Conveyor
  Board 1's D1/auth oracle; relevant plan slices are Task 3 and Task 4; defer Task 5+ work.

## Goal Oracle

The oracle for this goal is:

D1 migrations apply locally, auth negative tests reject missing/expired/wrong-scope tokens,
board/item/vote repositories pass uniqueness and cross-board tests, `make check` passes,
`npm run validate` passes, and a final audit records direct evidence that no GitHub
mirroring, widget UI, polling, comments, downvotes, GitHub Projects, realtime behavior, or
item API route work was added in this tranche.

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing
happy-path repository test, or optimistic token helpers are not enough. The goal finishes
only when a final Judge/PM audit maps receipts and verification back to this oracle and
records `full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Complete Conveyor Board 1 only. This includes a local D1 migration/test harness, D1 schema
for boards/items/votes/events, repository modules and tests for board/item/vote/event
behavior, host-signed token helpers, shared types, and negative token tests. It does not
include GitHub issue creation, item creation API routes, widget UI, polling/event API
routes, dummy host app work, comments, downvotes, GitHub Projects, or realtime/WebSocket
behavior.

## Non-Negotiable Constraints

- Use `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md` as the input plan.
- Preserve the Conveyor Board 1 oracle: D1 migrations apply locally, auth negative tests
  reject missing/expired/wrong-scope tokens, and board/item/vote repositories pass
  uniqueness and cross-board tests.
- Follow `AGENTS.md` proof expectations and final handoff receipt style.
- Keep the implementation aligned with the accepted design spec:
  `docs/superpowers/specs/2026-06-03-bugdrop-board-design.md`.
- Do not implement GitHub issue mirroring, validation/GitHub clients, item API routes,
  widget UI, polling API, dummy host app, comments, downvotes, GitHub Projects, or realtime
  behavior in this tranche.
- Do not add Playwright/E2E work in this tranche.
- Do not copy BugDrop screenshot, annotation, element-picker, or feedback category code into
  this repo.
- Keep host auth based on short-lived signed tokens from the embedding host. Do not trust a
  browser-provided user id without signature verification.

## Stop Rule

Stop only when a final audit proves the full original outcome for this tranche is complete.

Do not stop after planning, Scout findings, or Judge selection if a safe Worker task can be
activated. Do not stop after D1 works if token verification remains queued, or after token
verification works if the D1 repository oracle remains unproven.

If D1 local harness setup is blocked by package/tooling drift, mark that exact blocker with
a receipt, create the smallest safe PM/Judge follow-up, and continue any local,
non-destructive work that still moves the goal toward the oracle.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice. For this tranche, Scout should first validate
the harness/token decisions; Judge should then choose either one combined Worker package or
two bounded Worker packages depending on real risk and file coupling.

## Canonical Board

Machine truth lives at:

`docs/goals/bugdrop-board-data-auth/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task,
receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/bugdrop-board-data-auth/goal.md.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Run the bundled GoalBuddy update checker when available and mention a newer version
   without blocking.
4. Re-check the intake: original request, input shape, authority, proof, blind spots,
   existing plan facts, and likely misfire.
5. Work only on the active board task.
6. Assign Scout, Judge, Worker, or PM according to the task.
7. Write a compact task receipt.
8. Update the board.
9. If safe local work remains, choose the next largest reversible Worker package and
   continue unless blocked.
10. Review at phase, risk, rejected-verification, ambiguity, or final-completion boundaries;
    do not review every small Worker by habit.
11. Finish only with a Judge/PM audit receipt that maps receipts and verification back to
    the original user outcome and records `full_outcome_complete: true`.
