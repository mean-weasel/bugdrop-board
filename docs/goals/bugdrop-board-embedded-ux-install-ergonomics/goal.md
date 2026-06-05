# BugDrop Board Embedded UX And Install Ergonomics

## Goal

Improve the embedded BugDrop Board widget's loading, empty, error, and accessibility states, then
tighten the host styling hooks and install documentation without changing the existing API, auth,
GitHub mirroring, package publishing, or production deployment behavior.

## Oracle

This goal is complete only when all of the following are true:

- The widget exposes clear, visible loading, empty, and error states in the embedded host page.
- Error states include a retry path for failed initial load or polling refresh without requiring a
  host page reload.
- The widget has stronger accessibility semantics for status updates and voting controls, including
  appropriate `aria-live`, `aria-busy`, and `aria-pressed` coverage where applicable.
- Host styling hooks are documented and implemented conservatively, preserving `data-color` while
  allowing self-hosters to customize common colors without piercing the widget's Shadow DOM.
- README/install docs clearly cover npm/package entrypoints, script embed, Worker URL, board id,
  signed token endpoint, polling interval, accent/styling hooks, and self-host verification.
- Existing D1/auth, GitHub Issue mirroring, upvotes, polling, dummy host app, release workflow, and
  package publishing behavior are preserved.
- Verification includes focused widget/DOM tests, Playwright dummy-host proof, widget build,
  validation gates, and a scope audit proving no hosted control plane, billing, realtime transport,
  comments, downvotes, GitHub Projects, package publish, or new version bump was added.

## Scope

In scope:

- `src/widget/` loading, empty, error, accessibility, and styling-hook behavior.
- Focused widget/DOM tests.
- Existing Playwright dummy-host proof updates.
- README install and styling-hook documentation.
- GoalBuddy receipts for this tranche.

Out of scope:

- Worker API, auth, D1 schema, GitHub Issue mirroring, production deploy, release workflow, package
  publishing, version bumps, hosted control plane, billing, realtime/WebSocket/Durable Object
  transport, comments, downvotes, GitHub Projects, and unrelated product behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-embedded-ux-install-ergonomics/goal.md.`
