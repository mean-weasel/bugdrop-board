# BugDrop Board Docs Drift Cleanup

## Goal

Clean up post-v0.1.0 README drift discovered during the autonomous conveyor: align package workflow
docs with release-smoke automation and update stale release handoff language.

## Oracle

The README accurately reflects the current release state without implying a new npm publish,
production deploy, secret rotation, hosted control plane, billing, realtime, comments, downvotes,
GitHub Projects, or unrelated product behavior.

Completion must prove:

- The package workflow docs mention the post-publish release smoke.
- Current handoff notes reflect that `@mean-weasel/bugdrop-board@0.1.0` and `board.bugdrop.dev`
  are live.
- Standard docs/code verification passes.

## Scope

In scope:

- README docs accuracy edits.
- GoalBuddy receipts for this docs cleanup tranche.

Out of scope:

- New npm publish or version bump.
- Production deploys or credential changes.
- Runtime product behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-docs-drift-cleanup/goal.md.`
