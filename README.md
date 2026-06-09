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

BugDrop Hosted Beta is the manual, BugDrop-run path for teams that do not want to self-host yet.
Self-hosters run their own Cloudflare Worker, D1 database, Worker secrets, and GitHub access token.
Hosted beta uses BugDrop-managed Worker secrets and GitHub App installation metadata server-side.

## Hosted Beta

Hosted beta users bring a signed-in app, a backend token endpoint, and a GitHub repo for mirrored
feedback issues. BugDrop configures the hosted Worker, board id, exact origins, D1 board row, token
audience/issuer, throttles, and GitHub mirror access during manual provisioning.

Read [Hosted Security And Setup](docs/hosted-security-and-setup.md) for the current security
promise, app responsibilities, configurable settings, and limitations. Hosted beta is not yet a
self-service multi-tenant control plane.

Operators can prepare hosted board config with a dry run before touching D1:

```bash
npm run provision:hosted-board -- \
  --tenant-slug mean-weasel \
  --tenant-name "Mean Weasel" \
  --app-slug dogfood \
  --app-name "Dogfood" \
  --repo mean-weasel/demo \
  --origin https://bugdrop.dev \
  --issuer https://bugdrop.dev \
  --audience bugdrop-board \
  --verifier-type jwks \
  --jwks-url https://bugdrop.dev/.well-known/jwks.json \
  --github-installation-id 123456 \
  --api-url https://board.bugdrop.dev \
  --token-endpoint /api/bugdrop-board-token \
  --layout kanban \
  --dry-run
```

The command prints deterministic SQL plus a redacted setup handoff with the board id, embed snippet,
allowed origins, token verifier settings, GitHub installation metadata, and security checklist. Drop
`--dry-run` and add `--remote --env production` only when the operator is ready to mutate the target
D1 database.

Use `--verifier-type jwks` with `--jwks-url` for new hosted beta apps that can publish signing
keys. Use `--verifier-type hmac_legacy` only for migration or dogfood installs that intentionally
share the Worker `BOARD_TOKEN_SECRET`; those host tokens must include `tenantId` and `appId` claims
from the setup handoff.

## Local Setup

Closed-beta development and self-host setup are verified on Node 22 with npm 10. The repo currently
uses `node >=22.12.0 <23`, `npm >=10 <11`, and Wrangler 4.x from the checked-in dev dependency.
Use the committed npm lockfile rather than mixing package managers.

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

   Keep the binding name as `DB` in `wrangler.toml`, then put the returned id in the target
   `[[env.production.d1_databases]]` binding. Use the same remote D1 database for migrations,
   provisioning, deployed API reads, upvotes, and item creation.

3. Set deployed non-secret Worker vars in `wrangler.toml`:

   ```toml
   [env.production.vars]
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
   npx wrangler secret put BOARD_TOKEN_SECRET --env production
   npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN --env production
   ```

   Do not put these values in `wrangler.toml`, browser code, or the embed script. `.dev.vars` is
   only for local `wrangler dev`.

5. Run the non-mutating self-host doctor before deploy or migration work:

   ```bash
   npm run doctor:selfhost -- \
     --env production \
     --host-origin https://app.example.com \
     --repo mean-weasel/demo \
     --board-id board_mean_weasel_demo \
     --worker-url https://bugdrop-board.example.workers.dev \
     --token-endpoint https://app.example.com/api/bugdrop-board-token
   ```

   The doctor checks the local toolchain, package metadata, ignored secret files, migrations,
   production Wrangler vars, remote D1 binding/id, exact CORS origins, repo/board id shape, and
   whether it can compose the follow-up `deploy:smoke` command. By default it does not contact
   Cloudflare or GitHub and does not mutate D1, secrets, deployments, npm, or GitHub Issues. Add
   `--check-cloudflare-auth` or `--check-github-token` only when you want explicit non-mutating
   reachability checks.

