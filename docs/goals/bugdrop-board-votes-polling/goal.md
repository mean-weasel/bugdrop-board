# BugDrop Board Votes And Polling

## Goal

Execute Conveyor Board 3 from `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`:
voting plus board/read and polling/event APIs only, using the completed Board 1 D1/auth
foundation and completed Board 2 create-item GitHub mirror foundation.

Original request:

`$goal-prep Build Conveyor Board 3 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md: voting and polling/event read APIs only, using the completed Board 1 D1/auth foundation and Board 2 create-item GitHub mirror foundation.`

## Oracle

Two simulated authenticated viewers can use Worker APIs against local D1:

- Viewer A can load the board items for one app board and see the current item status,
  issue metadata, upvote count, and their own `viewerHasUpvoted` state.
- Viewer A can toggle an upvote on an existing item with a host-signed board token.
- The item response reflects the acting viewer immediately, including upvote count and
  `viewerHasUpvoted`.
- Viewer B can poll events with a cursor and receive the ordered deltas after the cursor,
  including upvote events written by Viewer A.
- Cross-board reads and writes do not leak items, votes, or events.
- `npm run validate` and `make check` pass.
- Final audit confirms no widget UI, dummy host app, Playwright/E2E, realtime/WebSocket,
  comments, downvotes, GitHub Projects, screenshot, annotation, or GitHub mirroring changes
  were added in this board.

## Scope

In scope:

- Board read route for current items.
- Upvote toggle route for signed users.
- Event polling route with cursor semantics.
- Route/repository test coverage required to prove the oracle.
- Minimal repository/type changes only if required to return viewer-specific upvote state or
  stable board read shapes.

Out of scope:

- Widget UI, widget API client, or embedded host integration.
- Dummy host app.
- Playwright or E2E tests.
- Realtime, WebSockets, Durable Objects, Server-Sent Events, or push transport.
- Comments, downvotes, GitHub Projects, issue reactions, status mutation workflows, screenshots,
  annotations, or html-to-image capture.
- New GitHub issue creation behavior beyond preserving Board 2 metadata in item reads.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-votes-polling/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 3 API slice, verify it, run review/final audit, and preserve receipts in `state.yaml`.
