# Mainline Release Rehearsal - 2026-06-04

## Summary

Merged `main` passed the release-readiness rehearsal without npm publish or production deploy.

## Mainline

- Branch checked out before creating this conveyor branch: `main`
- Merged main commit: `bf188d3da50b47727bbcf0eb8f676e9bc44fb719`
- Merged PR: `https://github.com/mean-weasel/bugdrop-board/pull/9`

## Local Gates

`npm run release:rehearsal` passed. It covered:

- local board provisioning for `mean-weasel/release-rehearsal`
- `npm run pack:check`
- `npm run deploy:check`
- local Playwright E2E
- `npm run validate`
- `npm run knip`
- critical `npm audit`
- Actions Node 24 guard

## GitHub Workflow Proof

Package Widget dry-run from `main`:

- Run: `https://github.com/mean-weasel/bugdrop-board/actions/runs/26969918392`
- Head SHA: `bf188d3da50b47727bbcf0eb8f676e9bc44fb719`
- Conclusion: `success`
- Publish steps: skipped because `dry_run=true`

Deploy Worker to staging from `main`:

- Run: `https://github.com/mean-weasel/bugdrop-board/actions/runs/26969967283`
- Head SHA: `bf188d3da50b47727bbcf0eb8f676e9bc44fb719`
- Conclusion: `success`
- Environment: GitHub Environment `staging`
- Wrangler environment: `staging`
- Remote D1 migrations: applied
- Board provisioning: ran for `mean-weasel/bugdrop-board-dogfood`
- Worker deploy: succeeded

## Staging Smoke

`curl -fsS https://bugdrop-board-staging.neonwatty.workers.dev/health` returned:

```json
{ "status": "ok", "environment": "staging", "timestamp": "2026-06-04T18:01:06.126Z" }
```

`curl -fsSI https://bugdrop-board-staging.neonwatty.workers.dev/board.js` returned `HTTP/2 200`
with `content-type: text/javascript`.

## Browser Dogfood

Command shape:

```bash
BUGDROP_BOARD_ID=board_mean_weasel_bugdrop_board_dogfood \
BUGDROP_BOARD_SCRIPT_SRC=https://bugdrop-board-staging.neonwatty.workers.dev/board.js \
BUGDROP_BOARD_WORKER_ORIGIN=https://bugdrop-board-staging.neonwatty.workers.dev \
BUGDROP_BOARD_TOKEN_AUDIENCE=bugdrop-board \
BUGDROP_BOARD_TOKEN_ISSUER=bugdrop-board-dogfood-host \
BUGDROP_BOARD_POLL_INTERVAL=3000 \
npx playwright test --config=playwright.staging.config.ts
```

Result: `1 passed (7.9s)`.

GitHub issue proof:

```json
{
  "createdAt": "2026-06-04T18:01:19Z",
  "number": 5,
  "state": "OPEN",
  "title": "Staging dogfood item 1780596077763",
  "url": "https://github.com/mean-weasel/bugdrop-board-dogfood/issues/5"
}
```

## Scope Audit

- No npm publish ran.
- No production deploy ran.
- No production secrets were written.
- No production Cloudflare resources were created.
- No hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior was added.
- No secret values are recorded in this receipt.