6. Build and dry-run the production Worker bundle:

   ```bash
   npm run deploy:check:production
   ```

   This builds `public/board.js` and runs `wrangler deploy --dry-run --env production`, which
   validates the Worker bundle, assets, and production bindings without uploading a deployment. Do
   not use the top-level development Wrangler config for closed-beta or production installs; it
   intentionally defaults to wildcard local CORS and placeholder D1 ids.

7. Apply remote D1 migrations:

   ```bash
   npx wrangler d1 migrations apply DB --remote --env production
   ```

8. Provision one board for the app's GitHub repo:

   ```bash
   npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --remote --env production
   ```

   Save the printed `board.id`; that value becomes the embed script's `data-board-id`. Running the
   command again updates the board name and keeps the same repo-backed board id.

9. Deploy the Worker:

   ```bash
   npm run deploy:production
   ```

10. Verify the deployed surface:

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
- `npm run doctor:selfhost` passes for the intended Worker URL, host origin, repo, board id, and
  token endpoint.
- `npm run deploy:check:production`, `npm run validate`, `npm run test:e2e`, and `make check` pass
  before deploy.

For an installer-facing closed-beta sequence, use the
[Closed Beta Setup Checklist](docs/closed-beta-setup.md). Before inviting a beta user, walk through
the [Closed Beta Runbook](docs/closed-beta-runbook.md), complete the
[Closed Beta Dogfood Script](docs/closed-beta-dogfood-script.md), check
[Closed Beta Readiness](docs/closed-beta-readiness.md), review the
[Closed Beta Ops Runbook](docs/closed-beta-ops-runbook.md), make the
[Closed Beta Final Acceptance](docs/closed-beta-final-acceptance.md) decision, and share
[Closed Beta Risks](docs/closed-beta-risks.md).

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

For an inline board inside existing page content, provide a mount target and point the script at it:

```html
<section id="feedback-board"></section>
<script
  src="https://your-worker.example.com/board.js"
  data-board-id="board_mean_weasel_demo"
  data-api-url="https://your-worker.example.com"
  data-token-endpoint="/api/bugdrop-board-token"
  data-mount-selector="#feedback-board"
></script>
```

You can serve `board.js` from your deployed Worker, or install the npm package and copy or serve the
published bundle from one of its equivalent entrypoints:

- `@mean-weasel/bugdrop-board`
- `@mean-weasel/bugdrop-board/board`
- `@mean-weasel/bugdrop-board/board.js`

For npm-based installs, the browser script file is installed at:

```text
node_modules/@mean-weasel/bugdrop-board/public/board.js
```

Copy that file into your host app's static assets or serve it from your own asset pipeline, then
point the script `src` at the URL where your app serves the copied bundle. The npm package contains
the embedded widget bundle only; it does not provision D1, deploy the Worker, or replace the
self-host Worker setup above.

Attributes:

- `data-board-id`: D1 board id. Current ids are generated from repo owner/name, for example
  `board_mean_weasel_demo`.
- `data-api-url`: Worker API origin. Defaults to the script origin when omitted.
- `data-token-endpoint`: host app endpoint that returns a board token for the current app user.
- `data-mount-selector`: optional CSS selector for a host page element that should contain the
  widget. The widget throws a clear setup error if the selector does not match.
- `data-poll-interval`: optional polling interval in milliseconds. Values below `500` are ignored.
- `data-color`: optional accent color for widget controls. Defaults to `#2563eb`.
- `data-layout`: optional layout mode, `inline` or `panel`. Defaults to `inline`.
- `data-density`: optional density mode, `compact`, `comfortable`, or `spacious`. Defaults to
  `comfortable`.
- `data-config-selector`: optional CSS selector for an `application/json` config element that
  provides deeper `copy`, `layout`, `density`, and `theme` customization.

The widget runs in an open Shadow DOM root. By default, when the script is in the page body, it
inserts its generated root immediately after the script tag, which keeps the board near the install
snippet. If the script is outside body content, it falls back to appending to the body. When
`data-mount-selector` is provided, the generated root is appended inside that target element.

