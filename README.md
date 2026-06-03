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

Keep secrets out of `wrangler.toml`. For deployed environments, set them with:

```bash
npx wrangler secret put BOARD_TOKEN_SECRET
npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN
```

For deployed D1 migrations, use:

```bash
npx wrangler d1 migrations apply DB --remote
```

## Verification

Run the standard checks before handing off changes:

```bash
npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --local
npm run build:widget
npm run test:e2e
npm run validate
make check
```

## Current Handoff Notes

This repository is still an early vertical slice. Before release, the next tranche should decide
and implement:

- stricter origin policy defaults for deployed Workers;
- request throttling and misuse controls;
- secret rotation guidance;
- deployment documentation for staging and production;
- package/version publishing flow for the embed script.
