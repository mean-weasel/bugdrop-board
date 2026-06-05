# bugdrop-board

Embedded, self-hostable ideas/request board backed by Cloudflare D1 and mirrored to GitHub
Issues.

## Status

Early implementation. The current slice includes a Cloudflare Worker API, D1-backed board state,
host-signed user tokens, GitHub Issue creation for new board items, a vanilla TypeScript widget,
and a dummy host app used by Playwright.

## Product Shape

BugDrop Board is embedded inside an existing app. The host app owns login and serves a short-lived
token endpoint for its signed-in users. BugDrop Board verifies those tokens, stores board data in
D1, creates one GitHub Issue per board item, and keeps upvotes in D1.

Hosted users should eventually need only GitHub and the embed script. Self-hosters run their own
Cloudflare Worker, D1 database, Worker secrets, and GitHub access token.

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy local secrets:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

3. Fill in `.dev.vars`:
   - `BOARD_TOKEN_SECRET`: long random value used to verify host-signed board tokens.
   - `GITHUB_ISSUE_ACCESS_TOKEN`: GitHub token that can create issues in the mirrored repo.

4. Create a D1 database if you are configuring a new Cloudflare account:

   ```bash
   npx wrangler d1 create bugdrop-board-dev
   ```

   Copy the returned `database_id` into `wrangler.toml`. The Worker binding must remain `DB`.

5. Apply local D1 migrations:

   ```bash
   npx wrangler d1 migrations apply DB --local
   ```

6. Provision a board:

   ```bash
   npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --local
   ```

   The command creates or updates one D1 board for the repo and prints the stable `board.id` to
   use in the embed script.

7. Build the widget bundle:

   ```bash
   npm run build:widget
   ```

8. Start the Worker:

   ```bash
   npm run dev
   ```

   The development Worker listens on `http://127.0.0.1:8788`.

9. Run the local embedded smoke:

   ```bash
   npm run test:e2e
   ```

   The E2E command starts the Worker with local test vars, serves a dummy host app on
   `http://127.0.0.1:5177`, provisions a board through `npm run provision:board`, creates an item,
   upvotes it, and proves another viewer sees the update through polling.

## Production Deploy Readiness

Self-hosters deploy the same Worker and widget bundle that local development uses, but production
configuration should be explicit before the first deploy.

1. Choose the deployed Worker URL and the host app origins that may embed the board.

   Example:
   - Worker URL: `https://bugdrop-board.example.workers.dev`
   - Host app origins: `https://app.example.com`, `https://admin.example.com`

2. Create the remote D1 database:

   ```bash
   npx wrangler d1 create bugdrop-board-prod
   ```

   Keep the binding name as `DB` in `wrangler.toml`, then replace the placeholder
   `database_id` with the id returned by Wrangler. Use the same remote D1 database for migrations,
   provisioning, deployed API reads, upvotes, and item creation.

3. Set deployed non-secret Worker vars in `wrangler.toml`:

   ```toml
   [vars]
   ENVIRONMENT = "production"
   ALLOWED_ORIGINS = "https://app.example.com,https://admin.example.com"
   BOARD_TOKEN_AUDIENCE = "bugdrop-board"
   BOARD_TOKEN_ISSUER = "your-host-app"
   ```

   `ALLOWED_ORIGINS="*"` is a local development default. For deployed Workers, use exact origins
   for the app surfaces that will embed the widget. The host token endpoint must sign tokens with
   the same `BOARD_TOKEN_SECRET`, `BOARD_TOKEN_AUDIENCE`, and `BOARD_TOKEN_ISSUER` values the
   Worker expects.

4. Set deployed Worker secrets:

   ```bash
   npx wrangler secret put BOARD_TOKEN_SECRET
   npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN
   ```

   Do not put these values in `wrangler.toml`, browser code, or the embed script. `.dev.vars` is
   only for local `wrangler dev`.

5. Build and dry-run the Worker bundle:

   ```bash
   npm run deploy:check
   ```

   This builds `public/board.js` and runs `wrangler deploy --dry-run`, which validates the Worker
   bundle, assets, and bindings without uploading a deployment.

