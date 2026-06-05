# Chrome Dogfood Audit - 2026-06-05

## Summary

Status: passed after production redeploy.

Codex Chrome Extension dogfooding initially exposed a real production browser CORS blocker: both
viewer tabs rendered the embedded board from `https://board.bugdrop.dev/board.js` but showed
`Failed to fetch`. Production deploy run
`https://github.com/mean-weasel/bugdrop-board/actions/runs/27021970255` redeployed the current
production Wrangler config, including `ALLOWED_ORIGINS = "https://bugdrop.dev,https://board.bugdrop.dev"`.

After the redeploy, the same two-viewer Chrome dogfood flow passed end to end: Viewer A created a
new item through the visible embedded UI, GitHub Issue mirroring created issue #2, Viewer B saw the
item without reload, Viewer B upvoted it, Viewer A observed the updated count, both viewers
survived refresh with correct viewer-specific state, and API/GitHub/event cross-checks agreed.

Resolved blocker issue: `https://github.com/mean-weasel/bugdrop-board/issues/24`

## Targets

- Viewer A: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B: `https://bugdrop.dev/board-dogfood?viewer=b`
- Board script: `https://board.bugdrop.dev/board.js`
- Board Worker: `https://board.bugdrop.dev`
- Board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-production-dogfood`

## Preflight State

- Worktree before rerun: `## codex/chrome-dogfood-plan...origin/codex/chrome-dogfood-plan`
- PR: `https://github.com/mean-weasel/bugdrop-board/pull/23`
- Local package: `@mean-weasel/bugdrop-board@0.1.0`
- npm package: `@mean-weasel/bugdrop-board@0.1.0`, `latest` dist-tag `0.1.0`
- Previous production dogfood receipt: `docs/production-dogfood-results/2026-06-05.md`

## Initial Browser Blocker

Before the redeploy, both Chrome viewer tabs loaded their host pages and rendered the embedded board
surface, but the Shadow DOM included:

```text
Feedback
Idea title
Context
Submit
Failed to fetch
No feedback yet.
```

Read-only CLI proof showed the backing API was alive but missing browser CORS headers:

- Host token endpoint returned `HTTP 200` and a token shape of `288.43`.
- Board item and event APIs returned existing data through CLI.
- `OPTIONS /boards/board_mean_weasel_bugdrop_board_production_dogfood/items` with
  `Origin: https://bugdrop.dev` returned `HTTP 204` without `Access-Control-Allow-Origin`.
- Authenticated `/items` and `/events` reads with `Origin: https://bugdrop.dev` returned data but
  omitted `Access-Control-Allow-Origin`.

Follow-up issue #24 was filed, then later closed after the redeploy and rerun proof.

## Production Redeploy

Local dry-run before dispatch:

```text
npm run build:widget && npx wrangler deploy --dry-run --env production
```

The dry-run passed and showed:

- `env.DB (bugdrop-board-production)`
- `env.ENVIRONMENT ("production")`
- `env.ALLOWED_ORIGINS ("https://bugdrop.dev,https://board.bug...")`
- `env.BOARD_TOKEN_AUDIENCE ("bugdrop-board")`
- `env.BOARD_TOKEN_ISSUER ("bugdrop-board-production-host")`

Deploy workflow:

- Run URL: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27021970255`
- Branch: `codex/chrome-dogfood-plan`
- Conclusion: success
- Steps completed: validation gates, widget build, dry-run deploy package, remote D1 migrations,
  board provisioning, Worker deploy, deployed Worker smoke.

Post-deploy CORS proof:

- `OPTIONS /boards/board_mean_weasel_bugdrop_board_production_dogfood/items` with
  `Origin: https://bugdrop.dev` returned `HTTP 204` with
  `Access-Control-Allow-Origin: https://bugdrop.dev`.
- Authenticated `/items` read with `Origin: https://bugdrop.dev` returned `HTTP 200` with
  `Access-Control-Allow-Origin: https://bugdrop.dev`.
- Authenticated `/events` read with `Origin: https://bugdrop.dev` returned `HTTP 200` with
  `Access-Control-Allow-Origin: https://bugdrop.dev`.

## Chrome Rerun

Unique item title:

```text
Chrome dogfood item 20260605T145224Z
```

Description:

```text
Created by Codex Chrome dogfood after production CORS redeploy run 27021970255.
```

Initial Chrome state after redeploy:

- Viewer A loaded `https://bugdrop.dev/board-dogfood?viewer=a`.
- Viewer B loaded `https://bugdrop.dev/board-dogfood?viewer=b`.
- Both tabs rendered existing issue #1 without `Failed to fetch`.
- Both tabs had no warning/error logs before mutation.

Viewer A create proof:

- Item was created through the visible embedded UI form.
- Viewer A rendered the new item with button `Upvote 0`.
- Viewer A rendered GitHub link `Issue #2`.
- Chrome warning/error logs after create: none.

