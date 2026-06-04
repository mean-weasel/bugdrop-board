# BugDrop Board Package Publishing

## Goal

Execute Conveyor Board 11: package/version publishing flow for the embed script only, using
completed Board 1-10 foundations and excluding hosted control plane, billing, realtime, comments,
downvotes, GitHub Projects, and new product behavior.

## Oracle

A self-hoster or maintainer can version and dry-run the embed-script npm package locally, and can
manually dispatch a GitHub Actions workflow that runs the current validation gates, verifies the
package contents, and publishes only when explicitly requested with an npm token.

Completion must prove:

- The widget build derives its default version from `package.json`, with `VERSION` still available
  as an explicit override.
- Local `npm run pack:check` and `make pack-check` dry-run package contents and rebuild the widget
  through npm lifecycle hooks.
- A manual GitHub Actions package workflow exists, uses Node 22 and Node-24-ready core actions,
  dry-runs by default, and only publishes with `dry_run=false` plus `NPM_TOKEN`.
- README explains local versioning, package dry-runs, workflow inputs, required secret, package
  contents, and self-host boundaries.
- Existing Board 1-10 behavior still passes through the standard gates that do not require
  production credentials.
- Final audit confirms no hosted control plane, billing, realtime, comments, downvotes, GitHub
  Projects, or new product behavior was added.

## Scope

In scope:

- npm package lifecycle and pack-check scripts.
- `.github/workflows/` package workflow.
- README package/version publishing docs.
- GoalBuddy receipts for Board 11.

Out of scope:

- Hosted control plane, billing, tenant onboarding, managed CDN release orchestration, or release
  automation beyond the package workflow.
- Realtime/WebSocket/Durable Object/SSE transport.
- Comments, downvotes, GitHub Projects, status workflows, or new voting semantics.
- New product behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-package-publishing/goal.md.`
