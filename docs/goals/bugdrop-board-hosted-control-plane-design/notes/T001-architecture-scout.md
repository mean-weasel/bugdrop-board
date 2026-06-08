# T001 Architecture Scout

## Current Implementation Evidence

- `migrations/0001_initial.sql` has `boards`, `board_items`, `board_votes`, and `board_events`
  scoped by `board_id`, but no tenant/app tables.
- `migrations/0002_request_throttle.sql` throttles by action, board id, and external user id.
- `src/routes/api-helpers.ts` uses global `ALLOWED_ORIGINS` and global HMAC token settings.
- `src/lib/board-token.ts` verifies HMAC tokens with `boardId`, `externalUserId`, `exp`, optional
  `aud`, and optional `iss`.
- `src/routes/api.ts` loads one board by route `boardId`, verifies a board token, applies throttles,
  and creates GitHub Issues before D1 item persistence.
- `src/lib/github.ts` creates issues with one access token supplied by `GITHUB_ISSUE_ACCESS_TOKEN`.
- `scripts/provision-board-core.js` provisions a board from one GitHub repo and creates a stable
  `board_owner_repo` id.

## Hosted Gaps

- No tenant or app entity exists.
- Origins, token verifier config, TTL, audience, issuer, throttles, and GitHub credential are
  Worker-global rather than per app or tenant.
- GitHub issue creation uses a shared access token path, acceptable for self-host but not real hosted
  tenants.
- Current board id isolation is useful but insufficient as a hosted SaaS trust boundary.
- Support/audit/export/delete are documented limitations rather than implemented control-plane
  surfaces.

## Spec Inputs

- Preserve the current HMAC and PAT paths for self-hosting.
- For hosted mode, add tenant/app/board config and denial-by-default lookups.
- Prefer JWKS/public-key token verification so BugDrop does not hold customer signing authority.
- Prefer GitHub App installation tokens over shared broad GitHub tokens.
