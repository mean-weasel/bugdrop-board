# T999 Final Audit

Status: done.

Decision: pass.

What changed:

- Added a GitHub App issue creator that signs an app JWT, mints an installation token, and creates
  the GitHub Issue with the installation token.
- Added hosted GitHub connection create/read support backed by the existing
  `hosted_github_connections` table.
- Wired hosted create-item routing to use active hosted GitHub connection metadata and fail closed
  on missing or repo-mismatched connection config.
- Preserved self-host PAT issue creation.
- Split helper modules to keep file-length rails intact.

Proof:

- `npm run test -- test/github.test.ts test/hosted-config-repository.test.ts test/routes.test.ts`
  - Passed: 3 test files, 31 tests.
- `npm run validate`
  - Passed: lint, Prettier, typecheck, workflow checks, and Vitest.
  - Vitest: 13 test files passed, 97 tests passed.
- `make check`
  - Passed: ESLint, Prettier, typecheck, knip, critical audit, and Actions Node 24 guard.
- `ruby -e 'require "yaml"; YAML.load_file("docs/goals/bugdrop-board-hosted-github-app-integration/state.yaml"); puts "state yaml ok"'`
  - Passed: `state yaml ok`.
- `git diff --check`
  - Passed with no whitespace errors.
- `git diff --name-only origin/main...HEAD | rg "^(package.json|package-lock.json|wrangler.toml|public/|.github/workflows/)"`
  - No matches.
- `rg -n "billing|realtime|downvote|GitHub Projects|NPM_TOKEN|CLOUDFLARE_API_TOKEN" src test migrations`
  - No matches.
- `wc -l src/lib/hosted-config-repository.ts src/routes/api.ts`
  - `src/lib/hosted-config-repository.ts`: 294 lines.
  - `src/routes/api.ts`: 273 lines.

Burden of proof:

- Strongest failure mode 1: hosted tenants still use a shared PAT or wrong repo.
  - Disproved by route tests that exercise hosted GitHub App installation-token flow and assert the
    issue endpoint uses the configured repo.
- Strongest failure mode 2: a hosted board can persist a D1 item/event without a configured active
  GitHub connection.
  - Disproved by fail-closed route tests for missing connection and repo mismatch, each asserting no
    items or events are persisted.
- Strongest failure mode 3: this slice weakens repo rails or drifts package/deploy/public surfaces.
  - Disproved by `npm run validate`, `make check`, line-count proof, and scope scans showing no
    package, wrangler, workflow, or public asset changes.

Residual risk:

- This is mocked GitHub App proof only. Real installation-token smoke remains blocked until hosted
  onboarding/credential setup exists.
