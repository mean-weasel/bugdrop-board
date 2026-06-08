# T999 Final Audit

Status: done.

Decision: pass for the local hosted beta security gate.

What changed:

- Added `test/hosted-beta-security-gate.test.ts`, a consolidated route-level hosted security gate.
- Added `docs/hosted-beta-dogfood-script.md`.
- Added `docs/release-readiness-results/2026-06-08-hosted-beta-security-gate.md`.
- Added GoalBuddy receipts for the hosted beta security gate board.

Proof:

- `npm run test -- test/hosted-beta-security-gate.test.ts test/routes.test.ts test/hosted-token-verifier.test.ts`
  - Passed: 3 test files, 32 tests.
- `npm run validate`
  - Passed: lint, Prettier, typecheck, workflow checks, and Vitest.
  - Vitest: 15 test files passed, 106 tests passed.
- `make check`
  - Passed: ESLint, Prettier, typecheck, knip, critical audit, and Actions Node 24 guard.
- `ruby -e 'require "yaml"; YAML.load_file("docs/goals/bugdrop-board-hosted-beta-security-gate/state.yaml"); puts "state yaml ok"'`
  - Passed: `state yaml ok`.
- `git diff --check`
  - Passed with no whitespace errors.
- `git diff --name-only origin/main...HEAD | rg "^(package-lock.json|wrangler.toml|public/|.github/workflows/)"`
  - No matches.
- `rg -n "ghs_|ghp_" docs/hosted-beta-dogfood-script.md docs/release-readiness-results/2026-06-08-hosted-beta-security-gate.md test/hosted-beta-security-gate.test.ts`
  - No matches.
- `rg -n "BEGIN PRIVATE" docs/hosted-beta-dogfood-script.md docs/release-readiness-results/2026-06-08-hosted-beta-security-gate.md`
  - No matches.

Burden of proof:

- Strongest failure mode 1: hosted beta readiness is claimed from scattered happy-path tests.
  - Disproved by a consolidated gate suite that covers CORS, token drift, GitHub repo mismatch,
    throttles, and event payload privacy.
- Strongest failure mode 2: the gate requires live credentials, deploys, or remote D1 mutation.
  - Disproved by all proof running against local D1, mocked JWKS/GitHub paths, and docs explicitly
    keeping real hosted tenant smoke as a no-go follow-up.
- Strongest failure mode 3: docs or tests leak token/private-key material.
  - Disproved by token-prefix scans across docs/tests and private-key marker scans across docs.

Residual risk:

- The first external hosted tenant remains no-go until real tenant host origin, JWKS/public key,
  GitHub App installation, token endpoint, and browser dogfood proof are supplied and recorded.
