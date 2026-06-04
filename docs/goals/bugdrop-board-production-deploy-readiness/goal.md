# BugDrop Board Production Deploy Readiness

## Goal

Run Conveyor Board 12: verify production deployment readiness without mutating production.

## Oracle

Completion requires read-only inspection of production GitHub/Cloudflare readiness where possible,
local production-shaped dry-run evidence, an exact production secret/resource checklist, and a clear
blocked/gated handoff for any production mutation.

## Scope

In scope:

- Read-only GitHub Environment/secret name checks.
- Read-only Cloudflare account/resource inventory.
- Local build, validation, package, and deploy dry-run checks.
- Production promotion checklist and rollback notes.

Out of scope:

- Creating production Cloudflare resources.
- Writing production secrets.
- Production Worker deploy.
- npm publish.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-production-deploy-readiness/goal.md.`
