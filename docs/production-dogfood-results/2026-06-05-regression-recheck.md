# Production Dogfood Regression Recheck

Date: 2026-06-05

Status: passed.

## Targets

- Host app: `https://bugdrop.dev/board-dogfood`
- Board Worker: `https://board.bugdrop.dev`
- Board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Dogfood repo: `mean-weasel/bugdrop-board-production-dogfood`

## Worker And CORS Smoke

Command:

```bash
npm run deploy:smoke -- \
  --url https://board.bugdrop.dev \
  --expect-environment production \
  --cors-origin https://bugdrop.dev \
  --cors-board-id board_mean_weasel_bugdrop_board_production_dogfood \
  --cors-token-endpoint "https://bugdrop.dev/api/bugdrop-board-token?viewer=a"
```

Result: passed.

- `/health`: `status: ok`, `environment: production`
- `/board.js`: `200`, `content-type: text/javascript`, `cf-cache-status: HIT`
- Browser CORS:
  - preflight: `204`, `Access-Control-Allow-Origin: https://bugdrop.dev`
  - `/items`: `200`, `Access-Control-Allow-Origin: https://bugdrop.dev`
  - `/events`: `200`, `Access-Control-Allow-Origin: https://bugdrop.dev`

No token values were printed. The deploy smoke output recorded only token shape metadata.

## Browser Proof

Automated two-viewer Playwright dogfood:

- Viewer A: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B: `https://bugdrop.dev/board-dogfood?viewer=b`
- Created title: `Regression dogfood item 20260606T001457Z`
- Created description: `Autonomous conveyor regression check after install-smoke workflow handoff.`

Observed results:

- Viewer A created the item through the embedded board UI.
- Viewer A saw GitHub link `Issue #5`.
- Viewer B saw the item through polling.
- Viewer B upvoted the item and saw `Upvoted 1`.
- Viewer A saw `Upvote 1` after polling.
- Refreshing both viewers preserved the item, issue link, and viewer-specific upvote state.
- Browser console errors: none.
- Failed browser requests: only `POST https://bugdrop.dev/cdn-cgi/rum? net::ERR_ABORTED` from
  Cloudflare RUM beacons for each viewer; no board API requests failed.

## GitHub Proof

Command:

```bash
gh issue view 5 --repo mean-weasel/bugdrop-board-production-dogfood --json number,title,state,url,createdAt,body
```

Result:

- Issue: <https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/5>
- State: `OPEN`
- Title: `Regression dogfood item 20260606T001457Z`
- Created: `2026-06-06T00:14:58Z`
- Body includes board item id `item_5ed09b77053bb5f252410790`.

## API And Event Proof

Authenticated API readback used tokens from
`https://bugdrop.dev/api/bugdrop-board-token?viewer=a` and `?viewer=b` without printing token
values.

Viewer A readback:

- `id`: `item_5ed09b77053bb5f252410790`
- `upvoteCount`: `1`
- `viewerHasUpvoted`: `false`
- `githubIssueNumber`: `5`
- `githubIssueUrl`: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/5`

Viewer B readback:

- same `id`
- `upvoteCount`: `1`
- `viewerHasUpvoted`: `true`
- `githubIssueNumber`: `5`
- `githubIssueUrl`: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/5`

Events:

- `item_created`, event id `9`
- `upvote_added`, event id `10`

## Scope Audit

This recheck created one dogfood item and one upvote in the existing production dogfood board. It
did not publish a package, bump a package version, deploy Cloudflare Worker changes, rotate or
inspect secrets, add hosted control plane behavior, add billing, add realtime transport, add
comments, add downvotes, add GitHub Projects, destructively clean dogfood data, or change runtime
product behavior.

## Next

Proceed to final conveyor closeout: confirm clean `main`, open PR/issue state, latest workflow
state, and whether any documented next actions remain.
