# BugDrop Board Release Blocker Removal

## Goal

Remove the reversible release blockers that can be handled from the current CLI session, and leave
only explicit operator-token/approval gates.

## Oracle

Completion requires proof that production GitHub Environment, generated board secret, production D1
database, production D1 migrations, and production Wrangler config are in place, plus a receipt
showing npm publish and production deploy are still blocked only by missing operator-provided
tokens/origin decisions.

## Scope

In scope:

- GitHub Environment `production`.
- Production Environment secrets that can be safely derived or generated without printing values.
- Cloudflare D1 production database and migrations.
- Production Wrangler environment config.
- npm registry/token readiness inspection.
- Receipts and GoalBuddy state updates.

Out of scope without explicit follow-up approval and credentials:

- npm publish.
- Production Worker deploy.
- Writing operator-provided token values that are unavailable locally.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-release-blocker-removal/goal.md.`
