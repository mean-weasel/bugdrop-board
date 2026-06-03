# BugDrop Board Widget Host

## Goal

Execute Conveyor Board 4 from `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`:
embedded widget UI/client and dummy host app only, using the completed Board 1 D1/auth, Board 2
GitHub mirror, and Board 3 voting/polling API foundations.

Original request:

`$goal-prep Build Conveyor Board 4 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md: embedded widget UI/client and dummy host app only, using the completed Board 1 D1/auth, Board 2 GitHub mirror, and Board 3 voting/polling API foundations.`

## Oracle

Playwright opens the dummy host app, mounts the embedded widget, creates an item with a
host-signed token, toggles an upvote, and observes a polling-driven update in a second browser
context.

Completion must prove:

- The widget can be embedded into a host page through a script/mount API rather than only working
  as a standalone page.
- The widget gets tokens from the host, calls the Board 2/3 APIs, renders items with status,
  issue metadata, upvote count, and viewer upvote state, creates items, toggles upvotes, and
  polls event cursors.
- The dummy host app mints host-signed board tokens and embeds the widget for local testing.
- E2E tests exercise create, upvote, and polling behavior with local services.
- `npm run validate`, `make check`, widget build, and the E2E command selected by the Worker pass.
- Final audit confirms no realtime/WebSocket/Durable Object transport, comments, downvotes,
  GitHub Projects, production hardening, or unrelated GitHub mirror behavior was added.

## Scope

In scope:

- Widget API client for Board 2/3 routes.
- Widget DOM rendering, styling, state management, and polling loop.
- Widget build output required for embedding.
- Dummy host app/token endpoint for local E2E.
- Playwright/E2E setup if the Judge confirms the repo/tooling shape.
- Minimal test-mode setup required to avoid live GitHub credentials during E2E.

Out of scope:

- Realtime transports, WebSockets, Durable Objects, Server-Sent Events, or push delivery.
- Comments, downvotes, GitHub Projects, issue reactions, status mutation workflows, production
  release hardening, billing, or public packaging polish beyond what this local E2E needs.
- Redesigning completed Board 1-3 APIs except for tiny compatibility fixes proven necessary by
  the widget/E2E slice.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-widget-host/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 4 embedded widget/dummy host/E2E slice, verify it, run review/final audit, and preserve
receipts in `state.yaml`.