Host CSS does not style internals directly. That keeps the embedded board from accidentally
breaking when it is installed in a user's app. Use the stable customization contract instead:

```html
<section id="feedback-board"></section>
<script type="application/json" id="bugdrop-board-config">
  {
    "layout": "panel",
    "density": "compact",
    "copy": {
      "heading": "Roadmap queue",
      "titleLabel": "Request",
      "titlePlaceholder": "Short operational request",
      "descriptionLabel": "Business context",
      "descriptionPlaceholder": "Who needs this and why?",
      "submitLabel": "Add request",
      "emptyLabel": "No requests yet.",
      "upvoteLabel": "Prioritize",
      "upvotedLabel": "Prioritized"
    },
    "theme": {
      "accent": "#0f766e",
      "accentSoft": "#ccfbf1",
      "background": "#ffffff",
      "border": "#cbd5e1",
      "buttonRadius": "4px",
      "fieldRadius": "4px",
      "fontSize": "13px",
      "headingSize": "18px",
      "itemRadius": "4px",
      "maxWidth": "640px",
      "muted": "#475569",
      "radius": "4px",
      "surfaceAlt": "#f8fafc",
      "text": "#0f172a"
    }
  }
</script>
<script
  src="https://your-worker.example.com/board.js"
  data-board-id="board_mean_weasel_demo"
  data-api-url="https://your-worker.example.com"
  data-token-endpoint="/api/bugdrop-board-token"
  data-mount-selector="#feedback-board"
  data-config-selector="#bugdrop-board-config"
></script>
```

`data-color` remains the easiest accent path for script-tag installs and maps to
`theme.accent`. Existing embeds do not need to add `data-config-selector`.

Stable copy keys:

- `heading`
- `titleLabel`
- `titlePlaceholder`
- `descriptionLabel`
- `descriptionPlaceholder`
- `submitLabel`
- `submittingLabel`
- `loadingLabel`
- `emptyLabel`
- `errorTitle`
- `retryLabel`
- `issuePrefix`
- `upvoteLabel`
- `upvotedLabel`

Stable theme keys:

```css
[data-bugdrop-board-root] {
  --bugdrop-board-accent: #1f883d;
  --bugdrop-board-accent-text: #ffffff;
  --bugdrop-board-accent-soft: #e6f4ea;
  --bugdrop-board-background: transparent;
  --bugdrop-board-surface: #ffffff;
  --bugdrop-board-surface-alt: #f6f8fa;
  --bugdrop-board-text: #172026;
  --bugdrop-board-muted: #57606a;
  --bugdrop-board-border: #d0d7de;
  --bugdrop-board-danger: #b42318;
  --bugdrop-board-focus: #0969da;
  --bugdrop-board-font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  --bugdrop-board-font-size: 14px;
  --bugdrop-board-heading-size: 20px;
  --bugdrop-board-line-height: 1.4;
  --bugdrop-board-max-width: 760px;
  --bugdrop-board-radius: 8px;
  --bugdrop-board-item-radius: 8px;
  --bugdrop-board-field-radius: 6px;
  --bugdrop-board-button-radius: 6px;
  --bugdrop-board-border-width: 1px;
  --bugdrop-board-gap: 10px;
  --bugdrop-board-padding: 0;
  --bugdrop-board-item-padding: 12px;
  --bugdrop-board-field-padding: 8px 10px;
  --bugdrop-board-button-padding: 8px 10px;
  --bugdrop-board-shadow: none;
  --bugdrop-board-item-shadow: none;
  --bugdrop-board-button-background: #1f883d;
  --bugdrop-board-button-text: #ffffff;
  --bugdrop-board-button-border: transparent;
  --bugdrop-board-upvote-background: #1f883d;
  --bugdrop-board-upvote-text: #ffffff;
  --bugdrop-board-upvote-border: transparent;
  --bugdrop-board-field-background: #ffffff;
  --bugdrop-board-field-text: #172026;
}
```

