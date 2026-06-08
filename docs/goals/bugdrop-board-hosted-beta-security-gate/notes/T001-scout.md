# T001 Scout

Status: done.

Evidence inspected:

- Hosted design Board 6 requires CORS, token, GitHub repo isolation, throttle, audit/redaction, and
  manual dogfood/go-no-go proof.
- Existing route tests already cover hosted CORS allow/deny, hosted JWKS happy path, wrong tenant,
  HMAC legacy, hosted GitHub App creation, missing connection, and repo mismatch.
- Existing hosted token verifier tests already cover JWKS/public key, missing key id, wrong claims,
  expired/excessive TTL, malformed tokens, and unsupported algorithms.
- Request throttling already applies to create, upvote, list items, and event polling.
- Board events currently omit external user ids and display names from public event payloads.

Gap:

- Proof is scattered across several tests and docs. Add a focused hosted beta security gate suite and
  manual hosted dogfood/go-no-go docs so beta readiness can be reviewed from one place.
