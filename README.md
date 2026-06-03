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

## Cloudflare Configuration

`wrangler.toml` defines:

- Worker entrypoint: `src/index.ts`
- Static asset binding: `ASSETS` from `public`
- D1 binding: `DB`
- Local database name: `bugdrop-board-dev`
- Worker defaults: `ENVIRONMENT`, `ALLOWED_ORIGINS`, `BOARD_TOKEN_AUDIENCE`, and
  `BOARD_TOKEN_ISSUER`

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

## Verification

Run the standard checks before handing off changes:

```bash
npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --local
npm run build:widget
npm run deploy:check
npm run test:e2e
npm run validate
make check
```

## Current Handoff Notes

This repository is still an early vertical slice. Before release, the next tranche should decide
and implement:

- request throttling and misuse controls;
- secret rotation and recovery guidance;
- release automation and environment promotion;
- package/version publishing flow for the embed script.
