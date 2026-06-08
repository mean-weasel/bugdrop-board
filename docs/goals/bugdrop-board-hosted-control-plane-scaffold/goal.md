# BugDrop Board Hosted Control Plane Board 3: MVP Scaffold

## Goal

Implement the smallest hosted control-plane scaffold from the approved design spec.

This board adds tenant/app/board configuration foundations, per-app origin allowlist lookup, token
verifier config interfaces, and isolation tests. It must preserve the current self-host behavior.

## Oracle

Board 3 is complete only when:

- D1 migrations define hosted tenant, app, app origin, token verifier, board config, GitHub
  connection placeholder, and audit-event foundations.
- A repository layer can create/read hosted tenant/app/board config and active app origins.
- Embedded board API CORS uses per-app exact origins when a board has hosted config.
- Boards without hosted config keep the current self-host/global `ALLOWED_ORIGINS` behavior.
- Hosted token verifier config supports `jwks` and uploaded `public_key` metadata, with `jwks` as
  the preferred hosted default.
- `hmac_legacy` is explicitly documented/testable as self-host or migration-only, not the hosted
  default.
- Tests prove cross-tenant/board origin isolation and self-host fallback.
- Verification proves no GitHub App integration, onboarding UX, billing, realtime, comments,
  downvotes, GitHub Projects, deploys, credentials, or package publishing were added.

## Scope

In scope:

- One migration for hosted control-plane scaffold tables.
- Hosted config repository/types.
- Per-app origin allowlist lookup for board routes and preflight requests.
- Token verifier config interfaces and fail-closed unsupported hosted verifier behavior.
- Focused tests for repository behavior, hosted origin isolation, and self-host fallback.
- GoalBuddy receipts and proof.

Out of scope:

- Full JWKS fetch/cache/signature verification.
- Public-key JWT verification.
- GitHub App installation-token generation or issue creation.
- Hosted onboarding UX/API.
- Billing, realtime, comments, downvotes, GitHub Projects, status workflow, deploys, credentials,
  package publishing, or production data migration.

## Constraints

- Self-host mode must keep the existing global HMAC token and PAT issue creator behavior.
- Hosted production must be denial-by-default: origin mismatch, tenant mismatch, app mismatch, board
  mismatch, and unsupported verifier mismatch fail closed.
- Self-hosters do not provide keys to BugDrop. Token verifier config exists only for BugDrop-hosted
  installs.
- Do not edit `wrangler.toml`, package versions, GitHub workflows, public assets, or deployment
  credentials.

## Approved Decisions

- Hosted MVP supports both JWKS URLs and uploaded public keys as config metadata.
- JWKS is the preferred hosted default.
- Uploaded public key is a beta-friendly fallback.
- HMAC remains the current self-host path and, if represented in hosted config, is marked
  `hmac_legacy` for migration-only use.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-control-plane-scaffold/goal.md.`
