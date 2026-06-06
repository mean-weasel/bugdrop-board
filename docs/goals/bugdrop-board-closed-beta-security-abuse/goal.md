# BugDrop Board Closed Beta Security And Abuse Hardening

## Goal

Harden BugDrop Board for closed beta against realistic misuse of the embedded Worker surface while
preserving the current product shape.

## Oracle

Closed-beta board APIs and install guidance are materially harder to misuse: authenticated reads and
polling cannot be hammered without a throttle or equivalent control, board tokens cannot be
overlong without rejection or explicit bounded guidance, event payloads do not expose stable user
ids to other viewers, and deployed-smoke proof catches a disallowed CORS origin.

Completion must prove:

- Read and events endpoints have bounded misuse controls, with focused tests for allowed and
  over-limit behavior.
- Board token expiry has a closed-beta max-TTL policy, enforced in code or made explicit by an
  accepted no-code security decision, with negative tests if enforcement is implemented.
- Event payloads returned to board viewers avoid leaking stable `externalUserId` values.
- CORS smoke verification includes a negative/disallowed-origin proof path.
- Security docs or README guidance describe the remaining closed-beta abuse boundaries and
  operator expectations.
- Standard verification plus focused security tests pass.

## Scope

In scope:

- Worker API misuse controls for authenticated read/list and polling/event routes.
- Token max-TTL guidance or enforcement, with tests where code changes are made.
- Event payload privacy cleanup for data returned to viewers.
- Deployed smoke helper/test updates for disallowed CORS origin proof.
- Focused docs for closed-beta security and abuse expectations.
- GoalBuddy receipts and final audit.

Out of scope:

- Setup-safety docs already handled in Closed Beta Board 1.
- Status workflow, status editing, or GitHub label sync.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects.
- npm publishing, Cloudflare deploys, credential changes, secret rotation, or editing secret files.
- Ops monitoring, alerting, incident response, backup/export/restore implementation.
- Broad product redesign or UX polish beyond text needed to expose security errors clearly.

## Constraints

- Preserve the embedded, host-authenticated, one-board-per-app product shape.
- Do not weaken existing auth, CORS, GitHub mirror, D1 isolation, or upvote uniqueness behavior.
- Prefer the smallest meaningful security controls that can be proven with tests.
- Treat CORS as browser containment, not as authentication.
- Do not rely on optimistic docs when a realistic misuse case needs code-level proof.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-closed-beta-security-abuse/goal.md.`
