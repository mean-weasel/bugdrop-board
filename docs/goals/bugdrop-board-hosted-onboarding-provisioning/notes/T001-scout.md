# T001 Scout

Status: done.

Evidence inspected:

- `scripts/provision-board.js` already wraps `wrangler d1 execute DB --local|--remote --env ...`
  and prints a JSON board handoff.
- `scripts/provision-board-core.js` already provides argument parsing, repo validation, stable board
  id generation, and SQL quoting patterns for the self-host board row.
- `test/provision-board.test.ts` covers parser behavior, repo validation, SQL escaping, and local
  versus remote modes.
- `migrations/0003_hosted_control_plane.sql` already has tables for tenants, apps, origins, token
  verifiers, GitHub connections, and hosted board configs.
- `src/lib/hosted-config-repository.ts` confirms the intended config fields and status values.
- The hosted control-plane design accepts operator scripts for MVP onboarding and explicitly
  defers public tenant-admin UI.

Implementation target:

- Add a sibling `provision-hosted-board` command/core helper rather than changing the existing
  self-host `provision:board` behavior.
- Generate deterministic SQL for one hosted tenant/app/board setup and a redacted JSON handoff with
  embed snippet and security checklist.
