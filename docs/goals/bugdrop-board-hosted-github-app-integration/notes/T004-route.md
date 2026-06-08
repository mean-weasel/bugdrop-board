# T004 Route Integration

Status: done.

Implemented:

- `authorizeBoardRequest` now returns loaded hosted board config to routes.
- Hosted item creation uses the configured active GitHub connection and GitHub App credentials.
- Hosted creation fails closed when connection metadata is missing or does not match the board repo.
- Self-host behavior keeps using the existing PAT/injected issue creator path.

Green proof:

- `npm run test -- test/routes.test.ts`
  - Passed: 21 tests.
- `npm run test -- test/github.test.ts test/hosted-config-repository.test.ts test/routes.test.ts`
  - Passed: 3 test files, 31 tests.
