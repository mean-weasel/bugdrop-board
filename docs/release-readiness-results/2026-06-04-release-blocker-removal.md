# Release Blocker Removal - 2026-06-04

## Summary

Removed the release blockers that were safe and possible from the current authenticated CLI session.
The remaining blockers are now explicit operator token, origin/issuer, package-name/version, and
approval decisions.

## Removed Blockers

### Production Dogfood Repo

Created production dogfood mirror repo:

- `mean-weasel/bugdrop-board-production-dogfood`
- private
- Issues enabled
- Projects disabled

### GitHub Production Environment

Created GitHub Environment `production`.

Production Environment secrets now present by name:

- `CLOUDFLARE_ACCOUNT_ID`
- `BOARD_TOKEN_SECRET`

`BOARD_TOKEN_SECRET` was generated locally and preserved in ignored file
`.secrets/bugdrop-board-production.env`; the secret value was not printed or committed.

### Cloudflare Production D1

Created Cloudflare D1 database:

- Name: `bugdrop-board-production`
- ID: `6f463f05-eb50-4de9-836d-0eed35f7305c`
- Created: `2026-06-04T18:10:06.297Z`

Applied remote migrations with:

```bash
npx wrangler d1 migrations apply DB --remote --env production
```

Applied migrations:

- `0001_initial.sql`
- `0002_request_throttle.sql`

Table inspection found:

- `_cf_KV`
- `board_events`
- `board_items`
- `board_votes`
- `boards`
- `d1_migrations`
- `request_throttle_windows`
- `sqlite_sequence`

### Production Wrangler Config

Added `[env.production]` to `wrangler.toml`:

- Worker name: `bugdrop-board`
- D1 binding: `DB`
- D1 database: `bugdrop-board-production`
- D1 id: `6f463f05-eb50-4de9-836d-0eed35f7305c`
- `ENVIRONMENT = "production"`
- `ALLOWED_ORIGINS = "https://board.bugdrop.dev"`
- `BOARD_TOKEN_ISSUER = "bugdrop-board-production-host"`

The host app or production smoke-test host must sign board tokens with issuer
`bugdrop-board-production-host` and audience `bugdrop-board`.

Production dry-run proof:

```bash
npm run build:widget && npx wrangler deploy --dry-run --env production
```

Result: passed. Wrangler showed `env.DB (bugdrop-board-production)`, `env.ENVIRONMENT
("production")`, exact origin `https://board.bugdrop.dev`, issuer
`bugdrop-board-production-host`, throttle vars, and exited before upload.

## Remaining Blockers

### Required For Production Deploy

- Set GitHub Environment `production` secret `CLOUDFLARE_API_TOKEN`.
- Set GitHub Environment `production` secret `ISSUE_ACCESS_TOKEN`.
- Point `board.bugdrop.dev` DNS/route at the production Worker before custom-domain smoke testing.
- Explicitly approve **Deploy Worker** against production.

### Required For npm Publish

- Confirm the intended npm package name is `bugdrop-board`.
- Confirm npm ownership/access for that package name.
- Set repo-level `NPM_TOKEN`.
- Decide whether to publish `0.1.0` or bump version first.
- Explicitly approve **Package Widget** with `dry_run=false`.

## Scope Audit

- No npm publish ran.
- No production Worker deploy ran.
- No production operator token value was printed or committed.
- No hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior was added.
