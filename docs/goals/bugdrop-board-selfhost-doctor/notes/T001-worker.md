# T001 Worker Receipt

Implemented a non-mutating self-host doctor with a testable Node core and CLI wrapper.

Proof:

- `npm run test:node -- test/doctor-selfhost.test.ts` passed with 5 tests.
- `npm run doctor:selfhost -- --env production --host-origin https://bugdrop.dev --repo mean-weasel/bugdrop-board-production-dogfood --board-id board_mean_weasel_bugdrop_board_production_dogfood --worker-url https://board.bugdrop.dev --token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a` passed with 17 checks, 0 warnings, and 0 failures.

Notes:

- The default doctor path performs local static checks only and does not deploy, mutate D1, change
  secrets, publish npm, or create GitHub Issues.
- Optional Cloudflare and GitHub reachability checks require explicit flags and are covered by fake
  dependency tests.
- The doctor test runs under `vitest.node.config.ts` so the Worker/D1 test pool remains scoped to
  Worker tests.
