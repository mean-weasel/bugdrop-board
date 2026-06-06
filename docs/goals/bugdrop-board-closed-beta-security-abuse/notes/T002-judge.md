# T002 Judge Decision

Status: complete

Decision: proceed with the existing Worker split.

## Rationale

- T003 is the correct first write tranche because read/event throttles are the clearest code-level
  misuse gap and can reuse the established D1-backed throttle path.
- T004 can follow independently for token TTL and event payload privacy because it touches token
  verification, repository projection, and docs without needing deploy access.
- T005 can follow last because CORS negative smoke proof is a verifier/docs change and should be
  tested after the API privacy/throttle behavior is stable.

## Guardrails

- Do not change production secrets, run Cloudflare deploys, publish npm packages, or add hosted
  control plane behavior.
- Keep status workflow, comments, downvotes, realtime, GitHub Projects, billing, and ops monitoring
  out of this board.
- Require focused tests plus final `npm run validate` before completion.
