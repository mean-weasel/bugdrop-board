# T003 Green Receipt

## Change

Implemented `src/lib/hosted-token-verifier.ts`.

## Coverage

- Compact JWT/JWS parsing.
- RS256 WebCrypto verification.
- JWKS URL fetch and `kid` key selection.
- Uploaded SPKI PEM public-key import.
- Issuer, audience, board id, tenant id, app id, stable user id, expiry, and max TTL checks.
- `externalUserId` and `sub` support for stable user identity.
- Fail-closed behavior for malformed tokens, missing keys, bad signatures, wrong claims, expired
  tokens, excessive TTL, and unsupported algorithms.

## Proof

- `npm run test -- test/hosted-token-verifier.test.ts`
  - Output: `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
