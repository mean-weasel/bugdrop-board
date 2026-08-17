# Staging Dogfood

This runbook proves BugDrop Board in a real staging deployment before production deploy. It
intentionally avoids hosted control plane, billing, realtime, comments, downvotes, GitHub Projects,
and new product behavior.

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

Expected: local provisioning, deploy dry-run, Playwright E2E, validation, knip, critical audit, and
Actions guard all pass.

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

## Wrangler Staging Config

Before running any staging deploy workflow, make the deployment branch contain an explicit
`[env.staging]` block. Without it, Wrangler can warn that no environment was found and fall back to
default development values such as `ENVIRONMENT = "development"`, `ALLOWED_ORIGINS = "*"`, the
dummy issuer, and placeholder D1 ids.

Use exact dogfood host origins for staging. Do not use `ALLOWED_ORIGINS = "*"` outside local
development. Do not commit secrets. The D1 `database_id` is not a secret, but confirm with the
operator before committing the Mean Weasel staging id to this public or shared repo.

Wrangler environments do not inherit top-level vars, so staging should repeat every non-secret
Worker var it needs.

Sample staging block:

```toml
[env.staging]
name = "bugdrop-board-staging"

[env.staging.vars]
ENVIRONMENT = "staging"
ALLOWED_ORIGINS = "https://<dogfood-host-origin>"
BOARD_TOKEN_AUDIENCE = "bugdrop-board"
BOARD_TOKEN_ISSUER = "bugdrop-board-dogfood-host"
REQUEST_THROTTLE_WINDOW_SECONDS = "60"
ITEM_CREATE_RATE_LIMIT = "5"
UPVOTE_RATE_LIMIT = "60"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "bugdrop-board-staging"
database_id = "<returned staging database_id>"
migrations_dir = "migrations"
```

Prove the staging config before deploy:

```bash
npx wrangler deploy --dry-run --env staging
```

Expected: Wrangler does not print a `No environment found` warning. The dry-run output must show
the staging Worker config, including `ENVIRONMENT ("staging")`, an exact `ALLOWED_ORIGINS` value,
`BOARD_TOKEN_ISSUER ("bugdrop-board-dogfood-host")`, and the real staging D1 database id.

## GitHub Resources

Create or verify the dogfood repo:

```bash
gh repo view mean-weasel/bugdrop-board-dogfood >/dev/null 2>&1 || \
  gh repo create mean-weasel/bugdrop-board-dogfood --private --description "BugDrop Board staging dogfood mirror repo"
```

Create or verify the GitHub Environment named `staging` in repository settings.

Set Environment secrets without printing values:

```bash
npm run staging:secrets -- --set-account-id
npm run staging:secrets -- --generate-board-secret-file .secrets/bugdrop-board-staging.env
set -a; source .secrets/bugdrop-board-staging.env; set +a
```

Then provide the remaining least-privilege tokens in the current shell without echoing them:

```bash
# Cloudflare dashboard API token scoped to account 341a3846c29902f6363c151395932f5a
# with Workers/D1 deploy permissions for staging.
read -rsp "Cloudflare API token: " CLOUDFLARE_API_TOKEN; echo
export CLOUDFLARE_API_TOKEN

# Fine-grained GitHub token scoped only to mean-weasel/bugdrop-board-dogfood
# with Issues read/write permission. The helper stores this as the GitHub
# Environment secret ISSUE_ACCESS_TOKEN because GitHub reserves GITHUB_* names.
read -rsp "GitHub Issues token: " GITHUB_ISSUE_ACCESS_TOKEN; echo
export GITHUB_ISSUE_ACCESS_TOKEN

npm run staging:secrets -- --verify-env
npm run staging:secrets -- --set-from-env
npm run staging:secrets -- --status
```

`--verify-env` checks secret presence without printing values, confirms `BOARD_TOKEN_SECRET` has a
strong length, verifies the Cloudflare token is active and can see the staging D1 database, and
verifies the GitHub token can read the dogfood repo Issues API. The deploy workflow remains the
authoritative proof that the Cloudflare token has all required Worker/D1 write permissions.

`--set-from-env` refuses to store the current broad `gh auth token` as `ISSUE_ACCESS_TOKEN`.

If you are using zsh, use the zsh prompt form instead of `read -rsp`:

```zsh
read -rs "CLOUDFLARE_API_TOKEN?Cloudflare API token: "
echo
export CLOUDFLARE_API_TOKEN

read -rs "GITHUB_ISSUE_ACCESS_TOKEN?GitHub Issues token: "
echo
export GITHUB_ISSUE_ACCESS_TOKEN
```

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
  data-layout="kanban"
  data-composer="collapsed"
  data-empty-lane-display="visible"
  data-issue-links="hidden"
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