6. Apply remote D1 migrations:

   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```

7. Provision one board for the app's GitHub repo:

   ```bash
   npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --remote
   ```

   Save the printed `board.id`; that value becomes the embed script's `data-board-id`. Running the
   command again updates the board name and keeps the same repo-backed board id.

8. Deploy the Worker:

   ```bash
   npm run deploy
   ```

9. Verify the deployed surface:

   ```bash
   curl https://bugdrop-board.example.workers.dev/health
   curl -I https://bugdrop-board.example.workers.dev/board.js
   ```

   Then embed the script in a signed-in test page and confirm that a created item appears in the
   configured GitHub repo and that a second browser session sees the upvote after polling.

Production readiness checklist:

- Remote D1 database exists, `wrangler.toml` points at its real `database_id`, and remote migrations
  have been applied.
- `BOARD_TOKEN_SECRET` and `GITHUB_ISSUE_ACCESS_TOKEN` are deployed Worker secrets.
- `ALLOWED_ORIGINS` names exact host app origins instead of `*`.
- Host token endpoint signs short-lived user tokens with matching secret, audience, issuer, and
  `boardId`.
- GitHub access token can create issues in the provisioned board repo.
- `npm run deploy:check`, `npm run validate`, `npm run test:e2e`, and `make check` pass before
  deploy.

## Embed Contract

Add the built widget script to a host app page:

```html
<script
  src="https://your-worker.example.com/board.js"
  data-board-id="board_mean_weasel_demo"
  data-api-url="https://your-worker.example.com"
  data-token-endpoint="/api/bugdrop-board-token"
  data-poll-interval="3000"
  data-color="#1f883d"
