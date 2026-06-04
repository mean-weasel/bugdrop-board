# BugDrop Board First Production Promotion

## Goal

Prepare Conveyor Board 13 for the first production promotion, but keep the actual production deploy
approval-gated.

## Oracle

Completion requires a ready-to-run promotion checklist with explicit approval gates, exact commands,
rollback, smoke tests, and blocked status for the production mutation until the maintainer approves
the deploy.

## Scope

In scope:

- Promotion plan, checklist, stop conditions, and approval gate.
- Preflight commands that do not mutate production.
- Receipt explaining what will happen when approved.

Out of scope without explicit approval:

- Production Cloudflare resource creation.
- Production secret writes.
- Production Worker deploy.
- npm publish.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-first-production-promotion/goal.md.`
