# BugDrop Board Hosted Control Plane Design

## Summary

BugDrop Board can support closed hosted beta with manual provisioning today, but true hosted mode
needs a control-plane layer before multiple real tenants use the same BugDrop-run Worker, D1
database, GitHub integration, and deployment.

The recommended hosted architecture is:

```text
tenant -> app -> board
host app signed user -> short-lived board token -> hosted Worker
hosted Worker -> per-app token verifier config -> board APIs
hosted Worker -> per-board GitHub App installation -> GitHub Issues
hosted Worker -> tenant-scoped D1 rows, audit events, throttles
```

Use per-app asymmetric token verification through issuer/audience/JWKS as the hosted default. Use a
GitHub App installation per tenant or app for issue creation. Preserve the current self-host HMAC
token and personal-access-token path for operators running their own Worker.

## Current State

Current implementation is board-scoped:

- `boards` maps a board id to one GitHub repo owner/name.
- `board_items`, `board_votes`, `board_events`, and `request_throttle_windows` all scope by
  `board_id`.
- API auth verifies an HMAC token using global Worker settings: `BOARD_TOKEN_SECRET`,
  `BOARD_TOKEN_AUDIENCE`, `BOARD_TOKEN_ISSUER`, and `BOARD_TOKEN_MAX_TTL_SECONDS`.
- CORS uses global `ALLOWED_ORIGINS`.
- GitHub issue creation uses one Worker secret, `GITHUB_ISSUE_ACCESS_TOKEN`.
- Board provisioning is an operator script that upserts one board from `owner/name`.

That is acceptable for self-hosting and manual dogfood. It is not enough for hosted SaaS because
tenant identity, origin allowlists, token trust, GitHub credentials, support boundaries, and audit
history are not first-class data.

## Goals

- Provide a hosted board that an installing user can embed without self-hosting Cloudflare or D1.
- Keep host apps in charge of user login and session security.
- Prove tenant, app, board, origin, token, and GitHub repo boundaries in tests.
- Keep GitHub credentials tenant-scoped and revocable.
- Preserve self-hosting as a first-class path.
- Keep the MVP small enough to build after this design is approved.

## Non-Goals

- No billing or plan enforcement in the MVP.
- No realtime transport; polling remains the update model.
- No comments, downvotes, GitHub Projects, or status workflow.
- No product analytics dashboard.
- No automated backup/export/restore implementation in the first scaffold.
- No requirement for customers to share app passwords, session cookies, or raw user databases.

## Trust Boundaries

### Host App

The host app owns:

- authenticating app users;
- deciding which signed-in users may see the board;
- exposing a backend token endpoint;
- keeping app sessions, cookies, and user databases private;
- providing stable `externalUserId` values.

The host app must never expose private signing keys or shared secrets to browser code.

### Browser Embed

The browser embed owns:

- rendering the board inside the host app;
- requesting short-lived tokens from the host token endpoint;
- sending bearer tokens to the BugDrop Worker;
- polling for updates.

The browser embed is not trusted for user identity, board id authorization, tenant id, repo id, or
rate-limit identity.

### BugDrop Hosted Worker

The hosted Worker owns:

- looking up board/app/tenant config by `boardId`;
- enforcing origin allowlists for browser containment;
- verifying bearer tokens against the board's app config;
- enforcing token TTL, issuer, audience, app, and board claims;
- enforcing D1-backed throttles;
- creating GitHub Issues through the board's GitHub App installation;
- writing board state, votes, events, and audit records.

The Worker must fail closed when tenant, app, board, origin, token, or repo data does not match.

### GitHub

GitHub owns repository authorization. BugDrop should use GitHub App installations rather than broad
shared access tokens for hosted tenants. Installation access tokens should be short-lived and
derived per request or cached only within a narrow Cloudflare-compatible lifetime.

## Threat Model