The JSON `theme` object uses the camelCase names above without the `--bugdrop-board-` prefix. For
example, `buttonRadius` maps to `--bugdrop-board-button-radius`. Values are only applied for known
keys and are ignored if they contain stylesheet-breaking characters such as `{`, `}`, `<`, `>`, or
`;`.

### Customization Examples

For screenshot-ready examples across five host-app aesthetics, see
[Custom UX Examples](docs/marketing/custom-ux-examples.md).

Compact SaaS:

```json
{
  "layout": "panel",
  "density": "compact",
  "copy": {
    "heading": "Roadmap queue",
    "submitLabel": "Add request",
    "upvoteLabel": "Prioritize",
    "upvotedLabel": "Prioritized"
  },
  "theme": {
    "accent": "#0f766e",
    "border": "#cbd5e1",
    "radius": "4px",
    "itemRadius": "4px",
    "maxWidth": "640px"
  }
}
```

Soft community:

```json
{
  "layout": "panel",
  "density": "comfortable",
  "copy": {
    "heading": "Community ideas",
    "submitLabel": "Share idea",
    "issuePrefix": "Tracked as #",
    "upvoteLabel": "Cheer",
    "upvotedLabel": "Cheered"
  },
  "theme": {
    "accent": "#9f1239",
    "accentSoft": "#ffe4e6",
    "background": "#fffaf5",
    "fontFamily": "Georgia, serif",
    "itemRadius": "16px",
    "shadow": "0 18px 50px rgba(79, 46, 19, 0.12)"
  }
}
```

High contrast:

```json
{
  "layout": "panel",
  "density": "spacious",
  "copy": {
    "heading": "Accessibility requests",
    "submitLabel": "Submit access request",
    "retryLabel": "Try loading again",
    "upvoteLabel": "Support",
    "upvotedLabel": "Supported"
  },
  "theme": {
    "accent": "#ffd400",
    "accentText": "#000000",
    "background": "#000000",
    "border": "#ffffff",
    "borderWidth": "2px",
    "fieldBackground": "#000000",
    "fieldText": "#ffffff",
    "focus": "#00ffff",
    "surface": "#000000",
    "text": "#ffffff"
  }
}
```

## Host Token Endpoint

The host app endpoint must return JSON:

```json
{ "token": "payload.signature" }
```

The widget calls this endpoint from the browser with `fetch(tokenEndpoint, { credentials: "include"
})`, so cookie-based host sessions work as long as the endpoint is same-origin with the host page or
has the host's normal credentialed-CORS behavior. The endpoint must run on the host app backend; do
not sign tokens in browser code.

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

Minimal Node helper:

```js
import { createHmac } from 'node:crypto';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signBoardToken(claims, secret) {
  const payload = base64url(JSON.stringify(claims));
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
```

Express-style endpoint:

```js
app.get('/api/bugdrop-board-token', requireSignedInUser, (req, res) => {
  const token = signBoardToken(
    {
      boardId: 'board_owner_repo',
      externalUserId: req.user.id,
      displayName: req.user.name,
      exp: Math.floor(Date.now() / 1000) + 5 * 60,
      aud: 'bugdrop-board',
      iss: 'your-host-app',
    },
    process.env.BOARD_TOKEN_SECRET
  );

  res.json({ token });
});
```

Next.js App Router route handler:

```js
export async function GET() {
  const user = await requireSignedInUser();
  const token = signBoardToken(
    {
      boardId: 'board_owner_repo',
      externalUserId: user.id,
      displayName: user.name,
      exp: Math.floor(Date.now() / 1000) + 5 * 60,
      aud: 'bugdrop-board',
      iss: 'your-host-app',
    },
    process.env.BOARD_TOKEN_SECRET
  );

  return Response.json({ token });
}
```

