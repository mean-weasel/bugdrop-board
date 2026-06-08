# T002 Red Receipt

## Red Tests Added

Added `test/hosted-token-verifier.test.ts` covering:

- JWKS RS256 success.
- Uploaded public-key RS256 success.
- Missing JWKS `kid` failure.
- Wrong hosted claim failure.
- Expired token failure.
- Excessive TTL failure.
- Malformed token failure.
- Unsupported algorithm failure.

## Red Proof

- Initial red: `npm run test -- test/hosted-token-verifier.test.ts`
  - Output: failed because `../src/lib/hosted-token-verifier` did not exist.
- Corrected red after adding a null-returning stub:
  - Output: `2 failed | 4 passed`; JWKS and public-key success tests received `null`.
