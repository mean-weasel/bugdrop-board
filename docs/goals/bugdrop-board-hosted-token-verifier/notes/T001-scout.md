# T001 Scout

## Findings

- Existing self-host token code uses WebCrypto HMAC in `src/lib/board-token.ts`.
- Hosted config already exposes `jwksUrl`, `publicKeyPem`, `keyId`, issuer, audience, and max TTL.
- Route integration currently fails closed for hosted `jwks` and `public_key` configs.
- No JWT library exists in `package.json`; Board 4 should use platform WebCrypto.

## Implementation Shape

- Add a hosted verifier module that parses compact JWT/JWS tokens.
- Support `RS256` only for this board.
- For `jwks`, fetch `{ keys: [...] }`, select by verifier `keyId` or JWT header `kid`, import JWK,
  and verify.
- For `public_key`, import SPKI PEM and verify.
- Enforce `iss`, `aud`, `boardId`, `tenantId`, `appId`, `externalUserId` or `sub`, `exp`, and max
  TTL.
- Return the same claim shape routes already consume.