| Threat                  | Risk                                                       | Required Control                                                                                                  |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cross-tenant board read | Tenant A token reads Tenant B board                        | Board config lookup must bind `boardId` to app and tenant; token verifier must require matching app/board claims. |
| Origin spoofing         | Unapproved site embeds a public board script               | Exact per-app origin allowlist; no wildcard in hosted production; bearer token still required.                    |
| Token replay            | Stolen browser token reused                                | Short TTL, issuer/audience/board/app checks, throttles, optional future nonce/replay cache for high-risk tenants. |
| Shared secret spread    | Hosted customer leaks HMAC secret                          | Prefer JWKS/public-key verification so BugDrop stores public key material, not customer signing secrets.          |
| GitHub blast radius     | Misprovisioned board creates issues in another tenant repo | GitHub App installation mapping must include tenant/app/board/repo allowlist and fail closed on mismatch.         |
| Rate-limit bypass       | User floods reads or writes                                | Per-board/per-user/per-action throttles, plus optional tenant/app aggregate limits in Board 3.                    |
| Support data leak       | Debug artifacts expose tokens/cookies/user ids             | Redacted audit records, support-safe diagnostics, and no secret-bearing screenshots or logs.                      |
| Data deletion mistake   | Tenant deletion removes another tenant's rows              | Tenant-scoped foreign keys, explicit deletion plan, dry-run reports, and tests for cross-tenant non-deletion.     |

## Data Model Sketch

Keep the current board tables for self-host compatibility, but add hosted control-plane tables before
real hosted tenants:

### `tenants`

- `id`
- `name`
- `slug`
- `status`: `active`, `paused`, `disabled`
- `created_at`
- `updated_at`

### `tenant_apps`

- `id`
- `tenant_id`
- `name`
- `slug`
- `status`
- `created_at`
- `updated_at`

### `app_origins`

- `id`
- `tenant_id`
- `app_id`
- `origin`
- `status`
- `created_at`
- `updated_at`

Origins are exact scheme/host/port values. No wildcard origins in hosted production.

### `app_token_verifiers`

- `id`
- `tenant_id`
- `app_id`
- `type`: `jwks`, `public_key`, or `hmac_legacy`
- `issuer`
- `audience`
- `jwks_url`
- `public_key_pem`
- `key_id`
- `max_ttl_seconds`
- `status`
- `created_at`
- `updated_at`

Hosted default should be `jwks` or `public_key`. `hmac_legacy` exists only for migration or
manually approved beta installs.

### `hosted_boards`

Extend or wrap `boards` with:

- `tenant_id`
- `app_id`
- `board_id`
- `repo_owner`
- `repo_name`
- `github_connection_id`
- `status`
- `created_at`
- `updated_at`

Board ids remain stable embed identifiers. Queries should always bind tenant/app/board when the
request is in hosted mode.

### `github_connections`

- `id`
- `tenant_id`
- `app_id`
- `installation_id`
- `account_login`
- `repo_owner`
- `repo_name`
- `status`
- `created_at`
- `updated_at`

Do not store long-lived repo PATs for hosted tenants. Store the GitHub App installation id and
repo allowlist, then mint installation tokens server-side.

### `audit_events`

- `id`
- `tenant_id`
- `app_id`
- `board_id`
- `actor_type`: `host_user`, `operator`, `system`
- `actor_ref_hash`
- `event_type`
- `metadata_json`
- `created_at`

Audit metadata must be redacted by default. Do not store bearer tokens, cookies, signing secrets, or
raw private keys.

## Token Trust Model

### Option A: Customer-Shared HMAC Secret

This is the current self-host path. The host app signs tokens using `BOARD_TOKEN_SECRET`, and the
Worker verifies HMAC signatures.

Pros:

- simple to document and test;
- already implemented;
- useful for self-hosters and manual beta.

Cons:

- BugDrop and the customer both possess signing authority;
- rotation requires coordinated secret replacement;
- support/debugging has higher secret-handling risk;
- weak fit for multi-tenant hosted SaaS.

### Option B: Customer JWKS Or Public Key

The host app signs JWT-like board tokens with a private key. BugDrop stores or fetches public key
material, then verifies issuer, audience, `kid`, expiration, app id, board id, and external user id.

Pros:

- BugDrop cannot mint customer user tokens;
- rotation can support overlapping keys;
- aligns with common SaaS identity integration patterns;
- easier to scope per app.

Cons:

