# BugDrop Board Mainline Release Rehearsal

## Goal

Run Conveyor Board 10 after PR #9 has merged: prove merged `main` can perform the release-readiness
path without publishing npm or deploying production.

## Oracle

Completion requires a committed receipt showing merged `main` is clean, local release gates pass,
the package workflow dry-runs from `main`, staging promotion can run from `main`, deployed staging
HTTP smoke passes, and the signed-token two-viewer staging dogfood proof still works.

## Scope

In scope:

- Mainline verification from a clean `main` checkout.
- Package workflow dry-run from `main`.
- Staging Deploy Worker workflow from `main`.
- Staging HTTP and browser dogfood proof.
- Receipt and GoalBuddy state updates.

Out of scope:

- npm publish.
- Production deploy or production resource mutation.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-mainline-release-rehearsal/goal.md.`