Viewer B polling proof:

- Viewer B was not manually reloaded before the polling check.
- Viewer B rendered the new item with `Issue #2`.
- The poll check found the item within the 15 second acceptance window.
- Chrome warning/error logs after polling: none.

Viewer B upvote proof:

- Viewer B clicked the target item's visible upvote button.
- Viewer B rendered the target item as `Upvoted 1`.
- Chrome warning/error logs after upvote: none.

Viewer A polling proof after upvote:

- Viewer A was not manually reloaded before the upvote-count check.
- Viewer A rendered the target item as `Upvote 1`.
- Chrome warning/error logs after update: none.

Refresh persistence proof:

- Both tabs were manually refreshed.
- Viewer A still rendered the target item with `Issue #2` and `Upvote 1`.
- Viewer B still rendered the target item with `Issue #2` and `Upvoted 1`.
- Chrome warning/error logs after refresh: none.

## GitHub And API Cross-Check

GitHub Issue proof:

```json
{
  "createdAt": "2026-06-05T14:52:50Z",
  "number": 2,
  "state": "OPEN",
  "title": "Chrome dogfood item 20260605T145224Z",
  "url": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/2"
}
```

API readback for Viewer A:

```json
{
  "id": "item_abc3023cb1a27e7396aa3ba9",
  "title": "Chrome dogfood item 20260605T145224Z",
  "githubIssueNumber": 2,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/2",
  "upvoteCount": 1,
  "viewerHasUpvoted": false
}
```

API readback for Viewer B:

```json
{
  "id": "item_abc3023cb1a27e7396aa3ba9",
  "title": "Chrome dogfood item 20260605T145224Z",
  "githubIssueNumber": 2,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/2",
  "upvoteCount": 1,
  "viewerHasUpvoted": true
}
```

Event stream proof for the created item:

```json
[
  {
    "id": 3,
    "eventType": "item_created",
    "itemId": "item_abc3023cb1a27e7396aa3ba9",
    "createdAt": "2026-06-05T14:52:50.435Z"
  },
  {
    "id": 4,
    "eventType": "upvote_added",
    "itemId": "item_abc3023cb1a27e7396aa3ba9",
    "createdAt": "2026-06-05T14:53:32.331Z"
  }
]
```

## Oracle Mapping

- Codex Chrome Extension could open Chrome tabs for Viewer A and Viewer B: passed.
- Viewer A and Viewer B loaded their dogfood URLs: passed.
- Both tabs rendered the embedded board from `https://board.bugdrop.dev/board.js` without blocking
  console errors: passed after redeploy.
- Viewer A created a uniquely titled item from visible UI: passed.
- The corresponding GitHub Issue exists in `mean-weasel/bugdrop-board-production-dogfood`: passed,
  issue #2.
- Viewer B saw the new item through polling without manual full-page reload: passed.
- A different viewer upvoted the item from the visible UI, and both viewers showed one upvote:
  passed.
- Refreshing both tabs preserved the item, GitHub link, and viewer-specific upvote state: passed.
- API/CLI cross-checks agree with browser observations: passed.
- Any defect found has a clear follow-up issue, or the receipt explains why no issue was needed:
  passed; issue #24 was filed and closed after proof.

## Verification Gates

- `npm run build:widget && npx wrangler deploy --dry-run --env production`: passed.
- Deploy workflow run `27021970255`: passed.
- CORS preflight and authenticated CORS reads after deploy: passed.
- Chrome two-viewer dogfood rerun: passed.
- GitHub issue view for issue #2: passed.
- Board API readbacks for Viewer A and Viewer B: passed.
- Event API readback for item events: passed.

## Scope Audit

- No npm package was published.
- No hosted control plane was added.
- No billing behavior was added.
- No realtime transport was added.
- No comments, downvotes, or GitHub Projects behavior was added.
- No production credentials or secrets were rotated.
- No secret values, bearer tokens, cookies, local storage, profile data, or password data are
  recorded here.
- Production mutation was limited to:
  - redeploying the production Board Worker using existing GitHub Environment secrets;
  - creating one dogfood board item;
  - creating the mirrored GitHub dogfood issue #2;
  - adding one upvote from Viewer B;
  - closing issue #24 after proof.

## Rollback

Rollback remains operator-controlled:

1. Re-run **Deploy Worker** for BugDrop Board from the previous known-good commit if the Worker must
   be rolled back.
2. Restore previous Worker secrets only if an operator intentionally rotates or replaces them.
3. Remove or close the dogfood mirror issue #2 only if the team wants to clean up dogfood data.
4. Re-run `/health`, `/board.js`, CORS preflight, `bugdrop.dev/board-dogfood`, and token-to-Board-API
   smoke checks.
