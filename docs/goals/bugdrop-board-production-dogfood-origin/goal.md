# BugDrop Board Production Dogfood Origin

## Goal

Prepare the production board Worker configuration for embedded dogfood from `https://bugdrop.dev`
while preserving the existing `https://board.bugdrop.dev` board endpoint.

## Oracle

The production Worker config lists exact allowed origins for the real dogfood host and existing
board domain, README handoff notes name the selected host/board pair, current validation gates pass,
and no deployment, secret rotation, npm publish, hosted control plane, billing, realtime, comments,
downvotes, GitHub Projects, or unrelated product behavior is introduced.

## Scope

In scope:

- Production `ALLOWED_ORIGINS` config in `wrangler.toml`.
- README handoff notes for the selected dogfood target.
- GoalBuddy receipt for this release-readiness tranche.

Out of scope:

- Deploying production.
- Changing Worker secrets or GitHub tokens.
- Adding the host app endpoint/page in the `bugdrop` repo.
- New product behavior beyond configuration/docs.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-production-dogfood-origin/goal.md.`
