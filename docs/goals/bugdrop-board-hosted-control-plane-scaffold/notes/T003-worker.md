# T003 Worker Receipt

## Change

Wired the scaffold into board route boundaries:

- Hosted board CORS now uses active hosted app origins when hosted config exists.
- Boards without hosted config keep global/self-host `ALLOWED_ORIGINS` behavior.
- `jwks` and `public_key` hosted verifier configs fail closed until hosted verification is
  implemented.
- Explicit `hmac_legacy` hosted verifier configs require tenant/app token claims and are treated as
  migration-only support.
- Board token claims now preserve optional `tenantId` and `appId`.

## Proof

- `npm run test -- test/routes.test.ts`
  - Output: `Test Files 1 passed (1)`, `Tests 17 passed (17)`.
- `npm run test -- test/board-token.test.ts test/hosted-config-repository.test.ts test/routes.test.ts`
  - Output: `Test Files 3 passed (3)`, `Tests 33 passed (33)`.
