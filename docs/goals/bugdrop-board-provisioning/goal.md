# BugDrop Board Provisioning

## Goal

Execute Conveyor Board 6: durable board provisioning/config flow only, using the completed Board
1-5 foundations and excluding production hardening, billing, realtime, comments, downvotes, and
GitHub Projects.

Original request:

`$goal-prep Build Conveyor Board 6 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md: durable board provisioning/config flow only, using completed Board 1-5 foundations and excluding production hardening, billing, realtime, comments, downvotes, and GitHub Projects.`

## Oracle

A self-hoster or local operator can create/configure a durable board for one app/repo without using
the E2E-only reset route, then embed the widget against that board and prove the existing create,
GitHub mirror, upvote, and polling smoke still works.

Completion must prove:

- The chosen provisioning/config flow creates or upserts one durable board per app/repo with a
  stable board id.
- The flow is documented and executable locally without real hosted-control-plane assumptions.
- The E2E-only `__e2e/reset` route remains test-only and is not the documented operator path.
- The widget embed instructions can point at a provisioned board id from the new flow.
- Existing Board 1-5 behavior still passes: D1/auth, GitHub issue mirroring, upvotes/polling,
  embedded widget, and self-host docs/config.
- Final audit confirms no production hardening, billing, realtime transport, comments, downvotes,
  GitHub Projects, hosted control plane, or broad release work was added.

## Scope

In scope:

- Scout/Judge decision on the smallest durable provisioning surface that fits the current stack.
- A local operator provisioning/config flow for creating/upserting boards.
- Focused tests or E2E setup proving a non-`__e2e/reset` board can be used.
- README/docs updates needed to replace the Board 5 handoff gap with the new operator path.
- Minimal config/script changes needed to run the provisioning flow locally.

Out of scope:

- Hosted tenant management, billing, account onboarding, release automation, or control-plane UI.
- Production hardening itself, including rate limits, abuse controls, secret rotation, deployment
  launch flow, or operational dashboards.
- Realtime/WebSocket/Durable Object/SSE transport.
- Comments, downvotes, GitHub Projects, status workflows, or new vote semantics.
- Reworking the completed Board 1-5 foundations unless Scout/Judge prove a tiny compatibility fix
  is required for provisioning.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-provisioning/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 6 durable provisioning/config-flow slice, verify it, run the review/final audit, and preserve
receipts in `state.yaml`.
