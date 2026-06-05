# Post-Polish Production Dogfood - 2026-06-05

Status: passed after corrected production deploy.

This pass verified the embedded UX polish from `main` in production without publishing a new npm
version, rotating secrets, or changing product scope.

## Targets

- Main SHA: `1201ce7fc77a0262937245c60076fc207e38b1e2`
- Board Worker: `https://board.bugdrop.dev`
- Dogfood host: `https://bugdrop.dev/board-dogfood`
- Board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-production-dogfood`

## Production Deploy

Initial deploy run:

- URL: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27030938416`
- Result: failed before deployment during remote D1 migrations.
- Cause: dispatch omitted `wrangler_environment=production`, so Wrangler used the top-level
  development D1 placeholder id `00000000-0000-0000-0000-000000000000`.

Corrected deploy run:

- URL: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27031011338`
- Result: success.
- Inputs included `environment=production`, `wrangler_environment=production`, remote migrations,
  production dogfood board provisioning, `https://board.bugdrop.dev` smoke, and browser CORS smoke
  from `https://bugdrop.dev`.
- Completed steps included validation gates, widget build, dry-run deploy package, remote D1
  migrations, board provisioning, Worker deploy, deployed Worker verification, and secret-file
  cleanup.

Independent local smoke also passed:

```json
{
  "health": {
    "status": "ok",
    "environment": "production"
  },
  "board": {
    "url": "https://board.bugdrop.dev/board.js",
    "status": 200,
    "contentType": "text/javascript",
    "cacheStatus": "HIT",
    "etag": "W/\"9e1eaa309eff14d196cba3b6525d44bd\""
  },
  "cors": {
    "origin": "https://bugdrop.dev",
    "boardId": "board_mean_weasel_bugdrop_board_production_dogfood",
    "preflight": {
      "status": 204,
      "allowOrigin": "https://bugdrop.dev"
    },
    "items": {
      "status": 200,
      "allowOrigin": "https://bugdrop.dev"
    },
    "events": {
      "status": 200,
      "allowOrigin": "https://bugdrop.dev"
    }
  }
}
```

## Package Dry-Run

- URL: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27031087417`
- Result: success.
- Publish-related steps were skipped because `dry_run=true`.
- Tarball proof included `public/board.js`, `src/widget/api.ts`, `src/widget/dom.ts`,
  `src/widget/index.ts`, `src/widget/theme.ts`, and `src/widget/types.ts`.
- Package remained `@mean-weasel/bugdrop-board@0.1.0`; no new version was published.

## Browser Dogfood

Unique item title:

```text
Post-polish dogfood item 20260605T175428Z
```

Description:

```text
Production post-polish dogfood proof after deploy run 27031011338.
```

Browser automation used the real embedded host URLs:

- Viewer A: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B: `https://bugdrop.dev/board-dogfood?viewer=b`

Proof:

- Both viewers rendered the `Feedback` board and form from production `board.js`.
- Viewer A created the new item through the visible form.
- Viewer A rendered `Issue #3` and the target upvote button with `aria-pressed="false"`.
- Viewer B saw the same item through polling without manual reload.
- Viewer B upvoted the target item and rendered `Upvoted 1` with `aria-pressed="true"`.
- Viewer A observed `Upvote 1` through polling with `aria-pressed="false"`.
- Both viewers preserved the item and viewer-specific upvote state after refresh.
- Browser warning/error logs for both viewers were empty.
- `Failed to fetch` was absent after initial load.
- `Loading feedback...` was observed during initial load.

GitHub Issue proof:

```json
{
  "number": 3,
  "state": "OPEN",
  "title": "Post-polish dogfood item 20260605T175428Z",
  "url": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/3",
  "createdAt": "2026-06-05T17:54:29Z"
}
```

API readback for Viewer A:

```json
{
  "id": "item_ab97ffed4a55f4ea6657dff8",
  "title": "Post-polish dogfood item 20260605T175428Z",
  "githubIssueNumber": 3,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/3",
  "upvoteCount": 1,
  "viewerHasUpvoted": false
}
```

API readback for Viewer B:

```json
{
  "id": "item_ab97ffed4a55f4ea6657dff8",
  "title": "Post-polish dogfood item 20260605T175428Z",
  "githubIssueNumber": 3,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/3",
  "upvoteCount": 1,
  "viewerHasUpvoted": true
}
```

Event stream proof:

```json
[
  {
    "id": 5,
    "eventType": "item_created",
    "itemId": "item_ab97ffed4a55f4ea6657dff8",
    "createdAt": "2026-06-05T17:54:29.963Z"
  },
  {
    "id": 6,
    "eventType": "upvote_added",
    "itemId": "item_ab97ffed4a55f4ea6657dff8",
    "createdAt": "2026-06-05T17:54:31.152Z"
  }
]
```

## Scope Audit

- No npm publish.
- No package version bump.
- No secret rotation or credential edits.
- No hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or unrelated
  product behavior.
- Repo follow-up from the failed first deploy: update the production dogfood runbook to require
  `wrangler_environment=production`.
