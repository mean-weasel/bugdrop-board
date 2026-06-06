# T999 Final Judge

Decision: complete.

The Closed Beta Board 1 setup-safety oracle is satisfied.

## Requirement Audit

- Production and self-host deploy guidance cannot silently steer an operator into top-level
  development Wrangler config:
  - README production setup now uses `--env production` for dry-run deploy, D1 migrations,
    provisioning, secrets, and deploy.
  - `npm run deploy` refuses ambiguous deploys and points to explicit environment commands.
  - `npm run deploy:production` and `npm run deploy:check:production` exist.
- Version and package guidance matches current `0.2.0` state:
  - `npm view @mean-weasel/bugdrop-board version dist-tags --json` reported `0.2.0` and
    `latest: 0.2.0`.
  - Install Smoke default is now `latest`.
  - README handoff/package text names `0.2.0` as current latest.
- Host-token endpoint guidance is copy-pasteable and backend-only:
  - README includes a Node HMAC helper, Express-style endpoint, and Next.js route handler.
  - README explains the widget token request uses browser credentials and what that means for host
    cookies/CORS.
- GitHub issue-token guidance names the closed-beta recommendation:
  - README recommends a fine-grained repo-scoped token with **Issues: Read and write**.
  - README documents `ISSUE_ACCESS_TOKEN` as the GitHub Actions secret name mapped to
    `GITHUB_ISSUE_ACCESS_TOKEN`.
- Closed-beta setup checklist exists and is linked:
  - `docs/closed-beta-setup.md` covers preflight, D1, secrets, GitHub boundary, host token endpoint,
    deploy, smoke proof, handoff evidence, and Board 1 exclusions.

## Verification

- `npm run validate`: passed.
- `npm run install:smoke:workflow`: passed.
- `npm run package:workflow:check`: passed.
- `npx prettier --check README.md docs/closed-beta-setup.md docs/goals/bugdrop-board-closed-beta-setup-safety/goal.md docs/goals/bugdrop-board-closed-beta-setup-safety/state.yaml docs/goals/bugdrop-board-closed-beta-setup-safety/notes/*.md`: passed.
- `node /Users/neonwatty/.codex/plugins/cache/goalbuddy/goalbuddy/0.3.8/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/bugdrop-board-closed-beta-setup-safety/state.yaml`: passed before final completion update.
- `git diff --name-only | rg '^(src/|migrations/|wrangler\\.toml|\\.secrets/|\\.dev\\.vars|public/board\\.js)$' && exit 1 || exit 0`: passed, proving no runtime source, migrations, Wrangler config, secrets, local env, or built public bundle files were modified.

## Residual Follow-Ups

Later closed-beta conveyor boards should handle security/abuse hardening, UX/product polish,
CI/E2E gating, status workflow, and ops/support readiness. Those were intentionally excluded from
Board 1.
