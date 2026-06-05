# BugDrop Board Deploy Smoke Makefile Env

## Goal

Make the Makefile deploy smoke helper match the verifier script contract by supporting both
Makefile variables and `DEPLOY_SMOKE_*` environment variables.

## Oracle

Both `make deploy-smoke URL=... EXPECT_ENVIRONMENT=...` and
`DEPLOY_SMOKE_URL=... DEPLOY_SMOKE_EXPECT_ENVIRONMENT=... make deploy-smoke` verify the deployed
Worker without deploying, publishing, rotating secrets, or changing runtime product behavior.

## Scope

In scope:

- `Makefile` deploy smoke helper ergonomics.
- README deploy smoke examples.
- GoalBuddy receipts for this release-readiness tranche.

Out of scope:

- New npm publish or version bump.
- Production deploys or credential changes.
- Runtime product behavior.
- Hosted control plane, billing, realtime, comments, downvotes, or GitHub Projects.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-deploy-smoke-makefile-env/goal.md.`