Use a short expiry, usually five minutes or less for closed beta, and keep `externalUserId` stable
for the signed-in host user. If the host page and token endpoint are on different origins, configure
the host endpoint's own credentialed CORS policy for that request; BugDrop Board's
`ALLOWED_ORIGINS` controls calls to the board Worker, not calls to your host app token endpoint.
The Worker rejects tokens whose `exp` is more than `BOARD_TOKEN_MAX_TTL_SECONDS` in the future; the
closed-beta default is `300` seconds.

## GitHub Mirroring

For normal development and deployed use, set `GITHUB_ISSUE_ACCESS_TOKEN` as a Worker secret or in
local `.dev.vars`. The token must be able to create issues in the repo represented by the board.
For closed beta, prefer a fine-grained GitHub token scoped only to the provisioned board repo with
**Issues: Read and write** permission. Avoid broad account or organization tokens; the Worker trusts
the provisioned board row's repo owner/name when creating issues, so an over-scoped token increases
the blast radius of a misprovisioned board.

When using GitHub Actions environment secrets for the deploy workflow, store the issue token as
`ISSUE_ACCESS_TOKEN`; GitHub secret names cannot start with `GITHUB_`. The workflow maps that
accepted secret name back to the deployed Worker secret variable `GITHUB_ISSUE_ACCESS_TOKEN`.

When a board item is created, BugDrop Board creates a GitHub Issue first. If GitHub issue creation
fails, the D1 board item is not stored.

## Request Throttling

BugDrop Board includes D1-backed throttling for the embedded board APIs. The default limits are per
board, per signed host user, per action:

- item creation: `5` requests per window;
- upvote toggling: `60` requests per window;
- item reads: `120` requests per window;
- event polls: `180` requests per window;
- window size: `60` seconds.

Configure these non-secret Worker vars in `wrangler.toml`:

```toml
REQUEST_THROTTLE_WINDOW_SECONDS = "60"
ITEM_CREATE_RATE_LIMIT = "5"
UPVOTE_RATE_LIMIT = "60"
ITEM_READ_RATE_LIMIT = "120"
EVENTS_POLL_RATE_LIMIT = "180"
```

When a user exceeds a limit, the API returns `429` with a `Retry-After` header. Read and event
limits return no board data. Write limits do not run the write side effect. Item creation is
throttled before GitHub Issue creation, so over-limit requests do not create GitHub Issues.

Use positive integer values. Invalid or missing values fall back to the safe defaults above. Higher
limits are useful for trusted internal testing; lower limits are useful for public boards that need
more conservative protection.

Event payloads returned by the polling API intentionally omit stable host user ids. The Worker still
uses `externalUserId` internally for per-user upvote uniqueness and throttling, but other board
viewers should not receive that stable id through `/events`.

## Cloudflare Configuration

`wrangler.toml` defines:

- Worker entrypoint: `src/index.ts`
- Static asset binding: `ASSETS` from `public`
- D1 binding: `DB`
- Local database name: `bugdrop-board-dev`
- Worker defaults: `ENVIRONMENT`, `ALLOWED_ORIGINS`, `BOARD_TOKEN_AUDIENCE`,
  `BOARD_TOKEN_ISSUER`, and `BOARD_TOKEN_MAX_TTL_SECONDS`
- Request throttling defaults: `REQUEST_THROTTLE_WINDOW_SECONDS`, `ITEM_CREATE_RATE_LIMIT`,
  `UPVOTE_RATE_LIMIT`, `ITEM_READ_RATE_LIMIT`, and `EVENTS_POLL_RATE_LIMIT`

Keep secrets out of `wrangler.toml`. For local development, use `.dev.vars`. For deployed
environments, set secrets with:

```bash
   npx wrangler secret put BOARD_TOKEN_SECRET --env production
   npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN --env production
```

For deployed D1 migrations, use:

```bash
npx wrangler d1 migrations apply DB --remote --env production
```

To check deploy packaging without uploading the Worker, use:

