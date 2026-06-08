# T999 Final Audit

Status: done.

Decision: pass.

What changed:

- Added `npm run provision:hosted-board`.
- Added hosted provisioning core, SQL builder, and CLI wrapper.
- Added tests for parsing, SQL generation, embed snippet/checklist output, and recursive redaction.
- Documented hosted operator dry-run/apply usage and GitHub App installation setup language.

Proof:

- `npm run test -- test/provision-board.test.ts test/provision-hosted-board.test.ts`
  - Passed: 2 test files, 12 tests.
- `npm run validate`
  - Passed: lint, Prettier, typecheck, workflow checks, and Vitest.
  - Vitest: 14 test files passed, 101 tests passed.
- `make check`
  - Passed: ESLint, Prettier, typecheck, knip, critical audit, and Actions Node 24 guard.
- `ruby -e 'require "yaml"; YAML.load_file("docs/goals/bugdrop-board-hosted-onboarding-provisioning/state.yaml"); puts "state yaml ok"'`
  - Passed: `state yaml ok`.
- `git diff --check`
  - Passed with no whitespace errors.
- `rg -n "provision:hosted-board|dry-run|allowed origins|token endpoint|GitHub installation" README.md docs/hosted-security-and-setup.md`
  - Found command, dry-run guidance, allowed-origin/token-endpoint language, and GitHub installation
    language.
- `rg -n "ghs_|ghp_|BEGIN PRIVATE" README.md docs/hosted-security-and-setup.md scripts/provision-hosted-board*.js`
  - No matches.

Burden of proof:

- Strongest failure mode 1: the operator command mutates D1 during verification.
  - Disproved by using `--dry-run` for CLI proof and running no remote D1 command in verification.
- Strongest failure mode 2: setup output leaks secret or token material.
  - Disproved by recursive redaction unit tests and source/docs scans for token/private-key markers.
- Strongest failure mode 3: the new command regresses self-host provisioning.
  - Disproved by running existing `test/provision-board.test.ts` alongside the new hosted tests.

Residual risk:

- The command is operator-facing and does not create GitHub Apps or validate a real installation.
  Real hosted tenant smoke remains a follow-up after credentials and a target tenant are chosen.
