# T002 Worker Receipt

## Change

Added the hosted control-plane scaffold persistence layer:

- `migrations/0003_hosted_control_plane.sql`
- `src/lib/hosted-config-repository.ts`
- `test/hosted-config-repository.test.ts`

## Coverage

- Hosted tenants.
- Hosted apps.
- Hosted app origins.
- Hosted token verifier metadata for `jwks`, `public_key`, and `hmac_legacy`.
- Hosted GitHub connection placeholder.
- Hosted board configs.
- Hosted audit events.
- Active config lookup with active origins and active default verifier.
- Inactive tenant/board config suppression.

## Proof

- `npm run test -- test/hosted-config-repository.test.ts`
  - Output: `Test Files 1 passed (1)`, `Tests 3 passed (3)`.
