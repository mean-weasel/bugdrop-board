# Production Dogfood

This runbook proves BugDrop Board as an embedded board inside the real `bugdrop.dev` host app,
using `board.bugdrop.dev` as the self-hosted board Worker.

It is the production analogue of [Staging Dogfood](staging-dogfood.md), but it intentionally keeps
deployment and secret rotation as explicit operator actions. Do not run these steps from a dirty
host-app checkout.

## Fixed Targets

- Host app origin: `https://bugdrop.dev`
- Board Worker origin: `https://board.bugdrop.dev`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-production-dogfood`
- Expected board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Token audience: `bugdrop-board`
- Token issuer: `bugdrop-board-production-host`
- Required Worker `ALLOWED_ORIGINS` value:
  `https://bugdrop.dev,https://board.bugdrop.dev`

`mean-weasel/bugdrop-board-production-dogfood` is private and has Issues enabled. GitHub Projects,
comments, downvotes, realtime, billing, and hosted control-plane behavior remain out of scope.

## Host App Shape

Implement the dogfood host in the `bugdrop` repo on a clean branch or worktree. The current
checkout may contain unrelated review work, so isolate this before editing.

The host app should expose:

- A signed-in test page, for example `/board-dogfood`.
- A backend token endpoint, for example `/api/bugdrop-board-token`.
- Two deterministic viewer identities for proof, such as `viewer=a` and `viewer=b`.

The page should embed:

```html
<script
  src="https://board.bugdrop.dev/board.js"
  data-board-id="board_mean_weasel_bugdrop_board_production_dogfood"
  data-api-url="https://board.bugdrop.dev"
  data-token-endpoint="/api/bugdrop-board-token?viewer=a"
  data-poll-interval="750"
  data-color="#1f883d"
  data-layout="kanban"
  data-composer="collapsed"
  data-empty-lane-display="hidden"
  data-issue-links="hidden"
></script>
```

The token endpoint must sign tokens server-side with the same secret as the board Worker
`BOARD_TOKEN_SECRET`. Never expose that secret to browser code, generated assets, screenshots, or
logs.

Required token claims:

- `boardId`: `board_mean_weasel_bugdrop_board_production_dogfood`
- `externalUserId`: stable host-user id, distinct per viewer
- `displayName`: host-user display name
- `exp`: short-lived expiry, ideally five minutes or less
- `aud`: `bugdrop-board`
- `iss`: `bugdrop-board-production-host`

Use the same HMAC payload/signature token format already implemented in BugDrop Board
`src/lib/board-token.ts`.

## Board Worker Promotion

After the board-side config is merged, deploy production explicitly through **Deploy Worker**:

1. Choose GitHub Environment `production`.
2. Set `wrangler_environment` to `production` so Wrangler uses the `[env.production]` Worker,
   route, vars, and D1 binding.
3. Leave remote D1 migrations enabled unless already applied.
4. Set `provision_repo` to `mean-weasel/bugdrop-board-production-dogfood`.
5. Set `provision_name` to `BugDrop Board Production Dogfood`.
6. Set `smoke_url` to `https://board.bugdrop.dev`.
7. Leave `smoke_expect_environment` blank, or set it to `production`.
8. Set `smoke_cors_origin` to `https://bugdrop.dev`.
9. Set `smoke_cors_disallowed_origin` to `https://evil.example`.
10. Set `smoke_cors_board_id` to `board_mean_weasel_bugdrop_board_production_dogfood`.
11. Set `smoke_cors_token_endpoint` to `https://bugdrop.dev/api/bugdrop-board-token?viewer=a`.

The deployment should provision or update the board row, deploy the Worker, verify `/health` and
`/board.js`, then prove browser CORS for preflight, `/items`, and `/events` from the dogfood host
origin.

## Manual Smoke

Run these non-mutating checks after the deploy:

```bash
npm run deploy:smoke -- \
  --url https://board.bugdrop.dev \
  --expect-environment production \
  --cors-origin https://bugdrop.dev \
  --cors-disallowed-origin https://evil.example \
  --cors-board-id board_mean_weasel_bugdrop_board_production_dogfood \
  --cors-token-endpoint "https://bugdrop.dev/api/bugdrop-board-token?viewer=a"
curl https://board.bugdrop.dev/health
curl -I https://board.bugdrop.dev/board.js
```

## Browser Proof

Use two browser contexts or two signed-in sessions:

1. Open `https://bugdrop.dev/board-dogfood?viewer=a`.
2. Open `https://bugdrop.dev/board-dogfood?viewer=b`.
3. Viewer A creates a uniquely titled item, such as `Production dogfood item <timestamp>`.
4. Confirm the item appears for Viewer A with a GitHub Issue link.
5. Confirm the matching GitHub Issue exists in
   `mean-weasel/bugdrop-board-production-dogfood`.
6. Confirm Viewer B sees the same item through polling.
7. Viewer A upvotes the item.
8. Confirm Viewer A sees `Upvoted 1` and Viewer B sees `Upvote 1`.

If GitHub Issue creation fails, inspect the Worker response and token scope first. The production
`ISSUE_ACCESS_TOKEN` must be able to create issues in
`mean-weasel/bugdrop-board-production-dogfood`.

## Receipt

After proof passes, commit a dated result receipt under `docs/production-dogfood-results/` with:

- Worker deploy run URL.
- Package/deploy smoke command output summary.
- Host app PR or commit URL.
- Board id.
- Created GitHub Issue URL.
- Browser proof notes for both viewers.
- Confirmation that no secret values were printed or committed.
- Rollback notes.

Rollback is operator-controlled: revert the host app dogfood route, redeploy the previous board
Worker config if needed, or restore prior Worker secrets with `wrangler secret put`, then rerun
the smoke checks.
