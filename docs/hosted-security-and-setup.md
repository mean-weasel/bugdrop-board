# BugDrop Hosted Beta Security And Setup

BugDrop Hosted Beta is the BugDrop-run board service for apps that want the embedded feedback board
without self-hosting the Cloudflare Worker and D1 database. It is invite/manual provisioning for
closed beta, not yet a broad multi-tenant hosted SaaS control plane.

Self-hosters still run their own Worker, D1 database, Worker secrets, and GitHub issue token. Hosted
beta users bring their app, their signed-in users, and a GitHub repo for mirrored feedback issues.

## Security Promise Today

BugDrop protects the board API with host-signed, short-lived bearer tokens. The host app signs a
token only after its own user is authenticated, and BugDrop verifies that token before reads, item
creation, upvotes, or polling events.

Current controls:

- Board-scoped tokens: each token includes the `boardId` the user may access.
- Stable host user ids: each token includes `externalUserId`; BugDrop uses it for one upvote per
  user per idea and per-user throttling.
- Short TTL: `exp` must be no more than the configured max TTL in the future. The current default is
  `300` seconds.
- Optional audience and issuer checks: tokens may include `aud` and `iss`, which must match the
  hosted Worker settings when configured.
- Exact origin allowlist: hosted Worker CORS only allows configured app origins, such as
  `https://bugdrop.dev` and `https://board.bugdrop.dev` for the current dogfood install.
- CORS is browser containment only: bearer-token verification is the authorization boundary.
- Backend-only signing secret: `BOARD_TOKEN_SECRET` never belongs in browser code, HTML, screenshots,
  logs, or the embed script.
- Per-board, per-user throttles: item creation, upvotes, reads, and event polling have D1-backed
  rate limits. The current defaults are `5`, `60`, `120`, and `180` requests per `60` seconds.
- GitHub mirroring: new items create a GitHub Issue first; if issue creation fails, the D1 board item
  is not stored.
- Event privacy: polling event payloads omit stable host user ids.

BugDrop does not need app passwords, app session cookies, or the host app user database. The host app
keeps owning login, session security, and the token endpoint.

## What Your App Provides

The host app must provide:

- signed-in users before the board token endpoint returns a token;
- a backend token endpoint that returns `{ "token": "payload.signature" }`;
- stable `externalUserId` values for signed-in users;
- token claims that match the provisioned `boardId`, token audience, token issuer, and max TTL;
- normal credentialed-CORS behavior for the token endpoint if it is not same-origin with the host
  page;
- an embed script and mount target in the app surface where the board should appear;
- a GitHub repo choice for mirrored issues.

For hosted beta, BugDrop coordinates the board id, allowed origins, token audience, token issuer, and
GitHub mirror repo with the installer during manual provisioning.

## Settings You Configure

Configure these in the host app embed:

| Setting        | Where                  | Notes                                                              |
| -------------- | ---------------------- | ------------------------------------------------------------------ |
| Board id       | `data-board-id`        | Must match the provisioned board id and signed token `boardId`.    |
| API URL        | `data-api-url`         | Hosted beta points at the BugDrop-hosted Worker origin.            |
| Token endpoint | `data-token-endpoint`  | Host app backend endpoint that returns `{ token }`.                |
| Mount target   | `data-mount-selector`  | Optional host element where the board should render.               |
| Poll interval  | `data-poll-interval`   | Optional milliseconds. Values below `500` are ignored.             |
| Accent color   | `data-color`           | Quick color customization; maps to `theme.accent`.                 |
| Layout         | `data-layout`          | `inline`, `panel`, or `kanban`.                                    |
| Density        | `data-density`         | `compact`, `comfortable`, or `spacious`.                           |
| JSON config    | `data-config-selector` | Optional deeper copy, layout, density, composer, and theme config. |

JSON config supports:

- `composer`: `inline` or `collapsed`;
- `emptyLaneDisplay`: `visible`, `compact`, or `hidden`;
- `issueLinks`: `visible` or `hidden`;
- `copy`: stable labels such as `heading`, `description`, `submitLabel`, `emptyLabel`,
  `errorTitle`, `retryLabel`, `issuePrefix`, `upvoteLabel`, and `upvotedLabel`;
- `theme`: known visual tokens such as `accent`, `background`, `surface`, `text`, `muted`, `border`,
  `fontFamily`, `fontSize`, `headingSize`, `radius`, `itemRadius`, `buttonRadius`, `maxWidth`,
  `shadow`, `buttonBackground`, `buttonText`, `upvoteBackground`, and field colors.

See the README customization section for the full current key list and examples.

## Settings BugDrop Configures