></script>
```

Attributes:

- `data-board-id`: D1 board id. Current ids are generated from repo owner/name, for example
  `board_mean_weasel_demo`.
- `data-api-url`: Worker API origin. Defaults to the script origin when omitted.
- `data-token-endpoint`: host app endpoint that returns a board token for the current app user.
- `data-poll-interval`: optional polling interval in milliseconds. Values below `500` are ignored.
- `data-color`: optional accent color for widget controls.

The widget runs in an open Shadow DOM root and appends itself to the host page body.

## Host Token Endpoint

The host app endpoint must return JSON:

```json
{ "token": "payload.signature" }
```

The token is an HMAC-SHA256 signature over a base64url JSON payload. Required claims:

- `boardId`: board id the user may access.
- `externalUserId`: stable user id from the host app.
- `exp`: expiry time as Unix seconds.

Optional claims:

- `displayName`
- `email`
- `aud`, matching `BOARD_TOKEN_AUDIENCE` when configured.
- `iss`, matching `BOARD_TOKEN_ISSUER` when configured.

Never expose `BOARD_TOKEN_SECRET` to browser code. Sign tokens in the host app backend. The dummy
host fixture in `e2e/fixtures/host-app.ts` shows the local test shape.

## GitHub Mirroring

For normal development and deployed use, set `GITHUB_ISSUE_ACCESS_TOKEN` as a Worker secret or in
local `.dev.vars`. The token must be able to create issues in the repo represented by the board.

When a board item is created, BugDrop Board creates a GitHub Issue first. If GitHub issue creation
fails, the D1 board item is not stored.

## Request Throttling

BugDrop Board includes D1-backed write throttling for the embedded board APIs. The default limits
are per board, per signed host user, per action:

- item creation: `5` requests per window;
- upvote toggling: `60` requests per window;
- window size: `60` seconds.

Configure these non-secret Worker vars in `wrangler.toml`:

```toml
REQUEST_THROTTLE_WINDOW_SECONDS = "60"
ITEM_CREATE_RATE_LIMIT = "5"
UPVOTE_RATE_LIMIT = "60"
```

When a user exceeds a write limit, the API returns `429` with a `Retry-After` header and does not
run the write side effect. Item creation is throttled before GitHub Issue creation, so over-limit
requests do not create GitHub Issues.

Use positive integer values. Invalid or missing values fall back to the safe defaults above. Higher
limits are useful for trusted internal testing; lower limits are useful for public boards that need
more conservative write protection.

## Cloudflare Configuration

`wrangler.toml` defines:

- Worker entrypoint: `src/index.ts`
- Static asset binding: `ASSETS` from `public`
- D1 binding: `DB`
- Local database name: `bugdrop-board-dev`
- Worker defaults: `ENVIRONMENT`, `ALLOWED_ORIGINS`, `BOARD_TOKEN_AUDIENCE`, and
  `BOARD_TOKEN_ISSUER`
- Request throttling defaults: `REQUEST_THROTTLE_WINDOW_SECONDS`, `ITEM_CREATE_RATE_LIMIT`, and
  `UPVOTE_RATE_LIMIT`

Keep secrets out of `wrangler.toml`. For local development, use `.dev.vars`. For deployed
environments, set secrets with:

```bash
npx wrangler secret put BOARD_TOKEN_SECRET
npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN
```

For deployed D1 migrations, use:

```bash
npx wrangler d1 migrations apply DB --remote
```

To check deploy packaging without uploading the Worker, use:

```bash
npm run deploy:check
```

## Secret Rotation And Recovery

BugDrop Board has two self-host secrets:

- `BOARD_TOKEN_SECRET`: shared by the host app backend and the Worker to sign and verify
  short-lived board tokens.
- `GITHUB_ISSUE_ACCESS_TOKEN`: used by the Worker to create GitHub Issues for new board items.

These nearby settings are not secrets, but they matter during recovery:

- `BOARD_TOKEN_AUDIENCE` and `BOARD_TOKEN_ISSUER` must match the `aud` and `iss` claims the host
  token endpoint signs.
- `ALLOWED_ORIGINS` must include the host app origins that embed the widget.
- The D1 binding must stay `DB`, and `database_id` must point at the database that contains the
  provisioned board rows.

Rotate `BOARD_TOKEN_SECRET` when the signing secret may be exposed or as part of operator policy:

1. Generate a new long random value.
2. Update the host app backend so it signs new board tokens with that value.
3. Replace the deployed Worker secret:

   ```bash
   npx wrangler secret put BOARD_TOKEN_SECRET
   ```

4. Restart or redeploy the host app if its runtime requires it.
5. Ask active users to refresh the host page, or wait for existing short-lived tokens to expire.
6. Verify the Worker bundle and embedded flow:

   ```bash
   npm run deploy:check
   npm run test:e2e
   ```

   For deployed verification, open a signed-in host page, create a board item, and confirm a second
   viewer can read/upvote it.

Expected impact: tokens signed with the old secret fail with `Invalid board token` after the Worker
uses the new secret. That is expected until the host app issues fresh tokens. If all users get token
errors after the rotation, confirm the host app and Worker use the same secret and that
`BOARD_TOKEN_AUDIENCE` and `BOARD_TOKEN_ISSUER` still match the host claims.

Rollback: put the previous value back with `npx wrangler secret put BOARD_TOKEN_SECRET`, then
restore the host app signer to the same previous value.

Rotate `GITHUB_ISSUE_ACCESS_TOKEN` when the GitHub token may be exposed, expires, or repo access
changes:

1. Create a replacement GitHub token that can create issues in the repo used by the provisioned
   board. For fine-grained tokens, give the target repo issue-write access.
2. Replace the deployed Worker secret:

   ```bash
   npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN
   ```

3. Confirm the board still points at the expected repo:

   ```bash
   npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --remote
   ```

4. Verify the Worker bundle:

   ```bash
   npm run deploy:check
   ```

5. For deployed verification, create a test item from the embedded board and confirm the matching
   GitHub Issue appears in the configured repo.

Expected impact: item creation returns `GitHub issue creator is not configured` when the secret is
missing, or `Failed to create GitHub issue` when GitHub rejects the token. In both cases, the board
item is not stored because GitHub Issue creation happens before D1 item persistence.

Rollback: put the previous GitHub token back with
`npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN`, then create a test item to confirm GitHub
mirroring works again.

Local recovery uses `.dev.vars` instead of deployed Worker secrets. Update `.dev.vars`, restart
`wrangler dev`, and rerun:

```bash
npm run test:e2e
```

The local E2E flow uses a fake GitHub Issue creator, so it proves the board/token/widget path but
not a live GitHub token. Use a deployed test item to prove real GitHub token recovery.

## Environment Promotion

The `Deploy Worker` GitHub Actions workflow provides a manual self-host promotion path. It does not
publish the embed package or create hosted-control-plane resources.

Create one GitHub Environment for each deployment target, for example `production`. Add these
Environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`, scoped to deploy the Worker and manage the configured D1 database
- `BOARD_TOKEN_SECRET`
- `ISSUE_ACCESS_TOKEN`, containing the GitHub Issues token. The workflow maps this to the
  deployed Worker secret `GITHUB_ISSUE_ACCESS_TOKEN`.

