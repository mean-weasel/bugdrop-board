# Chrome Dogfood Audit - 2026-06-05

## Summary

Status: blocked before production mutation.

Codex Chrome Extension successfully opened two live dogfood viewer tabs for BugDrop Board, but both
tabs rendered the embedded board with `Failed to fetch`. The browser dogfood flow could not safely
continue to item creation, polling, upvote, or refresh-durability proof because the production Board
Worker omitted CORS allow-origin headers for the host origin `https://bugdrop.dev`.

Follow-up issue: `https://github.com/mean-weasel/bugdrop-board/issues/24`

## Targets

- Viewer A: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B: `https://bugdrop.dev/board-dogfood?viewer=b`
- Board script: `https://board.bugdrop.dev/board.js`
- Board Worker: `https://board.bugdrop.dev`
- Board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-production-dogfood`

## Preflight State

- Worktree: `## codex/chrome-dogfood-plan...origin/codex/chrome-dogfood-plan`
- Open PR: `https://github.com/mean-weasel/bugdrop-board/pull/23`
  - Merge state clean.
  - `Lint, Typecheck, Knip, Audit`: passed.
  - `Unit Tests & Build`: passed.
- Recent CI: latest ten workflow runs listed by `gh run list` were successful.
- Local package: `@mean-weasel/bugdrop-board@0.1.0`
- npm package: `@mean-weasel/bugdrop-board@0.1.0`, `latest` dist-tag `0.1.0`
- Previous production dogfood receipt: `docs/production-dogfood-results/2026-06-05.md`

## Live Surface Checks

- `curl -I -L --max-time 20 'https://bugdrop.dev/board-dogfood?viewer=a'`: `HTTP/2 200`
- `curl -I -L --max-time 20 'https://bugdrop.dev/board-dogfood?viewer=b'`: `HTTP/2 200`
- `curl -i -L --max-time 20 https://board.bugdrop.dev/health`: `HTTP/2 200` with production
  health JSON.
- `curl -I -L --max-time 20 https://board.bugdrop.dev/board.js`: `HTTP/2 200`,
  `content-type: text/javascript`.

## Chrome Proof

Codex Chrome Extension connected successfully. `browser.user.openTabs()` returned open tab metadata,
proving extension communication before dogfood tabs were created.

Both Chrome tabs loaded successfully:

- Viewer A URL: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer A title: `BugDrop Board Dogfood`
- Viewer A host shell text: `Signed in as dogfood viewer A.`
- Viewer B URL: `https://bugdrop.dev/board-dogfood?viewer=b`
- Viewer B title: `BugDrop Board Dogfood`
- Viewer B host shell text: `Signed in as dogfood viewer B.`

The host page embedded the expected script metadata:

- `src="https://board.bugdrop.dev/board.js"`
- `data-board-id="board_mean_weasel_bugdrop_board_production_dogfood"`
- `data-api-url="https://board.bugdrop.dev"`
- Viewer A `data-token-endpoint="/api/bugdrop-board-token?viewer=a"`
- Viewer B `data-token-endpoint="/api/bugdrop-board-token?viewer=b"`

Embedded board DOM text in both viewers included:

```text
Feedback
Idea title
Context
Submit
Failed to fetch
No feedback yet.
```

Chrome warning/error log summary before mutation: no warnings or errors were recorded for either
tab.

## API And CORS Cross-Check

Read-only CLI probe using a token minted by
`https://bugdrop.dev/api/bugdrop-board-token?viewer=a` returned:

- token endpoint: `HTTP 200`
- token present: yes
- token shape: `288.43`
- board items API: `HTTP 200`, existing production dogfood item returned
- board events API: `HTTP 200`, existing `item_created` and `upvote_added` events returned

The API responses prove D1 data, token minting, token verification, and event reads are alive.

The browser-facing CORS proof contradicted browser usability:

- `OPTIONS /boards/board_mean_weasel_bugdrop_board_production_dogfood/items` with
  `Origin: https://bugdrop.dev` returned `HTTP 204` without `Access-Control-Allow-Origin`.
- Authenticated CLI reads with `Origin: https://bugdrop.dev` returned board data, but the response
  header `Access-Control-Allow-Origin` was absent.
- `GET /items` with `Origin: https://bugdrop.dev` and an invalid bearer token returned `HTTP 401`
  without `Access-Control-Allow-Origin`, so error responses also omit the browser CORS header.

## Dogfood Item

Intended unique item title:

```text
Chrome dogfood item 20260605T143806Z
```

No item was created. The run stopped before mutation because the board UI could not load from the
browser.

## Oracle Mapping

- Codex Chrome Extension could open or claim Chrome tabs for Viewer A and Viewer B: passed.
- Viewer A and Viewer B loaded their dogfood URLs: passed.
- Both tabs rendered the embedded board from `https://board.bugdrop.dev/board.js`: partial; the
  board rendered but showed `Failed to fetch`.
- Viewer A created a uniquely titled item from visible UI: blocked.
- Corresponding GitHub Issue exists for the uniquely titled item: blocked.
- Viewer B saw the new item through polling without reload: blocked.
- A different viewer upvoted the item and both viewers showed one upvote: blocked.
- Refreshing both tabs preserved item, GitHub link, and upvote state: blocked.
- API/CLI cross-checks agree with browser observations: passed for the failure mode; API is healthy
  while browser CORS blocks the embedded UI.
- Defect found has a clear follow-up issue: passed, issue #24.

## Scope Audit

- No production board item was created.
- No upvote was attempted.
- No npm package was published.
- No hosted control plane, billing, realtime transport, comments, downvotes, or GitHub Projects
  behavior was added.
- No production credentials or secrets were rotated.
- No secret values, bearer tokens, cookies, local storage, profile data, or password data are
  recorded here.
- No destructive cleanup was performed.

## Rollback

No data rollback is required because this Chrome pass stopped before production mutation.

Operational recovery is to fix issue #24, redeploy the production Board Worker configuration/code as
appropriate, then rerun:

```text
/goal Follow docs/goals/bugdrop-board-chrome-dogfood-audit/goal.md.
```
