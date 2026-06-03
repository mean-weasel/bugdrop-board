# BugDrop Board Request Throttling

## Goal

Execute Conveyor Board 8: self-host production hardening for request throttling and misuse controls
only, using completed Board 1-7 foundations and excluding hosted control plane, billing, realtime,
comments, downvotes, GitHub Projects, release automation, and package publishing.

Original request:

`$goal-prep Build Conveyor Board 8: self-host production hardening for request throttling and misuse controls only, using completed Board 1-7 foundations and excluding hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, release automation, and package publishing.`

## Oracle

A self-hoster has bounded, documented, and tested misuse controls for the existing embedded board
APIs without adding hosted infrastructure or new product surfaces.

Completion must prove:

- The Worker enforces focused request throttling or equivalent misuse controls for the highest-risk
  existing write paths: item creation and upvote toggling.
- The controls work for host-signed authenticated users and one-board-per-app deployments without a
  hosted control plane.
- Tests prove allowed traffic still works, over-limit or abusive traffic is rejected, and independent
  users/boards are not incorrectly blocked.
- Misuse-control configuration is documented for self-hosters with safe defaults and local override
  guidance when needed.
- Existing Board 1-7 behavior still passes: D1/auth, GitHub mirror, upvotes/polling, embedded
  widget, self-host docs/config, board provisioning, and production deploy readiness.
- Final audit confirms no hosted control plane, billing, realtime transport, comments, downvotes,
  GitHub Projects, release automation, package publishing, or broad product expansion was added.

## Scope

In scope:

- Scout/Judge decision on the smallest safe request throttling/misuse-control package.
- Focused Worker-side controls for existing write routes, especially item creation and upvote
  toggling.
- D1-backed, in-memory, or Cloudflare-native approaches only if Scout/Judge prove the choice fits
  self-hosting and the current Worker stack.
- Tests and docs needed to prove the controls and explain self-host configuration.
- Validation gates that can run without production Cloudflare or GitHub credentials.

Out of scope:

- Hosted control plane, tenant management, billing, account onboarding, release automation, or
  package publishing.
- Realtime/WebSocket/Durable Object/SSE transport.
- Comments, downvotes, GitHub Projects, status workflow expansion, or new voting semantics.
- Broad production hardening beyond request throttling and misuse controls.
- Changing the GitHub mirroring model unless Scout/Judge prove a tiny compatibility fix is required
  for throttled create-item behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-request-throttling/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 8 request throttling/misuse-controls slice, verify it, run the review/final audit, and
preserve receipts in `state.yaml`.
