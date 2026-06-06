# T003 Worker Receipt

Result: done.

Hardened deploy workflow guardrails and local deploy-secret hygiene. The Worker inspected the
already-dirty deploy workflow, gitignore, package script, deploy verifier, README, and production
dogfood docs from this session and kept them with proof.

Changed files:

- `.github/workflows/deploy.yml`
- `.gitignore`
- `package.json`
- `scripts/verify-deploy-workflow.js`
- `README.md`
- `docs/production-dogfood.md`

What changed:

- Blank `wrangler_environment` now resolves to the selected GitHub Environment.
- Production GitHub Environment runs are rejected unless Wrangler environment resolves to
  `production`.
- Production deploy workflow runs require `smoke_url`.
- Deploy workflow exposes `smoke_cors_disallowed_origin` and forwards it to `npm run deploy:smoke`.
- `.deploy.secrets` is ignored locally and workflow cleanup remains present.
- Added `npm run deploy:workflow:check` and included it in `npm run validate`.
- README and production dogfood docs now describe the stricter production smoke and negative CORS
  input.

Proof:

- `npm run deploy:workflow:check`: pass.
- `npm run package:workflow:check`: pass.
- `npm run install:smoke:workflow`: pass.
- `npm run check:actions-node24`: pass.
- `git check-ignore -v .deploy.secrets`: pass, `.gitignore:6:.deploy.secrets`.
- Focused scan found `smoke_cors_disallowed_origin`, `SMOKE_CORS_DISALLOWED_ORIGIN`,
  `--cors-disallowed-origin`, production environment guard text, production smoke requirement, and
  `.deploy.secrets` cleanup in workflow/docs/verifier.

Stop conditions checked:

- No live Cloudflare deploy, production secret change, credential rotation, npm publish/version
  bump, hosted control plane, billing, realtime, comments, downvotes, GitHub Projects,
  status/admin workflow, or unrelated product behavior was required.