Before the first promotion, update `wrangler.toml` for the target environment:

- `ENVIRONMENT = "production"`
- `ALLOWED_ORIGINS` lists exact host app origins
- `BOARD_TOKEN_AUDIENCE` and `BOARD_TOKEN_ISSUER` match the host token endpoint
- D1 `database_id` points at the remote D1 database

Run the workflow from GitHub Actions:

1. Select **Deploy Worker**.
2. Choose the GitHub Environment, such as `production`.
3. Leave **Apply remote D1 migrations** enabled unless migrations were already applied.
4. Optionally enter `provision_repo` as `owner/name` and `provision_name` to create or update the
   board row before deployment.
5. Optionally enter `smoke_url`, such as `https://bugdrop-board.example.workers.dev`, to verify the
   deployed `/health` and `/board.js` endpoints after deployment.

The workflow runs:

```bash
npm run validate
npm run build:widget
npx wrangler deploy --dry-run [--env staging]
npx wrangler d1 migrations apply DB --remote
npm run provision:board -- --repo owner/name --remote
npx wrangler deploy --secrets-file .deploy.secrets
npm run deploy:smoke -- --url https://bugdrop-board.example.workers.dev --expect-environment production
```

The secrets file is generated inside the workflow runner and removed at the end of the job. Do not
commit `.deploy.secrets`.

After promotion, verify the deployed Worker:

```bash
curl https://bugdrop-board.example.workers.dev/health
curl -I https://bugdrop-board.example.workers.dev/board.js
npm run deploy:smoke -- --url https://bugdrop-board.example.workers.dev --expect-environment production
DEPLOY_SMOKE_URL=https://bugdrop-board.example.workers.dev \
  DEPLOY_SMOKE_EXPECT_ENVIRONMENT=production \
  make deploy-smoke
```

Then open a signed-in host app page, create a test item, confirm the matching GitHub Issue appears,
and confirm another viewer can read or upvote the item.

Rollback is operator-controlled: rerun the workflow from the previous known-good commit or restore
the previous Worker secrets with `wrangler secret put`, then run the deployed smoke checks again.

## Embed Package Publishing

The npm package publishes the versioned embed script and source needed to inspect or rebuild it. It
does not deploy a Worker, create a CDN release, provision D1, or replace the self-host deployment
flow above.

The package entrypoints are:

- `@mean-weasel/bugdrop-board`
- `@mean-weasel/bugdrop-board/board`
- `@mean-weasel/bugdrop-board/board.js`

All entrypoints resolve to `public/board.js`. The npm package includes:

- `public/board.js`
- `scripts/verify-deployed-worker.js`
- `scripts/verify-package-install.js`
- `src/widget/`
- `README.md`
- package metadata

Before publishing, bump `package.json` in a normal PR. The widget build reads that package version
by default and embeds it as the runtime `__BUGDROP_BOARD_VERSION__` value. For one-off local builds,
override it with:

```bash
VERSION=0.1.0 npm run build:widget
```

Verify the package contents locally:

