# T004 Docs

Status: done.

Added:

- `docs/hosted-beta-dogfood-script.md`
- `docs/release-readiness-results/2026-06-08-hosted-beta-security-gate.md`

The script covers local gate confirmation, hosted provisioning dry-run/apply decision, host token
endpoint checks, CORS allow/deny, create/read/upvote/polling, GitHub mirror verification, throttle
expectations, privacy checks, and go/no-go criteria.

The release receipt records a local gate pass but keeps the first external hosted tenant at no-go
until real tenant credentials, host origin, JWKS/public key, GitHub App installation, and browser
dogfood proof are supplied and recorded.