- more setup than HMAC;
- requires cache and failure policy for JWKS retrieval;
- needs careful `kid` and stale-key handling.

### Option C: BugDrop-Managed Hosted Identity

BugDrop could manage user identity directly for hosted boards.

Pros:

- simpler token verification for BugDrop;
- could support standalone portal features later.

Cons:

- violates embedded-first shape;
- forces BugDrop into app-user login and privacy responsibilities;
- creates data duplication and adoption friction.

### Recommendation

Use Option B for hosted mode: per-app JWKS/public-key verification. Preserve Option A for self-host
and explicitly approved migration/beta cases. Reject Option C for MVP.

Required token claims for hosted mode:

- `iss`: app token issuer.
- `aud`: configured BugDrop Board audience.
- `sub` or `externalUserId`: stable host user id.
- `boardId`: requested board id.
- `appId`: hosted app id.
- `tenantId`: hosted tenant id or a tenant-bound issuer that resolves to one tenant.
- `exp`: no more than configured max TTL, default `300` seconds.
- optional `displayName` and `email`, used only where product copy needs them.

The Worker should resolve `boardId` first, load tenant/app verifier config, then verify the token
against that config. Any mismatch returns `401` or `404` without leaking whether another tenant's
resource exists.

## Origin And CORS Handling

Hosted mode must move from global `ALLOWED_ORIGINS` to per-app exact origins.

Request flow:

1. Parse `boardId` from the route.
2. Load board/app config.
3. If `Origin` is present, require exact match in active `app_origins`.
4. Apply CORS response headers only for matched origins.
5. Verify bearer token separately.

CORS remains browser containment. Authorization remains bearer-token verification plus board/app
config matching.

## GitHub Integration

Hosted tenants should use a BugDrop GitHub App installation, not a shared broad
`GITHUB_ISSUE_ACCESS_TOKEN`.

MVP direction:

- Customer installs the BugDrop GitHub App on one selected repo.
- Control plane stores installation id, account login, selected repo owner/name, and status.
- Board config points to one `github_connection_id`.
- Issue creation mints an installation token for that installation.
- Before creating an issue, the Worker confirms the board repo matches the connection repo allowlist.
- Repo mismatch, missing installation, suspended installation, or GitHub permission failure fails
  closed and does not store the D1 item.

Self-host mode can keep `GITHUB_ISSUE_ACCESS_TOKEN` because the operator controls the Worker and
blast radius.

## API And Configuration Surfaces

Hosted MVP needs operator/admin APIs before public self-service:

- create tenant;
- create app under tenant;
- add/list/remove app origins;
- add/update token verifier config;
- create board under app;
- connect GitHub App installation to board;
- generate embed snippet;
- pause/disable tenant, app, or board;
- inspect redacted diagnostics and audit events.

Each API must enforce operator/admin auth outside the embedded board token flow. The embedded board
APIs remain app-user scoped and should not mutate tenant config.

## Rate Limits And Abuse Boundaries

Keep current per-board/per-user/per-action throttles:

- item creation;
- upvote toggling;
- item reads;
- event polls.

Add hosted control-plane defaults for:

- per-app aggregate event poll limit;
- per-tenant aggregate write limit;
- per-origin suspicious request counters;
- disabled tenant/app/board fail-closed switch.

Rate-limit events should be audit-recorded with redacted actor references once audit storage exists.

## Audit, Support, Export, And Delete

MVP audit events:

- tenant/app/board created, updated, paused, disabled;
- origin added or removed;
- token verifier added, rotated, or disabled;
- GitHub connection added, changed, or failed;
- board item create failure caused by GitHub or verifier config;
- repeated throttle/abuse events above an operator threshold.

Support diagnostics should show:

- board/app/tenant status;
- active origins;
- verifier type, issuer, audience, key ids, and last JWKS fetch status;
- GitHub installation/repo status;
- recent redacted failure categories.

Do not show:

- bearer tokens;
- cookies;
- private keys;
- HMAC secrets;
- raw app-user ids unless the tenant explicitly provides them in a support exchange.

Export/delete MVP:

- export one board's items, votes, events, config, and GitHub issue URLs as JSON/CSV through an
  operator action;
