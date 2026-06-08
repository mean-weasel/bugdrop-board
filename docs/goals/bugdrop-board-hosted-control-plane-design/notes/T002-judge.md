# T002 Judge Decision

## Decision

Approve a hosted design that keeps self-hosting unchanged but makes real hosted mode tenant/app/board
aware.

## Token Model Comparison

- Shared HMAC secret: already works, but BugDrop and customer both hold signing authority. Keep for
  self-hosting and explicit migration/beta exceptions.
- JWKS/public key: stronger hosted default because BugDrop verifies customer identity without
  possessing customer signing secrets. Recommend for hosted MVP.
- BugDrop-managed identity: too much product and privacy scope for embedded-first MVP. Reject.

## GitHub Model Comparison

- Per-tenant PAT: narrower than a shared global token but still operationally fragile and harder to
  rotate safely.
- GitHub App installation: best hosted default because repo access is install-scoped, revocable, and
  auditable. Recommend for hosted MVP.

## Approved Spec Direction

Write the spec around per-app JWKS/public-key verification, per-board GitHub App installation/repo
mapping, tenant/app/board D1 config, exact per-app origins, redacted audit events, and Boards 3-6 as
the implementation conveyor.
