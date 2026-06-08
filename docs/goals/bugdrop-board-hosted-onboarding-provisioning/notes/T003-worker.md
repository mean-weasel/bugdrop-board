# T003 Worker

Status: done.

Implemented:

- `scripts/provision-hosted-board-core.js` for hosted argument parsing, setup handoff generation,
  embed snippet generation, and recursive redaction.
- `scripts/provision-hosted-board-sql.js` for deterministic hosted D1 SQL generation.
- `scripts/provision-hosted-board.js` as the CLI wrapper around `wrangler d1 execute`.
- `npm run provision:hosted-board`.

Green proof:

- `npm run test -- test/provision-board.test.ts test/provision-hosted-board.test.ts`
  - Passed: 2 test files, 12 tests.
- Dry-run command with two origins, JWKS config, GitHub installation id, kanban layout, density,
  color, and config selector printed a redacted JSON handoff and SQL without mutating D1.
- Line counts: core 216, SQL 123, CLI 60.