- disable tenant/app/board before destructive delete;
- delete by tenant/app/board with dry-run row counts;
- prove delete does not touch another tenant's rows.

Automated backup/restore can remain deferred, but the control plane must not make export/delete
impossible.

## Migration Path

1. Keep the current self-host Worker path unchanged.
2. Add hosted control-plane tables and config repository behind feature flags or environment mode.
3. Add per-app origin lookup while keeping global `ALLOWED_ORIGINS` for self-host mode.
4. Add JWKS/public-key verifier while keeping HMAC verifier for self-host mode.
5. Add GitHub App issue creator while keeping PAT issue creator for self-host mode.
6. Migrate dogfood hosted board into tenant/app/board rows.
7. Run the hosted beta security gate before inviting another hosted tenant.

## Hosted MVP

The smallest useful hosted control-plane MVP includes:

- tenant/app/board data model;
- per-app exact origin allowlist;
- per-app JWKS/public-key verifier config;
- GitHub App installation/repo mapping;
- config repository and denial-by-default request lookup;
- cross-tenant isolation tests;
- operator-only provisioning scripts or APIs;
- redacted audit events for config changes and high-value failures;
- embed snippet generation.

Manual operator provisioning is acceptable for the first hosted MVP. Public self-service can follow
after the security gate passes.

## Deferred Work

- Billing and entitlements.
- Public tenant-admin UI.
- Realtime transport.
- Comments, downvotes, status workflow, and GitHub Projects.
- Product analytics dashboards.
- Automated backup/restore.
- Customer-managed custom domains.
- Full support portal.

## Test Strategy

Board 3+ implementation must prove:

- Tenant A token cannot read Tenant B board.
- App A origin cannot receive CORS headers for App B board.
- Token with matching board but wrong tenant/app/issuer/audience fails.
- Token with excessive TTL fails.
- Unknown or disabled tenant/app/board fails closed.
- GitHub repo mismatch fails before item persistence.
- GitHub failure does not store a board item.
- Throttle keys include tenant/app/board/user where applicable.
- Audit events redact app-user ids and never store secrets.
- Self-host HMAC/PAT path still passes existing tests.

## Follow-On Conveyor

### Board 3: Hosted Control Plane MVP Scaffold

Acceptance criteria:

- Adds tenant/app/board config migrations and repository layer.
- Adds app origin allowlist lookup.
- Adds per-app token verifier config interfaces.
- Keeps self-host global env behavior intact.
- Proves cross-tenant board and origin isolation with tests.
- Does not create GitHub App integration UI or billing.

### Board 4: GitHub App Integration

Acceptance criteria:

- Stores GitHub App installation metadata per tenant/app/board.
- Mints installation tokens server-side.
- Confirms repo allowlist before issue creation.
- Fails closed on missing, suspended, or mismatched installation.
- Keeps self-host PAT issue creator supported.
- Proves GitHub failure atomicity remains intact.

### Board 5: Hosted Onboarding UX/API

Acceptance criteria:

- Provides operator/admin APIs or scripts to create tenant, app, board, origins, verifier config, and
  GitHub connection.
- Generates an embed snippet with board id, API URL, token endpoint field, layout, and config hooks.
- Shows a security/setup checklist.
- Redacts secrets and token material from output.
- Does not add billing or public tenant-admin UI unless separately approved.

### Board 6: Hosted Beta Security Gate

Acceptance criteria:

- Runs CORS positive and negative tests against hosted config.
- Runs token TTL, issuer, audience, key rotation, origin mismatch, and tenant mismatch tests.
- Runs GitHub repo isolation tests.
- Runs request throttle and abuse-boundary tests.
- Runs audit redaction tests.
- Produces a manual dogfood script and go/no-go release receipt for the first non-dogfood hosted
  tenant.

## Open Decisions Before Board 3

- Whether hosted MVP stores only JWKS URLs, uploaded public keys, or both.
- Whether `tenantId` and `appId` must be explicit token claims or can be inferred solely from
  issuer/audience and board config.
- Whether audit logs store hashed `externalUserId` for support correlation in MVP.
- Whether dogfood hosted board migrates in place or gets re-provisioned into the new tenant/app
  tables.
