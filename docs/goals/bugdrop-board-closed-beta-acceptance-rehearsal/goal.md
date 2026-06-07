# BugDrop Board Closed Beta Acceptance Rehearsal

## Goal

Run the first-beta acceptance proof against the existing production dogfood target and record a
dated acceptance rehearsal receipt.

## Oracle

The final acceptance packet's per-install proof is exercised against `https://bugdrop.dev` and
`https://board.bugdrop.dev`, producing a durable receipt that either upgrades the dogfood target to
go-ready or records a precise blocker.

Completion must prove:

- `npm run doctor:selfhost` passes for the production dogfood target.
- `npm run deploy:smoke` passes with allowed and disallowed origins.
- Two signed dogfood viewers can load the embedded board, create one uniquely titled item, observe
  GitHub Issue mirroring, observe polling visibility, toggle one upvote, and preserve state after
  refresh.
- GitHub and API read-back agree with the browser proof.
- A dated receipt under `docs/production-dogfood-results/` records the acceptance decision, proof,
  and redaction/scope audit.
- The board does not deploy, publish, rotate credentials, mutate secrets, destructively clean
  dogfood data, or add product behavior.

## Scope

In scope:

- One new dogfood item and one upvote in the existing production dogfood board.
- One dated receipt under `docs/production-dogfood-results/`.
- GoalBuddy receipts for this rehearsal.

Out of scope:

- Production deploys, D1 mutations outside normal dogfood item/upvote writes, credential or secret
  changes, npm publishing, package version bumps, destructive dogfood cleanup, hosted control plane,
  billing, realtime, comments, downvotes, GitHub Projects, status/admin workflow, monitoring
  implementation, and backup/export/restore automation.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-closed-beta-acceptance-rehearsal/goal.md.`
