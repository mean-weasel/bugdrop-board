# T001 Security Scout

Status: complete

## Evidence

- `src/lib/request-throttle.ts` only defines `create_item` and `toggle_upvote`, with defaults
  `ITEM_CREATE_RATE_LIMIT=5`, `UPVOTE_RATE_LIMIT=60`, and a shared
  `REQUEST_THROTTLE_WINDOW_SECONDS=60`.
- `src/routes/api.ts` calls `enforceWriteThrottle` for item creation and upvote toggles, but
  `GET /boards/:boardId/items` and `GET /boards/:boardId/events` perform authenticated DB reads
  without a throttle.
- `src/lib/board-token.ts` rejects expired, wrong-board, wrong-audience, wrong-issuer, missing-user,
  and bad-signature tokens, but has no maximum future `exp` check.
- `src/lib/board-repository.ts` stores `externalUserId` in upvote event payload JSON for
  `upvote_added` and `upvote_removed`. `GET /boards/:boardId/events` returns those payloads to any
  authenticated viewer of the same board.
- `scripts/verify-deployed-worker.js` proves allowed-origin CORS for preflight, items, and events
  when `--cors-*` flags are present. It has no disallowed-origin negative path.
- Existing tests cover write throttles in `test/request-throttling.test.ts`, token verification in
  `test/board-token.test.ts`, route read/events behavior in `test/routes.test.ts`, and positive CORS
  smoke in `test/verify-deployed-worker.test.ts`.
- `README.md` and `docs/closed-beta-setup.md` recommend short-lived tokens and describe write
  throttling, but they do not yet describe read/event throttles, enforced max TTL, event payload
  privacy, or negative CORS smoke proof.

## Smallest Safe Plan

1. Extend the existing D1 throttle action set with `list_items` and `list_events`, using separate
   env-configurable limits and the existing window key shape so board/user isolation is preserved.
2. Reuse the existing 429 JSON response helper semantics for read/event throttles, then add focused
   tests for allowed reads/events and over-limit responses.
3. Enforce a closed-beta max board token TTL in `verifyBoardToken`, defaulting to a short bounded
   value while allowing an explicit Worker env override.
4. Stop serializing stable `externalUserId` values into viewer event payloads. Existing D1 rows can
   remain as historical storage; route/repository output must not expose the stable id.
5. Add deploy-smoke flags/env vars for a disallowed CORS origin and assert that preflight/read/event
   responses do not return that origin as `Access-Control-Allow-Origin`.
6. Update closed-beta docs and README only for Board 2 boundaries, avoiding Board 1 setup redo.

## Scope Check

This plan needs no npm publish, Cloudflare deploy, credential changes, hosted control plane, billing,
realtime, comments, downvotes, GitHub Projects, status workflow, or ops monitoring implementation.
