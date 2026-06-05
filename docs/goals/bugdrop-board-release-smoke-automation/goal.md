# BugDrop Board Release Smoke Automation

## Goal

Execute the post-v0.1.0 release-hardening tranche that turns the manual clean-install npm package
smoke proof into a reusable local command and post-publish workflow check.

## Oracle

A maintainer can verify the published npm package by installing it into a temporary project and
proving the public entrypoints resolve to the installed `public/board.js` bundle. Future non-dry-run
package publishes run that same smoke automatically after `npm publish`.

Completion must prove:

- A local npm script and Make target run the registry install smoke.
- The smoke script verifies root, `/board`, and `/board.js` entrypoints without relying on
  non-exported package internals.
- The package workflow runs the smoke only after a real publish, not during dry-runs.
- README documents the command and its purpose.
- Existing validation gates still pass.
- Final audit confirms no new npm publish, secret rotation, production credential change, hosted
  control plane, billing, realtime, comments, downvotes, GitHub Projects, or unrelated product
  behavior was added.

## Scope

In scope:

- Release smoke script and local commands.
- Package workflow post-publish verification.
- README release/package verification docs.
- GoalBuddy receipts for this tranche.

Out of scope:

- Publishing a new npm version.
- Rotating or changing secrets.
- Changing production deploy credentials.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-release-smoke-automation/goal.md.`
