# BugDrop Board Release State Consolidation

## Goal

Consolidate the current BugDrop Board v0.1.0 release state after production dogfood and workflow
proofs, then leave a clear starter for the next product tranche.

## Oracle

The release state is consolidated only when all of the following are true:

- A durable release-readiness receipt records the current v0.1.0 state, including npm package,
  production Worker, production dogfood, production deploy workflow with browser CORS smoke, and
  package workflow dry-run proof.
- GitHub Release `v0.1.0` exists and links to the release receipt, production dogfood receipt,
  production deploy proof, package dry-run proof, and npm package.
- The receipt and release notes explicitly preserve exclusions: no hosted control plane, billing,
  realtime transport, comments, downvotes, GitHub Projects, secret rotation, or new npm publish.
- The board records a next starter for embedded UX polish plus install ergonomics, without starting
  that product tranche in this release-state task.
- Final verification proves no local dirty worktree, no open release hygiene PR, no failed latest
  workflow, and no accidental publish/version bump.

## Scope

In scope:

- Release-readiness receipt docs.
- GitHub Release `v0.1.0` metadata and notes.
- GoalBuddy state/receipt files for this consolidation tranche.
- A next-tranche starter command for embedded UX polish and install ergonomics.

Out of scope:

- Publishing a new npm version.
- Changing package version, Worker runtime, widget runtime, API behavior, or production secrets.
- Creating a hosted control plane, billing, realtime, comments, downvotes, or GitHub Projects
  behavior.
- Rotating credentials or changing repository/environment secrets.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-release-state-consolidation/goal.md.`
