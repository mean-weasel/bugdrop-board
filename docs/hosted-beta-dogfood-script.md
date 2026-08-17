# Hosted Beta Dogfood Script

Use this script before inviting the first non-dogfood hosted beta tenant. It assumes the local
security gate is green and keeps real deploys, remote D1 mutation, and credential changes as explicit
operator decisions.

## 1. Confirm Local Gate

Run:

```bash
npm run test -- test/hosted-beta-security-gate.test.ts test/routes.test.ts test/hosted-token-verifier.test.ts
npm run validate
make check
```

Expected:

- hosted CORS allows configured origins and omits CORS headers for unconfigured origins;
- hosted tokens fail closed for wrong issuer, audience, tenant, app, board, key, and excessive TTL;
- GitHub repo mismatch fails before item/event persistence;
- item reads and event polling return `429` with retry metadata when throttled;
- event payloads do not expose signed host user ids or display names.

## 2. Prepare Hosted Config

Confirm the deployed Worker has server-side GitHub App credentials before creating live items. In
GitHub Actions environments these are named `BOARD_GITHUB_APP_ID` and
`BOARD_GITHUB_APP_PRIVATE_KEY`; the deploy workflow maps them to Worker secrets `GITHUB_APP_ID` and
`GITHUB_APP_PRIVATE_KEY`.

GitHub may download App private keys as `BEGIN RSA PRIVATE KEY` (PKCS#1). The Worker accepts that
format as well as `BEGIN PRIVATE KEY` (PKCS#8), so operators should not manually paste or convert key
material in receipts.

Dry-run the hosted provisioner first:

```bash
npm run provision:hosted-board -- \
  --tenant-slug example-tenant \
  --tenant-name "Example Tenant" \
  --app-slug example-app \
  --app-name "Example App" \
  --repo owner/repo \
  --origin https://app.example.com \
  --issuer https://app.example.com \
  --audience bugdrop-board \
  --jwks-url https://app.example.com/.well-known/jwks.json \
  --github-installation-id 123456 \
  --api-url https://board.bugdrop.dev \
  --token-endpoint /api/bugdrop-board-token \
  --layout kanban \
  --composer collapsed \
  --empty-lane-display visible \
  --issue-links hidden \
  --dry-run
```

Expected:

- output includes SQL, the stable board id, a script embed snippet, and a security checklist;
- output does not include private keys, bearer tokens, GitHub installation tokens, or HMAC secrets;
- `data-board-id`, `data-api-url`, `data-token-endpoint`, and all presentation attributes match the
  intended host app.

Only after operator review, apply to the selected environment, for example:

```bash
npm run provision:hosted-board -- [same options] --remote --env production
```

## 3. Verify Host Token Endpoint

In the host app:

- require a signed-in user before returning a board token;
- sign `iss`, `aud`, `boardId`, `tenantId`, `appId`, `externalUserId`, and `exp`;
- keep `exp` no more than five minutes in the future;
- return only `{ "token": "..." }`;
- do not expose signing keys, private keys, or GitHub credentials to the browser.

Negative checks:

- unauthenticated host users receive no board token;
- a token with the wrong issuer, audience, board, tenant, or app is rejected by the board API;
- a token beyond the max TTL is rejected.

## 4. Verify Browser CORS And Embed

From the approved host origin:

- load the page containing the hosted board embed;
- confirm the board script loads from the hosted Worker origin;
- confirm the board API responses include `Access-Control-Allow-Origin` for the approved host
  origin.

From an unapproved origin:

- send an `OPTIONS` request to the board items endpoint;
- confirm the response does not include `Access-Control-Allow-Origin`.

## 5. Verify User Workflow

Use two signed-in host users.

Viewer A:

- loads the embedded board;
- creates a uniquely named feedback item;
- confirms the item appears on the board.

Operator:

- confirms the matching GitHub Issue was created in the configured repo;
- confirms no issue was created in any other repo.

Viewer B:

- loads the same board;
- sees Viewer A's item after polling;
- upvotes the item once;
- confirms a second upvote from the same signed-in user toggles/removes the upvote instead of
  double-counting.

Privacy check:

- event polling responses must not contain host external user ids, display names, emails, bearer
  tokens, private keys, or GitHub tokens.

## 6. Go/No-Go

Go only when all of these are true:

- local security gate is green;
- hosted provisioning dry-run output was reviewed before apply;
- approved origins are exact and no wildcard origin is used;
- host token endpoint requires login and signs short-lived scoped tokens;
- GitHub App installation is active on the configured repo;
- create, read, upvote, polling, CORS negative, token negative, and privacy checks pass;
- all proof is recorded without secrets.

No-go if any credential, token, private key, host user id, display name, or email appears in public
logs, receipts, screenshots, event payloads, or browser-visible config.
