# T002 Red Tests

Status: done.

Added failing tests for:

- hosted provisioning argument parsing with repeated origins, remote mode, and environment;
- SQL generation for tenant, app, board, origins, token verifier, GitHub connection, and board
  config;
- embed snippet and security checklist generation;
- recursive redaction of secret and token material.

Red proof:

- `npm run test -- test/provision-hosted-board.test.ts`
  - Failed as expected: missing `../scripts/provision-hosted-board-core.js`.
