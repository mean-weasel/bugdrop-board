# T004 Routes Receipt

## Change

Integrated the hosted verifier into board route authorization.

## Coverage

- Hosted `jwks` verifier tokens can authenticate board reads.
- Wrong hosted tenant claims fail closed with the existing `401` invalid-token boundary.
- Hosted JWKS/public-key paths no longer require `BOARD_TOKEN_SECRET`.
- Self-host/global HMAC behavior remains covered by existing route and board-token tests.

## Proof

- `npm run test -- test/hosted-token-verifier.test.ts test/routes.test.ts`
  - Output: `Test Files 2 passed (2)`, `Tests 24 passed (24)`.
- `npm run test -- test/board-token.test.ts test/hosted-token-verifier.test.ts test/routes.test.ts`
  - Output: `Test Files 3 passed (3)`, `Tests 37 passed (37)`.