```bash
npm run deploy:check:production
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
   npx wrangler secret put BOARD_TOKEN_SECRET --env production
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

Rollback: put the previous value back with
`npx wrangler secret put BOARD_TOKEN_SECRET --env production`, then restore the host app signer to
the same previous value.

Rotate `GITHUB_ISSUE_ACCESS_TOKEN` when the GitHub token may be exposed, expires, or repo access
changes:

1. Create a replacement GitHub token that can create issues in the repo used by the provisioned
   board. For fine-grained tokens, give the target repo **Issues: Read and write** access.
2. Replace the deployed Worker secret:

   ```bash
   npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN --env production
   ```

3. Confirm the board still points at the expected repo:

   ```bash
   npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --remote --env production
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
`npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN --env production`, then create a test item to
confirm GitHub mirroring works again.

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
- Optional for hosted GitHub App mirroring: `BOARD_GITHUB_APP_ID` and
  `BOARD_GITHUB_APP_PRIVATE_KEY`. The workflow maps these GitHub-safe secret names to the deployed
  Worker secrets `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`; set both or neither.

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
5. Enter `smoke_url`, such as `https://bugdrop-board.example.workers.dev`, to verify the deployed
   `/health` and `/board.js` endpoints after deployment. Production promotions require this value.
6. Optionally enter `smoke_expect_environment` when the Worker `ENVIRONMENT` value differs from the
   GitHub Environment name. Leave it blank to expect the selected GitHub Environment, such as
   `production`.
7. Optionally enter all browser CORS smoke inputs to prove embedded browser access:
   `smoke_cors_origin`, `smoke_cors_disallowed_origin`, `smoke_cors_board_id`, and
   `smoke_cors_token_endpoint`.

The workflow runs:

```bash
npm run validate
npm run build:widget
npx wrangler deploy --dry-run --env production
npx wrangler d1 migrations apply DB --remote --env production
npm run provision:board -- --repo owner/name --remote --env production
npx wrangler deploy --secrets-file .deploy.secrets --env production
npm run deploy:smoke -- --url https://bugdrop-board.example.workers.dev --expect-environment production [--cors-origin https://app.example.com --cors-disallowed-origin https://evil.example --cors-board-id board_owner_repo --cors-token-endpoint https://app.example.com/api/board-token]
```

For staging or another target, replace `production` with the matching Wrangler environment. If
`wrangler_environment` is blank, the workflow defaults it to the selected GitHub Environment. A
production GitHub Environment may only use Wrangler environment `production`, which prevents
production secrets from falling through to the top-level development Wrangler config.

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
npm run deploy:smoke -- \
  --url https://bugdrop-board.example.workers.dev \
  --expect-environment production \
  --cors-origin https://app.example.com \
  --cors-disallowed-origin https://evil.example \
  --cors-board-id board_owner_repo \
  --cors-token-endpoint https://app.example.com/api/board-token
```

Then open a signed-in host app page, create a test item, confirm the matching GitHub Issue appears,
and confirm another viewer can read or upvote the item.
The disallowed-origin smoke proves browser containment only. Bearer token verification remains the
authorization boundary for Worker API access.

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
- `scripts/verify-clean-room-install.js`
- `scripts/verify-clean-room-install-core.js`
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
npm run release:smoke -- --version 0.2.0
npm run install:smoke -- --version 0.2.0
make release-smoke
```

The smoke command resolves all public package entrypoints, verifies they point at the installed
`public/board.js` bundle, and checks the bundle has the expected widget and fetch code. The package
workflow runs this smoke automatically after a non-dry-run publish with a longer retry window to
allow npm registry propagation.

`npm run install:smoke` goes one step further: it installs the published package into a temporary
project, serves only the installed `public/board.js`, loads a minimal host page in Chromium with the
documented script attributes, mocks the token/items API responses, and verifies the board mounts
inside `data-mount-selector`.

The `Install Smoke` GitHub Actions workflow exposes the same clean-room check as a manual,
no-secret proof. It defaults to the `latest` dist-tag, currently `0.2.0`, and can also be dispatched
with an explicit package version. Use it when you want GitHub Actions to verify the installable
artifact without running npm publish, Cloudflare deploy, or any production credentials. To verify
the workflow contract locally, run:

