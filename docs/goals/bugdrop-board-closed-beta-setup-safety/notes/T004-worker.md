# T004 Worker

Result: done.

## Changes

- Added backend-only host token endpoint guidance to README.
- Added a minimal Node HMAC signer helper, Express-style endpoint, and Next.js App Router route
  handler example.
- Documented that the widget requests the token endpoint with `credentials: "include"` and that
  cross-origin host token endpoints need the host app's credentialed CORS policy.
- Clarified closed-beta GitHub issue-token guidance:
  - prefer a fine-grained token scoped only to the provisioned board repo;
  - require **Issues: Read and write** permission;
  - avoid broad account or organization tokens;
  - use GitHub Actions secret name `ISSUE_ACCESS_TOKEN` because GitHub reserves `GITHUB_*`.
- Tightened README secret rotation commands to use `--env production`.

## Verification

- `npx prettier --check README.md docs/staging-dogfood.md docs/production-dogfood.md ...`: passed.
- Token guidance scan found only documented placeholder names, `process.env.BOARD_TOKEN_SECRET`
  examples, and existing dogfood/read commands; no token-shaped secret values were found.
- Focused remote command scan found no remaining bare production `wrangler secret put`, remote D1
  migration, or remote provisioning examples without `--env production`.

## Scope Guard

No secret value was read, printed, written, or changed. No runtime auth behavior, token validation
behavior, GitHub client behavior, Cloudflare deployment, npm publishing, or credential operation was
performed.
