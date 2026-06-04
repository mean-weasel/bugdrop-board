# BugDrop Board Release Promotion

## Goal

Execute Conveyor Board 10: self-host release automation and environment promotion only, using
completed Board 1-9 foundations and excluding hosted control plane, billing, realtime, comments,
downvotes, GitHub Projects, package publishing, and new product behavior.

## Oracle

A self-hoster can promote the Worker through a documented, manually dispatched GitHub Actions
workflow that runs the current validation gates, can apply remote D1 migrations and provision a
board, deploys with Wrangler using GitHub Environment secrets, and leaves package publishing for a
later board.

Completion must prove:

- A GitHub Actions workflow exists for manual environment promotion and uses Node 22 plus
  Node-24-ready core actions.
- The workflow runs current validation/build/deploy-readiness gates before deploy.
- The workflow can optionally apply remote D1 migrations and provision a board with existing
  commands.
- The workflow uses GitHub Environment secrets for Cloudflare and BugDrop Board secrets without
  committing secrets.
- README explains the promotion setup, inputs, verification, and rollback boundaries.
- Existing Board 1-9 behavior still passes through the standard gates.
- Final audit confirms no hosted control plane, billing, realtime, comments, downvotes, GitHub
  Projects, package publishing, or new product behavior was added.

## Scope

In scope:

- `.github/workflows/` release promotion workflow.
- README docs for self-host operator setup and promotion.
- Package/Makefile adjustments only if required to expose existing deploy checks cleanly.
- Verification that can run without production Cloudflare credentials.

Out of scope:

- Hosted control plane, tenant management, billing, account onboarding, or managed product release
  orchestration.
- Realtime/WebSocket/Durable Object/SSE transport.
- Comments, downvotes, GitHub Projects, status workflow expansion, or new voting semantics.
- Package publishing, versioned CDN publishing, npm publish, changelog automation, or embed package
  release work.
- New product behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-release-promotion/goal.md.`
