# Staging Dogfood

This runbook proves BugDrop Board in a real staging deployment before npm publish or production
deploy. It intentionally avoids hosted control plane, billing, realtime, comments, downvotes,
GitHub Projects, and new product behavior.

## Names

- GitHub Environment: `staging`
- Wrangler environment: `staging`
- Worker name: `bugdrop-board-staging`
- D1 database name: `bugdrop-board-staging`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-dogfood`
- Board name: `BugDrop Board Dogfood`
- Expected board id: `board_mean_weasel_bugdrop_board_dogfood`
- Token audience: `bugdrop-board`
- Token issuer: `bugdrop-board-dogfood-host`

## Local Preflight

Run:

```bash
npm run release:rehearsal
```

Expected: local provisioning, package dry-run, deploy dry-run, Playwright E2E, validation, knip,
critical audit, and Actions guard all pass.

## Cloudflare Resources

Log in:

```bash
npx wrangler whoami
```

Create the staging D1 database:

```bash
npx wrangler d1 create bugdrop-board-staging
```

Copy the returned `database_id` into the staging environment binding used by the deployment branch.
Do not commit secrets.

## GitHub Resources

Create or verify the dogfood repo:

```bash
gh repo view mean-weasel/bugdrop-board-dogfood >/dev/null 2>&1 || \
  gh repo create mean-weasel/bugdrop-board-dogfood --private --description "BugDrop Board staging dogfood mirror repo"
```

Create or verify the GitHub Environment named `staging` in repository settings.

Set Environment secrets:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --env staging --body "$CLOUDFLARE_ACCOUNT_ID"
gh secret set CLOUDFLARE_API_TOKEN --env staging --body "$CLOUDFLARE_API_TOKEN"
gh secret set BOARD_TOKEN_SECRET --env staging --body "$BOARD_TOKEN_SECRET"
gh secret set GITHUB_ISSUE_ACCESS_TOKEN --env staging --body "$GITHUB_ISSUE_ACCESS_TOKEN"
```

Set the npm secret only for package dry-run/publish workflow validation:

```bash
gh secret set NPM_TOKEN --body "$NPM_TOKEN"
```

## Package Dry-Run

Run the **Package Widget** workflow with:

- `dry_run`: enabled
- `npm_tag`: `next`

Expected: the package job passes and logs a tarball containing `README.md`, `package.json`,
`public/board.js`, and `src/widget/`.

## Deploy Staging Worker

Run the **Deploy Worker** workflow with:

- GitHub Environment: `staging`
- `environment`: `staging`
- `wrangler_environment`: `staging`
- Apply remote D1 migrations: enabled
- Provision repo: `mean-weasel/bugdrop-board-dogfood`
- Provision name: `BugDrop Board Dogfood`

Expected: validation gates pass, remote migrations apply, board provisioning prints
`board_mean_weasel_bugdrop_board_dogfood`, and Wrangler deploys `bugdrop-board-staging`.

## Host App Dogfood

Use an existing BugDrop dummy host app when available. The host app must:

- serve a signed-in page that embeds the staging Worker script;
- expose a backend token endpoint that returns `{ "token": "payload.signature" }`;
- sign with the same `BOARD_TOKEN_SECRET` as the Worker;
- use `aud` = `bugdrop-board`;
- use `iss` = `bugdrop-board-dogfood-host`;
- set `boardId` = `board_mean_weasel_bugdrop_board_dogfood`;
- issue different `externalUserId` values for at least two viewer sessions.

Embed:

```html
<script
  src="https://bugdrop-board-staging.<account-subdomain>.workers.dev/board.js"
  data-board-id="board_mean_weasel_bugdrop_board_dogfood"
  data-api-url="https://bugdrop-board-staging.<account-subdomain>.workers.dev"
  data-token-endpoint="/api/bugdrop-board-token"
  data-poll-interval="3000"
  data-color="#1f883d"
></script>
```

Replace the Worker origin with the actual staging Worker URL returned by Wrangler.

## Browser Proof

Use two browser sessions with different signed-in dummy users:

1. Viewer A opens the host app page.
2. Viewer B opens the same host app page in a separate browser context.
3. Viewer A creates item `Staging dogfood item`.
4. Confirm a GitHub Issue appears in `mean-weasel/bugdrop-board-dogfood`.
5. Confirm Viewer B sees `Staging dogfood item` through polling.
6. Viewer A upvotes the item.
7. Confirm Viewer A shows `Upvoted 1`.
8. Confirm Viewer B shows `Upvote 1` after polling.

## HTTP Smoke

Run:

```bash
curl -fsS https://bugdrop-board-staging.<account-subdomain>.workers.dev/health
curl -fsSI https://bugdrop-board-staging.<account-subdomain>.workers.dev/board.js
```

Expected: `/health` returns JSON with environment `staging`, and `/board.js` returns `200`.

## Rollback

Rollback is operator-controlled:

1. Re-run **Deploy Worker** from the previous known-good commit, or use Cloudflare Worker rollback.
2. Restore previous Worker secrets if a secret rotation caused the failure.
3. Re-run HTTP smoke and the two-viewer host app proof.
