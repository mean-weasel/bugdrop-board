# Remove npm Distribution

## Goal

Make the deployed Cloudflare Worker the only supported widget distribution path, matching the
existing BugDrop product: installers load `/board.js` from the same Worker that serves the API.

## Changes

- Mark the repository package private and remove npm publish/export metadata.
- Remove package publishing and clean-room registry-install workflows, scripts, and tests.
- Keep npm only for repository dependency management and development commands.
- Update current setup, release, and closed-beta documentation to verify the Worker-hosted asset.
- Preserve historical release receipts as historical evidence rather than rewriting them.

## Verification

- `npm ci`
- `make check`
- `npm run test`
- `npm run test:e2e`
- `npm run deploy:check:production`
- focused scan confirming current docs and automation no longer advertise npm distribution
