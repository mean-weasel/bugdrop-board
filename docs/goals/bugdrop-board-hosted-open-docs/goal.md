# BugDrop Board Hosted/Open Security Docs

## Goal

Create succinct, user-facing documentation for teams that want to use the BugDrop-hosted/open
BugDrop Board service instead of self-hosting.

The docs must explain the current security promise, what the host app must provide, what settings
the user can configure, what BugDrop configures for them, and what remains future multi-tenant
hosted work.

## Oracle

A prospective hosted/open beta user can read one document and correctly answer:

- what BugDrop protects today;
- what their app must implement;
- which settings they configure in the embed and token endpoint;
- which settings BugDrop configures for the hosted Worker;
- which security controls exist today;
- which hosted control-plane guarantees do not exist yet.

Completion must prove:

- A new hosted/open setup doc exists and is linked from the README.
- The doc distinguishes self-hosted, hosted/open beta, and future multi-tenant hosted mode.
- The doc lists exact current security controls: signed host tokens, board-scoped tokens, TTL,
  origin allowlist, one vote per user per idea, per-user/per-board throttling, GitHub mirroring,
  backend-only signing secret, and event privacy.
- The doc lists user-configurable embed/customization settings succinctly.
- The doc states current limitations without promising a hosted control plane, billing, realtime,
  comments, downvotes, GitHub Projects, or tenant-admin UI.
- Verification includes a contradiction scan for overpromising hosted-control-plane language.

## Scope

In scope:

- Add `docs/hosted-security-and-setup.md`.
- Update `README.md` with a short hosted/open section or link.
- Optionally update existing closed-beta docs only to remove contradictions or add cross-links.
- Record the follow-on conveyor from hosted docs to hosted control-plane design and implementation.

Out of scope:

- Runtime code changes.
- D1 migrations or hosted data model changes.
- Cloudflare deploys, credential changes, secret rotation, or GitHub token changes.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, status workflow,
  analytics, monitoring, backup/export/restore implementation, or package publishing.

## Constraints

- Be explicit that the current hosted/open path is not yet broad multi-tenant hosted SaaS.
- Do not weaken the self-hosting docs or imply self-hosters need the hosted service.
- Keep the document short enough for an installer to scan quickly.
- Treat CORS as browser containment only; bearer token verification remains the authorization
  boundary.
- Do not include secret values or instructions that put secrets in browser code.

## Follow-On Conveyor Notes

After this board:

1. Run `bugdrop-board-hosted-control-plane-design` to write the design spec for true multi-tenant
   hosted mode.
2. Prepare Hosted Control Plane MVP Scaffold only after the design spec is approved.
3. Prepare GitHub App Integration only after tenant/app/board boundaries are settled.
4. Prepare Hosted Onboarding UX/API only after the backend control-plane scaffold exists.
5. Prepare Hosted Beta Security Gate only after hosted runtime behavior exists.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-open-docs/goal.md.`
