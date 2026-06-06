# T003 Worker

Result: done.

## Changes

- Added explicit production deploy scripts:
  - `npm run deploy:production`
  - `npm run deploy:check:production`
  - `make deploy-production`
  - `make deploy-check-production`
- Changed plain `npm run deploy` to refuse ambiguous deploys and point operators to explicit
  environment commands.
- Changed the Install Smoke workflow default from `0.1.2` to `latest`.
- Updated the install-smoke workflow checker and parser test fixture for the current `0.2.0`
  package era.
- Updated README production setup and promotion snippets to use the production Wrangler environment
  explicitly.
- Updated stale README handoff/package text to reflect `@mean-weasel/bugdrop-board@0.2.0` as
  current npm `latest`.

## Verification

- `npm run install:smoke:workflow`: passed.
- `npm run package:workflow:check`: passed.
- `npx prettier --check README.md package.json .github/workflows/install-smoke.yml scripts/verify-install-smoke-workflow.js test/verify-clean-room-install.test.ts ...`: passed.
- Focused risky deploy/version scan for stale latest/default claims and plain production deploy
  examples: passed with no matches.
- `npm run validate`: passed; lint, format, typecheck, package workflow checker, and 66 Vitest
  tests passed.

## Scope Guard

No npm publish, Cloudflare deploy, package version bump, credential edit, runtime product behavior,
status workflow, new throttles, monitoring, billing, realtime, comments, downvotes, or GitHub
Projects work was performed.
