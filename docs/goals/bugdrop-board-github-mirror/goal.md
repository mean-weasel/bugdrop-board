# BugDrop Board GitHub Mirror

## Objective

Build Conveyor Board 2 from the BugDrop Board implementation plan: add validation,
GitHub Issue client behavior, and create-item route behavior so a valid host-signed user can
create a D1 board item that is mirrored to exactly one GitHub Issue.

## Original Request

`$goal-prep Build Conveyor Board 2 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md: validation/GitHub client and real GitHub Issue mirroring only, using the completed Board 1 D1/auth foundation and excluding widget UI, polling, dummy host app, Playwright/E2E, comments, downvotes, GitHub Projects, and realtime.`

## Intake Summary

- Input shape: `existing_plan`
- Audience: BugDrop Board implementation workers and reviewers
- Authority: `requested`
- Proof type: `test`
- Completion proof: creating an item with a valid host-signed token validates input, creates
  exactly one mocked GitHub Issue payload, persists the D1 item with issue number and URL,
  appends an event, rejects invalid/missing/wrong-scope tokens, and fails without a D1 item
  when GitHub issue creation fails; `make check` and `npm run validate` pass after final
  edits.
- Goal oracle: run mocked GitHub client tests, route tests with a local D1 database and
  host-signed tokens, failure-path tests proving no orphaned D1 item on GitHub failure, run
  `make check`, run `npm run validate`, inspect the route/client injection path directly,
  and audit that no widget UI, polling, dummy host app, Playwright/E2E, comments, downvotes,
  GitHub Projects, realtime, screenshot, or annotation behavior was added.
- Likely misfire: creating D1 items without GitHub Issues, treating the GitHub private key as
  an installation token, trusting a browser-provided user id, or hiding GitHub side effects
  behind weak happy-path tests.
- Blind spots considered: Board 1 intentionally kept GitHub issue fields nullable; Board 2
  should populate them through the create-item flow without adding broader widget/polling
  behavior. GitHub App installation-token mechanics may require a Scout decision before
  production code, but tests should use injected issue creation and mocked network calls.
- Existing plan facts: use
  `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`; preserve Conveyor
  Board 2's oracle; relevant plan slices are Task 5 and Task 6; build on completed Board 1
  D1/auth foundation; defer Board 3+ work.

## Goal Oracle

The oracle for this goal is:

Creating an item with a valid token persists a D1 item, creates one mocked GitHub Issue
payload, stores the issue number and URL, appends an event, and fails atomically when GitHub
creation fails. `make check` passes, `npm run validate` passes, and a final audit records
direct evidence that no widget UI, polling, dummy host app, Playwright/E2E, comments,
downvotes, GitHub Projects, realtime, screenshot, or annotation behavior was added in this
tranche.

The PM must keep comparing task receipts to this oracle. Passing a GitHub client unit test
alone is not enough. Passing a route happy path alone is not enough. The goal finishes only
when a final Judge/PM audit maps receipts and verification back to this oracle and records
`full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Complete Conveyor Board 2 only. This includes input validation, a minimal GitHub Issue
client or issue-creator interface, create-item API behavior with host-signed token
verification, D1 persistence with issue metadata, event append behavior, and failure-path
tests proving GitHub failure does not leave an orphaned board item. It does not include
widget UI, polling/event API, dummy host app work, Playwright/E2E, comments, downvotes,
GitHub Projects, realtime/WebSocket behavior, screenshot capture, or annotation behavior.

## Non-Negotiable Constraints

- Use `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md` as the input plan.
- Preserve the Conveyor Board 2 oracle: valid create persists D1 item, creates exactly one
  mocked GitHub Issue payload, stores issue number/URL, appends an event, and fails
  atomically when GitHub creation fails.
- Follow `AGENTS.md` proof expectations and final handoff receipt style.
- Keep the implementation aligned with the accepted design spec:
  `docs/superpowers/specs/2026-06-03-bugdrop-board-design.md`.
- Use the completed Board 1 D1/auth foundation instead of reimplementing auth or storage.
- Do not implement widget UI, polling API, dummy host app, Playwright/E2E, comments,
  downvotes, GitHub Projects, realtime/WebSocket behavior, screenshot capture, or annotation
  behavior in this tranche.
- Do not treat `GITHUB_PRIVATE_KEY` as a GitHub installation token in final code. If GitHub
  App installation-token generation is not implemented in this tranche, use an injected
  issue-creator boundary and explicit configuration names that do not lie about token type.
- Do not trust a browser-provided user id without verifying the host-signed board token.

## Stop Rule

Stop only when a final audit proves the full original outcome for this tranche is complete.

Do not stop after Scout findings, GitHub client unit tests, or route happy-path tests if the
atomic failure path, D1 issue metadata, event append, and forbidden-scope audit remain
unproven.

If production GitHub App token mechanics require credentials or a larger design than this
tranche allows, mark that exact slice blocked with a receipt, use an injectable interface for
local route behavior, and continue all safe local work that still proves the Board 2 oracle.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice. For this tranche, Scout should first validate
the route/client injection and atomicity strategy. Judge should then choose either one
combined Worker package or split GitHub-client and route behavior only if the production
GitHub auth boundary makes a combined package unsafe.

## Canonical Board

Machine truth lives at:

`docs/goals/bugdrop-board-github-mirror/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task,
receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/bugdrop-board-github-mirror/goal.md.
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
