# T003 Worker Receipt

Status: complete

## Changes

- Extended `RequestThrottle` with `list_items` and `list_events` actions.
- Added `ITEM_READ_RATE_LIMIT` and `EVENTS_POLL_RATE_LIMIT` env knobs with closed-beta defaults in
  `wrangler.toml`.
- Applied read/event throttling to authenticated item-list and event-poll routes after board
  existence checks.
- Added focused tests proving allowed reads/events still work, over-limit requests return `429`, and
  read/event limits remain isolated from write/upvote limits.

## Proof

- `npm run test -- request-throttling routes` passed: 2 files, 18 tests.
- `npm run typecheck` passed.
- `rg -n "list_items|list_events|ITEM_READ_RATE_LIMIT|EVENTS_POLL_RATE_LIMIT|enforceRequestThrottle" src test wrangler.toml` proves the route calls and env knobs exist.

## Scope Check

No deploys, secret edits, npm publishing, status workflow, hosted control plane, comments, downvotes,
realtime, GitHub Projects, billing, or ops monitoring were added.
