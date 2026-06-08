# Hosted Beta Security Gate Go/No-Go

Date: 2026-06-08

Decision: **local gate pass, real hosted tenant smoke still pending**.

## Proven Locally

- Hosted CORS allows provisioned origins and denies unconfigured origins.
- Hosted tokens fail closed for:
  - excessive TTL;
  - wrong issuer;
  - wrong audience;
  - wrong signing key;
  - wrong tenant;
  - wrong app;
  - wrong board.
- Hosted GitHub repo mismatch fails before D1 item or event persistence.
- Hosted item reads and event polling enforce request throttles and return retry metadata.
- Hosted event payloads omit signed host user identifiers and display names.
- Hosted provisioning dry-run produces SQL, an embed snippet, and a security checklist without
  applying remote D1 changes.

## Proof Commands

```bash
npm run test -- test/hosted-beta-security-gate.test.ts test/routes.test.ts test/hosted-token-verifier.test.ts
npm run validate
make check
```

## Manual Dogfood Required Before Non-Dogfood Tenant

Follow [Hosted Beta Dogfood Script](../hosted-beta-dogfood-script.md) against the selected tenant.

The manual run must prove:

- the host token endpoint requires authenticated users;
- CORS succeeds from the approved host origin and fails from an unapproved origin;
- token issuer, audience, TTL, tenant, app, and board claims match the provisioned config;
- the GitHub App installation is active on the intended repo;
- creating an item creates one GitHub Issue in that repo;
- a second signed-in viewer sees updates through polling;
- throttles are visible and understandable;
- event payloads and receipts do not expose private user identifiers or secret material.

## Go/No-Go

Current status is **no-go for first external hosted tenant until real tenant credentials, host
origin, JWKS/public key, GitHub App installation, and browser dogfood proof are supplied and recorded**.

Go after the manual dogfood script passes with real tenant values and no secret/privacy leakage.
