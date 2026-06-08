# T001 Scout

## Insertion Points

- Add `migrations/0003_hosted_control_plane.sql` for hosted tenants, apps, origins, token verifiers,
  board configs, GitHub connection placeholder, and audit events.
- Add `src/lib/hosted-config-repository.ts` for tenant/app/board config reads and test helpers.
- Update `src/routes/api-helpers.ts` so board-route CORS checks hosted active origins when a board
  has hosted config, otherwise preserves global `ALLOWED_ORIGINS`.
- Extend `src/lib/board-token.ts` with optional `tenantId` and `appId` expected claims for hosted
  legacy verification.
- Add repository and route tests.

## Guardrails

- Do not implement full JWKS/public-key signature verification in this board.
- Do not add GitHub App token minting or issue creation.
- Do not alter `wrangler.toml`, workflows, package versions, public assets, deploys, or credentials.
- Self-host boards without hosted config must keep current HMAC/global-origin behavior.