```bash
npm run install:smoke:workflow
```

To verify the package from a completely separate project, run:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
npm init -y
npm install @mean-weasel/bugdrop-board@0.2.0
test -f node_modules/@mean-weasel/bugdrop-board/public/board.js
node -e "require.resolve('@mean-weasel/bugdrop-board/board.js'); require.resolve('@mean-weasel/bugdrop-board/board')"
```

This proves the published package can be installed without this repository checkout and that the
documented static bundle path exists.

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
npm run release:smoke -- --retries 30 --retry-delay-ms 10000
```

The current published package is `@mean-weasel/bugdrop-board@0.2.0`, tagged `latest`. Future
publishing still requires npm ownership or publish rights for the configured package scope plus
explicit maintainer approval. When in doubt, keep the workflow in dry-run mode and inspect the
package file list before publishing.

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

This proves the local D1 provisioning path, package dry-run, top-level Worker deploy dry-run,
embedded widget smoke, unit/type/lint checks, knip, critical audit, and GitHub Actions version guard
without requiring Cloudflare or npm production credentials. For closed-beta production config, also
run `npm run deploy:check:production` after the production D1 binding and Worker vars are set.

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

For the full staging sequence, use [Staging Dogfood](docs/staging-dogfood.md). For the real
`bugdrop.dev` embedded-host proof, use [Production Dogfood](docs/production-dogfood.md).
For closed-beta handoff, use [Closed Beta Runbook](docs/closed-beta-runbook.md) and record proof
with [Closed Beta Dogfood Script](docs/closed-beta-dogfood-script.md).

Do not publish to npm or deploy to production until the version, npm package ownership, Cloudflare
account, GitHub token scope, host app origins, and token issuer/audience values are final.

## Verification

Run the standard checks before handing off changes:

```bash
npm run release:rehearsal
npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --local
npm run build:widget
npm run pack:check
npm run deploy:check:production
npm run deploy:smoke -- \
  --url https://board.bugdrop.dev \
  --expect-environment production \
  --cors-origin https://bugdrop.dev \
  --cors-board-id board_mean_weasel_bugdrop_board_production_dogfood \
  --cors-token-endpoint "https://bugdrop.dev/api/bugdrop-board-token?viewer=a"
DEPLOY_SMOKE_URL=https://board.bugdrop.dev DEPLOY_SMOKE_EXPECT_ENVIRONMENT=production make deploy-smoke
npm run test:e2e
npm run validate
make check
```

## Current Handoff Notes

This repository is still an early vertical slice. The conveyor PR stack has landed on `main`,
`@mean-weasel/bugdrop-board@0.2.0` is the currently published npm `latest`, and the production Worker
is available at `https://board.bugdrop.dev`.

The customization-capable Worker is dogfooded in production, and `0.2.0` has been published and
install-smoked. Do not run a future non-dry-run `Package Widget` workflow until a version PR has
merged, a main-branch package dry-run passes, and the maintainer explicitly approves the specific
package version and dist-tag.

Remaining release actions are operational: keep running the local release rehearsal before
significant changes, run the GitHub workflows against staging/test credentials when changing deploy
or package release paths, dogfood the embedded widget in the real signed-token host app at
`https://bugdrop.dev` against the board Worker at `https://board.bugdrop.dev`, and keep publish
approval explicit before any future npm publish.

Closed-beta handoff artifacts:

- [Closed Beta Setup Checklist](docs/closed-beta-setup.md)
- [Closed Beta Runbook](docs/closed-beta-runbook.md)
- [Closed Beta Dogfood Script](docs/closed-beta-dogfood-script.md)
- [Closed Beta Readiness](docs/closed-beta-readiness.md)
- [Closed Beta Ops Runbook](docs/closed-beta-ops-runbook.md)
- [Closed Beta Final Acceptance](docs/closed-beta-final-acceptance.md)
- [Closed Beta Risks](docs/closed-beta-risks.md)
