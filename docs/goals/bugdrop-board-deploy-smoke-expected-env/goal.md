# BugDrop Board Deploy Smoke Expected Env

## Goal

Decouple deployed Worker smoke verification from the GitHub Environment name while preserving the
current default behavior.

## Oracle

The manual `Deploy Worker` workflow exposes an optional `smoke_expect_environment` input, defaults
to the selected GitHub Environment when it is blank, and passes that value to `npm run
deploy:smoke` without deploying, publishing, rotating secrets, or changing runtime product
behavior.

## Scope

In scope:

- `Deploy Worker` workflow smoke input wiring.
- README promotion instructions.
- GoalBuddy receipts for this release-readiness tranche.

Out of scope:

- New npm publish or version bump.
- Production deploys or credential changes.
- Runtime product behavior.
- Hosted control plane, billing, realtime, comments, downvotes, or GitHub Projects.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-deploy-smoke-expected-env/goal.md.`