```bash
npm run pack:check
make pack-check
```

`npm run pack:check` runs `npm pack --dry-run`. The `prepack` lifecycle rebuilds
`public/board.js` first, so the tarball preview proves the package would contain the current embed
bundle for the package version.

After a publish, verify the registry artifact by installing it into a temporary project:

```bash
npm run release:smoke
npm run release:smoke -- --version 0.1.0
make release-smoke
```

The smoke command resolves all public package entrypoints, verifies they point at the installed
`public/board.js` bundle, and checks the bundle has the expected widget and fetch code. The package
workflow runs this smoke automatically after a non-dry-run publish.

The `Package Widget` GitHub Actions workflow is manually dispatched and dry-runs by default:

1. Select **Package Widget**.
2. Leave **Build and verify the npm package without publishing** enabled for a package preview.
3. Choose `latest` or `next` as the npm dist-tag.
4. To publish, rerun with dry-run disabled after the version PR has merged.

Publishing requires a repository secret named `NPM_TOKEN`. Create a granular npm token with
read/write access to the `@mean-weasel` package scope and no organization-management access. The
workflow runs:

```bash
npm run validate
npm run pack:check
npm publish --access public --tag "$NPM_TAG"
npm run release:smoke
```

The first public package is published as `@mean-weasel/bugdrop-board@0.1.0`. Actual publishing of
future versions still requires npm ownership or publish rights for the configured package scope.
When in doubt, keep the workflow in dry-run mode and inspect the package file list before
publishing.

## Release Rehearsal

Before configuring production credentials, run the local release rehearsal:

```bash
npm run release:rehearsal
make release-rehearsal
```

The rehearsal uses only local/test configuration and runs:

```bash
npm run provision:board -- --repo mean-weasel/release-rehearsal --name "Release Rehearsal" --local
npm run pack:check
npm run deploy:check
npm run test:e2e
npm run validate
npm run knip
npm run audit
npm run check:actions-node24
```

This proves the local D1 provisioning path, package dry-run, Worker deploy dry-run, embedded widget
smoke, unit/type/lint checks, knip, critical audit, and GitHub Actions version guard without
requiring Cloudflare or npm production credentials.

After the local rehearsal passes, configure credentials in GitHub:

- GitHub Environment secrets for `Deploy Worker`: `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`, `BOARD_TOKEN_SECRET`, and `ISSUE_ACCESS_TOKEN`.
- Repository secret for `Package Widget`: `NPM_TOKEN`.

Then run the GitHub workflows in dry-run or test mode before production:

- Run **Package Widget** with dry-run enabled and inspect the package file list.
- Run **Deploy Worker** against a staging or test Cloudflare environment, with remote migrations and
  a disposable board repo when possible.
- Embed the staging Worker in a signed-in host-app page and confirm item creation, GitHub Issue
  mirroring, upvoting, and polling from a second session.

For the full staging sequence, use [Staging Dogfood](docs/staging-dogfood.md).

Do not publish to npm or deploy to production until the version, npm package ownership, Cloudflare
account, GitHub token scope, host app origins, and token issuer/audience values are final.

## Verification

Run the standard checks before handing off changes:

```bash
npm run release:rehearsal
npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --local
npm run build:widget
npm run pack:check
npm run deploy:check
npm run deploy:smoke -- --url https://board.bugdrop.dev --expect-environment production
DEPLOY_SMOKE_URL=https://board.bugdrop.dev DEPLOY_SMOKE_EXPECT_ENVIRONMENT=production make deploy-smoke
npm run test:e2e
npm run validate
make check
```

## Current Handoff Notes

This repository is still an early vertical slice. The conveyor PR stack has landed on `main`,
`@mean-weasel/bugdrop-board@0.1.0` is published on npm, and the production Worker is available at
`https://board.bugdrop.dev`.

Remaining release actions are operational: keep running the local release rehearsal before
significant changes, run the GitHub workflows against staging/test credentials when changing deploy
or package release paths, dogfood the embedded widget in a real signed-token host app, and decide
the next version before any future npm publish.
