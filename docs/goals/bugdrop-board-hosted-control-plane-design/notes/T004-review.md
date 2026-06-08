# T004 Design Review

## Decision

Approved with no blocking edits.

## Review Checks

- The spec is design-only and does not claim hosted control-plane behavior exists.
- It recommends JWKS/public-key verification for hosted mode while preserving self-host HMAC.
- It rejects a shared broad GitHub token for hosted tenants and recommends GitHub App installations.
- It defines measurable Boards 3-6 acceptance criteria.
- It keeps billing, realtime, comments, downvotes, GitHub Projects, and public tenant-admin UI out of
  MVP scope.

## Carry Forward

Before Board 3, decide whether hosted MVP supports JWKS URLs only, uploaded public keys only, or
both.
