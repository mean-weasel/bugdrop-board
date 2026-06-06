# T005 Worker Receipt

Status: complete

## Changes

- Added `--cors-disallowed-origin` and `DEPLOY_SMOKE_CORS_DISALLOWED_ORIGIN` to the deployed Worker
  smoke helper.
- The helper now checks disallowed-origin preflight, item reads, and event reads and fails if the
  Worker returns either the disallowed origin or wildcard CORS.
- Added focused verifier tests for passing negative CORS proof, wildcard failure, and argument
  parsing.
- Updated README and closed-beta setup examples to show the negative CORS proof path and clarify
  that CORS is browser containment, not Worker authorization.

## Proof

- `npm run test -- verify-deployed-worker` passed: 1 file, 4 tests.
- `npm run typecheck` passed.
- `rg -n "cors-disallowed-origin|DEPLOY_SMOKE_CORS_DISALLOWED_ORIGIN|disallowed-origin|disallowed origin|CORS is browser containment|Bearer token verification remains" scripts test README.md docs/closed-beta-setup.md` shows the script, tests, and docs are wired.

## Scope Check

No live deploy, secret edit, npm publish, workflow change, hosted control plane, status workflow,
comments, downvotes, realtime, GitHub Projects, billing, or ops monitoring was added.
