# BugDrop Board Scaffold

## Objective

Build Conveyor Board 0 from the BugDrop Board implementation plan: scaffold the Worker,
TypeScript, validation, test, CI, knip, commit-hook, Wrangler, and widget-build rails
without adding application behavior beyond a health route and a bootstrapping widget bundle.

## Original Request

`$goal-prep Build Conveyor Board 0 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md, preserving the scaffold oracle and constraints.`

## Intake Summary

- Input shape: `existing_plan`
- Audience: the BugDrop Board implementation workers and reviewers
- Authority: `requested`
- Proof type: `test`
- Completion proof: `make check`, `npm run validate`, and `npm run build:widget` pass;
  `public/board.js` exists; the starter CI workflow exercises lint, format, typecheck,
  knip, audit, unit tests, and build rails; and the scaffolded widget entry is minimal.
- Goal oracle: run `make check`, run `npm run validate`, run `npm run build:widget`,
  directly inspect that `public/board.js` exists, inspect the CI/knip/commit-hook configs,
  and verify the scaffold does not pull screenshot-specific BugDrop behavior into this repo.
- Likely misfire: copying BugDrop too literally and dragging screenshot, annotation, or
  feedback-category code into a board scaffold that should only establish rails.
- Blind spots considered: Cloudflare D1 testing should use current Workers Vitest pool
  patterns later, but this tranche should not implement board data/auth behavior.
- Existing plan facts: use
  `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`; preserve Conveyor
  Board 0's scaffold oracle; create only build rails, health route, and minimal widget
  bootstrap in this tranche.

## Goal Oracle

The oracle for this goal is:

`make check` passes, `npm run validate` passes, `npm run build:widget` exits 0, `public/board.js` exists, starter CI/knip/commit-hook rules are present, and a final audit records direct evidence that no screenshot/annotation feedback code was copied into the scaffold.

The PM must keep comparing task receipts to this oracle. Planning, discovery, a passing tiny
slice, or a clean-looking board is not enough. The goal finishes only when a final Judge/PM
audit maps receipts and verification back to this oracle and records
`full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Complete the largest safe local scaffold slice for Conveyor Board 0. This includes package
tooling, TypeScript configs, lint/format/knip/audit/test setup, commitlint/lint-staged hooks,
starter GitHub Actions CI, Wrangler config, a minimal Worker health route, a minimal widget
entry, and a widget build script. It does not include D1 schema, auth, GitHub issue
creation, item routes, upvotes, polling behavior, or E2E host app work.

## Non-Negotiable Constraints

- Use `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md` as the input plan.
- Preserve the Conveyor Board 0 oracle: `make check`, `npm run validate`, and
  `npm run build:widget`.
- Follow `AGENTS.md` proof expectations and final handoff receipt style.
- Keep the scaffold aligned with the accepted design spec:
  `docs/superpowers/specs/2026-06-03-bugdrop-board-design.md`.
- Do not implement board items, D1 repositories, host-signed auth, GitHub issue mirroring,
  upvotes, polling, comments, downvotes, GitHub Projects, or realtime/WebSocket behavior in
  this tranche.
- Do not copy BugDrop screenshot, annotation, element-picker, or feedback category code into
  this repo.
- Use vanilla TypeScript for the widget and Hono on Cloudflare Workers for the API.

## Stop Rule

Stop only when a final audit proves the full original outcome for this tranche is complete.

Do not stop after planning, discovery, or Judge selection if the user asked for working
software and a safe Worker task can be activated.

Do not stop after a single verified Worker package when the tranche oracle still has safe
local follow-up work. Advance the board to the next highest-leverage safe Worker package and
continue unless a phase, risk, rejected-verification, ambiguity, or final-completion review
is due.

Do not create one Worker/Judge pair per repeated file, config, script, or helper. Put
repeated same-shape scaffold work into one Worker package and review the package as a whole.

## Slice Sizing

Safe means bounded, explicit, verified, and reversible. It does not mean tiny.

A good task is the largest safe useful slice.

Small is not the goal. Useful is the goal.

A Worker should finish the whole assigned slice. A Judge should judge the whole assigned
slice. A PM should reorient the board when tasks are safe but not moving the outcome.

Tiny tasks are allowed when the failure is isolated, the risk is high, the scope is unknown,
or the tiny task unlocks a larger slice. Tiny tasks are bad when they keep happening, do not
change behavior, only add wrappers/contracts/proof files, or avoid the real milestone.

Do not stop because a slice needs owner input, credentials, production access, destructive
operations, or policy decisions. Mark that exact slice blocked with a receipt, create the
smallest safe follow-up or workaround task, and continue all local, non-destructive work that
can still move the goal toward the tranche oracle.

## Canonical Board

Machine truth lives at:

`docs/goals/bugdrop-board-scaffold/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task,
receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/bugdrop-board-scaffold/goal.md.
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
