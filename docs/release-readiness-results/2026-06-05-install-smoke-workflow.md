# Install Smoke Workflow

Date: 2026-06-05

Status: complete. First GitHub Actions dispatch exposed a missing browser-install step; follow-up
PR #38 patched it and the fixed workflow passed from `main`.

## Change

Added a manual `Install Smoke` GitHub Actions workflow that runs the published-package clean-room
install smoke without requiring secrets, npm publish, Cloudflare deploy, GitHub Issue tokens, or
production credentials.

The workflow accepts:

- `package_version`: published version or dist-tag to verify, defaulting to `0.1.2`
- `retries`: install attempts, defaulting to `3`
- `retry_delay_ms`: retry delay, defaulting to `5000`

## Conveyor

This is board 1 in the next post-v0.1.2 GoalBuddy conveyor:

1. Install smoke workflow proof.
2. Release handoff audit after the workflow lands.
3. Production dogfood regression recheck from the real signed-token host.

## Proof

RED proof before the workflow existed:

```bash
npm run test -- test/install-smoke-workflow.test.ts
```

Result: failed because `.github/workflows/install-smoke.yml` did not exist. That Vitest test was
then replaced with a normal Node verifier because the Cloudflare Vitest worker pool cannot reliably
read arbitrary checkout files from the host filesystem.

Workflow contract proof:

```bash
npm run install:smoke:workflow
```

Result: passed. The verifier confirmed the workflow is manual, uses `actions/checkout@v5` and
`actions/setup-node@v5`, runs `make install`, installs Chromium with `npx playwright install
--with-deps chromium`, runs `npm run install:smoke -- --version "$PACKAGE_VERSION"`, and contains
none of `secrets.`, `npm publish`, or `wrangler deploy`.

Post-merge workflow failure that disproved the first implementation:

```bash
gh workflow run "Install Smoke" --ref main -f package_version=0.1.2 -f retries=1 -f retry_delay_ms=0
gh run watch 27042195381 --exit-status
gh run view 27042195381 --log-failed
```

Result: failed. The GitHub runner installed npm dependencies but did not have Playwright Chromium
installed, so `browserType.launch` could not find
`chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell`.

Fixed post-merge workflow proof:

```bash
gh workflow run "Install Smoke" --ref main -f package_version=0.1.2 -f retries=1 -f retry_delay_ms=0
gh run watch 27042324248 --exit-status
```

Result: passed. The `Clean-Room Install Smoke` job ran from `main` commit
`753d83f84fc9f649a44713bb9dd911c5cbac61f7`, installed Chromium, and completed the clean-room
install smoke successfully.

Published package clean-room proof:

```bash
npm run install:smoke -- --version 0.1.2 --retries 1 --retry-delay-ms 0
```

Result: passed. The smoke installed `@mean-weasel/bugdrop-board@0.1.2`, served only the installed
`public/board.js`, mounted into `#feedback-board`, rendered the mocked item/upvote/issue link, and
reported no console errors or failed requests.

Package hygiene proof:

```bash
npm run pack:check
```

Result: passed. The dry-run tarball includes `scripts/verify-install-smoke-workflow.js`, keeping the
new package script honest for future published artifacts.

Standard gates:

```bash
npm run validate
make check
git diff --check
node /Users/neonwatty/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.8/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/bugdrop-board-install-smoke-workflow/state.yaml
```

Results:

- `npm run validate`: passed; 11 test files and 64 tests passed.
- `make check`: passed; lint, format, typecheck, knip, critical audit, and Actions Node guard passed.
- `git diff --check`: passed.
- GoalBuddy state checker: passed after correcting the board status to `active`.

## Scope Audit

No package version bump, npm publish, Cloudflare deploy, credential rotation, secret value
inspection, hosted control plane, billing, realtime transport, comments, downvotes, GitHub Projects,
or runtime product behavior change was introduced.