For BugDrop Hosted Beta, BugDrop configures:

- the hosted Worker origin and `board.js` asset URL;
- exact `ALLOWED_ORIGINS` for approved host app origins;
- the D1 board row and board-to-GitHub repo mapping;
- `BOARD_TOKEN_AUDIENCE`, `BOARD_TOKEN_ISSUER`, and `BOARD_TOKEN_MAX_TTL_SECONDS`;
- request throttle defaults;
- the hosted Worker secrets, including GitHub App credentials used server-side only;
- the GitHub App installation metadata used to create issues in the mirrored repo.

For GitHub Actions deployments, store hosted GitHub App credentials as `BOARD_GITHUB_APP_ID` and
`BOARD_GITHUB_APP_PRIVATE_KEY` because GitHub secret names cannot start with `GITHUB_`. The deploy
workflow maps them to Worker secrets `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.

Operators should prepare hosted config with a dry run first:

```bash
npm run provision:hosted-board -- \
  --tenant-slug mean-weasel \
  --tenant-name "Mean Weasel" \
  --app-slug dogfood \
  --app-name "Dogfood" \
  --repo mean-weasel/demo \
  --origin https://bugdrop.dev \
  --origin https://board.bugdrop.dev \
  --issuer https://bugdrop.dev \
  --audience bugdrop-board \
  --verifier-type jwks \
  --jwks-url https://bugdrop.dev/.well-known/jwks.json \
  --github-installation-id 123456 \
  --github-account-login mean-weasel \
  --api-url https://board.bugdrop.dev \
  --token-endpoint /api/bugdrop-board-token \
  --layout kanban \
  --density compact \
  --dry-run
```

The dry run prints SQL plus a redacted handoff containing the embed snippet and setup checklist. To
apply it, remove `--dry-run` and choose the target D1 mode, for example `--remote --env production`.
The command does not create GitHub Apps, rotate credentials, or deploy Workers.

For a migration or dogfood install that intentionally uses BugDrop Board's legacy HMAC token shape,
pass `--verifier-type hmac_legacy` and omit `--jwks-url`. That mode records `BOARD_TOKEN_SECRET` as
the verifier secret reference; it does not print or rotate the secret. Hosted HMAC tokens must include
the provisioned `tenantId`, `appId`, and `boardId` claims so the hosted Worker can fail closed on
tenant, app, or board drift.

## Recommended Defaults

Use these defaults unless the beta install has a specific reason to change them:

- token `exp` no more than five minutes in the future;
- exact app origins only, never wildcard origins for a deployed board;
- poll interval at or above `750` ms for demo-style installs, and higher for quieter production
  surfaces;
- one board per app repo;
- upvotes only, with one upvote per signed-in host user per idea;
- GitHub App installation metadata must match the repo represented by the board;
- no secrets in browser code, committed files, receipts, screenshots, logs, or app config visible to
  users.

## Current Limitations

Hosted beta currently does not provide:

- self-service tenant admin UI or hosted control plane;
- self-service board provisioning, origin management, GitHub connection, or token issuer management;
- billing, plans, or tenant-level entitlement enforcement;
- realtime transport; polling is the current update path;
- comments, downvotes, status workflow, or GitHub Projects integration;
- built-in tenant audit log, analytics, monitoring, alerting, backup/export/restore, or incident
  tooling;
- generalized multi-tenant isolation guarantees beyond the current manually provisioned hosted beta
  setup.

Those items belong in the follow-on hosted control-plane design and implementation boards.

## Go/No-Go Checklist

Before using a hosted beta board with real users, confirm:

- the host page origin is in the hosted Worker allowlist;
- the host token endpoint only returns tokens for signed-in users;
- token `boardId`, `aud`, `iss`, and `exp` match the hosted Worker expectations;
- `externalUserId` is stable for each signed-in user;
- the embed script uses the provisioned `data-board-id`, `data-api-url`, and `data-token-endpoint`;
- creating an item creates the matching GitHub Issue;
- two signed-in viewers can see the same board and observe upvote changes after polling;
- browser source, network logs, screenshots, and receipts do not expose secrets.

## Follow-On Work

The hosted control-plane design board has already run. The next hosted-beta board should be a
first external hosted tenant invite gate: select a real tenant/app target, choose JWKS/public-key
verification or explicitly accept the dogfood-only HMAC legacy verifier, install the GitHub App on
the intended repo, run the hosted dogfood script from the target host page, and record a redacted
go/conditional-go/no-go receipt.

True hosted SaaS layers still belong in later product boards: self-service tenant admin,
origin/token/GitHub connection management, billing, audit logs, monitoring, backup/export/restore,
and incident tooling.
