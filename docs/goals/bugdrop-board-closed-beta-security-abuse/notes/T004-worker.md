# T004 Worker Receipt

Status: complete

## Changes

- Added an enforced board-token max TTL, defaulting to `300` seconds.
- Added `BOARD_TOKEN_MAX_TTL_SECONDS` as a non-secret Worker var in every Wrangler environment.
- Passed the configured max TTL into route token verification.
- Stopped writing stable `externalUserId` values into new upvote event payloads.
- Scrubbed `externalUserId` from event payloads on read so legacy D1 rows do not leak stable host
  user ids to other viewers.
- Updated README and closed-beta setup guidance for token TTL, read/event throttles, and event
  privacy.

## Proof

- `npm run test -- board-token board-repository routes` passed: 3 files, 33 tests.
- `npm run typecheck` passed.
- `rg -n "JSON\\.stringify\\(\\{ itemId, externalUserId|payload: \\{ itemId: item\\.id, externalUserId" src test || true` returned no matches.

## Scope Check

No deploys, secret edits, npm publishing, hosted control plane, status workflow, comments, downvotes,
realtime, GitHub Projects, billing, or ops monitoring were added.
