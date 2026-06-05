# T002 Worker Receipt

Timestamp: `2026-06-05T14:40:01Z`

Result: blocked before production mutation.

## Chrome Tabs

- Viewer A URL: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B URL: `https://bugdrop.dev/board-dogfood?viewer=b`
- Both tabs loaded with title `BugDrop Board Dogfood`.
- Both tabs rendered host shell text:
  - Viewer A: `Signed in as dogfood viewer A.`
  - Viewer B: `Signed in as dogfood viewer B.`
- Chrome warning/error logs before mutation: none recorded for either tab.

## Embedded Board DOM

Both viewers rendered the embedded board from `https://board.bugdrop.dev/board.js` with:

- heading `Feedback`
- fields `Idea title` and `Context`
- button `Submit`
- alert text `Failed to fetch`
- list text `No feedback yet.`

The host script metadata was present:

- `data-board-id="board_mean_weasel_bugdrop_board_production_dogfood"`
- `data-api-url="https://board.bugdrop.dev"`
- Viewer A token endpoint `/api/bugdrop-board-token?viewer=a`
- Viewer B token endpoint `/api/bugdrop-board-token?viewer=b`

## CORS Proof

Read-only CLI probe using a token minted by `https://bugdrop.dev/api/bugdrop-board-token?viewer=a`
returned:

- token endpoint: `HTTP 200`, token present, token shape `288.43`
- board items API: `HTTP 200`, existing production dogfood item returned
- events API: `HTTP 200`, existing `item_created` and `upvote_added` events returned
- `Access-Control-Allow-Origin`: absent on both board API read responses

Preflight proof:

- `OPTIONS https://board.bugdrop.dev/boards/board_mean_weasel_bugdrop_board_production_dogfood/items`
  with `Origin: https://bugdrop.dev` returned `HTTP 204` without
  `Access-Control-Allow-Origin`.

Invalid-token header-shape proof:

- `GET /items` with `Origin: https://bugdrop.dev` and an invalid bearer token returned `HTTP 401`
  without `Access-Control-Allow-Origin`.

## Decision

The browser-visible board cannot complete the dogfood create/poll/upvote flow while the production
Worker omits CORS allow-origin headers for `https://bugdrop.dev`. No Chrome UI item was created and
no upvote was attempted.

Proceed to `T004` to classify and file a concrete follow-up issue. `T003` is blocked because there
is no Chrome-created item to cross-check.
