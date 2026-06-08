# BugDrop Board Hosted Control Plane Board 4: Token Verifier Implementation

## Goal

Implement hosted token verification for the Board 3 hosted config scaffold.

Hosted mode should verify JWT-style RS256 tokens signed by a host app private key using either a
JWKS URL or uploaded public key metadata. Self-host HMAC behavior must remain unchanged.

## Oracle

Board 4 is complete only when:

- Hosted `jwks` verifier config validates RS256 tokens using a matching JWKS key.
- Hosted `public_key` verifier config validates RS256 tokens using uploaded SPKI PEM.
- Hosted tokens enforce issuer, audience, board id, tenant id, app id, stable user id, expiry, and
  max TTL.
- JWKS key selection supports `kid` and fails closed when the key is missing.
- Hosted verifier failures return the existing invalid-token boundary without leaking verifier
  internals.
- Self-host/global HMAC route tests still pass.
- Verification proves no GitHub App integration, onboarding UX, billing, realtime, comments,
  downvotes, GitHub Projects, deploys, credentials, package publishing, or package dependency changes
  were added.

## Scope

In scope:

- Hosted token verifier module.
- RS256 JWT/JWS parsing and verification through WebCrypto.
- JWKS URL fetch and key selection.
- Uploaded public key PEM import.
- Route integration for hosted `jwks` and `public_key` verifiers.
- Focused unit and route tests.
- GoalBuddy receipts and proof.

Out of scope:

- New npm dependencies.
- GitHub App installation-token generation or issue creation.
- Hosted onboarding UX/API.
- Billing, realtime, comments, downvotes, GitHub Projects, deploys, credentials, package publishing,
  or production data migration.
- Full JWKS caching, background refresh, or replay-cache implementation.

## Constraints

- Use platform WebCrypto; do not add a JWT dependency in this board.
- Preserve self-host HMAC behavior and the existing `BOARD_TOKEN_SECRET` route path.
- Hosted `hmac_legacy` remains explicitly configured migration support only.
- Fail closed on malformed JWT, unsupported algorithms, missing key, invalid signature, wrong
  issuer/audience/tenant/app/board, missing user id, expired token, or excessive TTL.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-token-verifier/goal.md.`
