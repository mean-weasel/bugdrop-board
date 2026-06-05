# T002 Worker Receipt

Timestamp: `2026-06-05T14:54:00Z`

Result: done after production CORS redeploy.

## Initial Blocker

The first Chrome pass loaded both viewer tabs but the embedded board showed `Failed to fetch`.
Issue #24 was filed for missing browser CORS headers from `https://board.bugdrop.dev` to
`https://bugdrop.dev`.

## Fix Applied Before Rerun

Production deploy run `https://github.com/mean-weasel/bugdrop-board/actions/runs/27021970255`
redeployed the Worker using the current production config. Post-deploy preflight and authenticated
reads returned `Access-Control-Allow-Origin: https://bugdrop.dev`.

## Chrome Rerun Proof

- Viewer A URL: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B URL: `https://bugdrop.dev/board-dogfood?viewer=b`
- Unique item title: `Chrome dogfood item 20260605T145224Z`
- Viewer A created the item through the visible embedded UI form.
- Viewer A rendered `Issue #2` and `Upvote 0` for the created item.
- Viewer B saw the item without manual reload, within the 15 second polling window.
- Viewer B clicked the visible upvote button and rendered `Upvoted 1`.
- Viewer A observed the updated count as `Upvote 1` without manual reload.
- After refreshing both tabs:
  - Viewer A still rendered `Issue #2` and `Upvote 1`.
  - Viewer B still rendered `Issue #2` and `Upvoted 1`.
- Chrome warning/error logs were empty at initial load, after create, after polling, after upvote,
  and after refresh.
