# T001 Scout

Status: done.

Evidence inspected:

- `src/lib/github.ts` only supports issue creation with a caller-provided bearer token and a
  self-host issue creator wrapper.
- `src/routes/api.ts` creates issues through `deps.createIssueCreator(env)` and always passes the
  repo owner/name from the `boards` row.
- `src/routes/api-helpers.ts` already loads hosted board config during auth but does not return it
  to routes.
- `src/lib/hosted-config-repository.ts` stores board config and token verifier metadata, but does
  not yet expose active GitHub connection metadata.
- `migrations/0003_hosted_control_plane.sql` already contains `hosted_github_connections` and
  `hosted_board_configs.github_connection_id`.
- Existing tests cover PAT issue creation, route atomicity on GitHub failure, hosted JWT auth, and
  hosted CORS.

Red-test targets:

- GitHub App creator exchanges an app JWT for an installation token and uses that token for issue
  creation.
- Hosted config repository reads active connection metadata scoped to tenant/app/board.
- Hosted route creates issues through the configured active connection repo and fails closed for
  missing, inactive, or repo-mismatched connections before persisting D1 state.
