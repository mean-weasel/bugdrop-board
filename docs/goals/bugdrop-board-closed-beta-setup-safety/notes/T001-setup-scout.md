# T001 Setup Scout

Result: done.

## Evidence

- `git status --short --branch` started on `main...origin/main` with only the new GoalBuddy folder
  untracked.
- `npm view @mean-weasel/bugdrop-board version dist-tags --json` reports:

  ```json
  {
    "version": "0.2.0",
    "dist-tags": {
      "latest": "0.2.0"
    }
  }
  ```

- `package.json` is already `0.2.0`, but `.github/workflows/install-smoke.yml` still defaults
  `package_version` to `0.1.2`.
- `README.md` current handoff notes still say `@mean-weasel/bugdrop-board@0.1.2` is npm latest and
  `0.2.0` is being prepared.
- `README.md` production setup shows `npx wrangler d1 migrations apply DB --remote`,
  `npm run provision:board -- --remote`, and `npm run deploy` without an explicit production
  Wrangler environment, while `wrangler.toml` top-level config is development with
  `ALLOWED_ORIGINS = "*"` and placeholder D1 ids.
- `.github/workflows/deploy.yml` supports `wrangler_environment`, but the README command examples
  do not consistently push beta installers toward `production`.
- Host-token guidance documents claims and HMAC shape, but does not include a copy-pasteable
  backend signer endpoint and does not call out that the widget fetches the token endpoint with
  `credentials: "include"`.
- GitHub issue-token guidance says the token must create issues; staging docs are clearer about a
  fine-grained repo-scoped token and `ISSUE_ACCESS_TOKEN`, but the README setup path needs that
  clarity earlier.

## Smallest Safe Edit Plan

1. Fix version/install trust:
   - change Install Smoke default from `0.1.2` to `latest` or `0.2.0`;
   - update workflow checker/tests if they assert the old default;
   - update README current handoff notes to say `0.2.0` is published and future publishes still
     require explicit approval.
2. Fix deploy-env clarity:
   - add explicit production deploy/check scripts or documented command patterns that pass
     `--env production`;
   - update README self-host production steps to use explicit environment selection and avoid
     implying top-level development config is safe for production.
3. Fix installer token guidance:
   - add backend-only HMAC token endpoint examples;
   - explain the widget token request uses browser credentials and how that affects cookies/CORS.
4. Fix GitHub token guidance:
   - recommend a fine-grained token scoped to the provisioned repo with Issues read/write or
     equivalent GitHub App installation token;
   - explain GitHub Actions stores this as `ISSUE_ACCESS_TOKEN` because GitHub reserves
     `GITHUB_*` secret names.
5. Add a closed-beta setup checklist covering preflight, secrets, D1, Wrangler env, provisioning,
   deploy smoke, embedded host smoke, and handoff evidence.

## Stop Conditions Checked

The setup-safety oracle does not require product behavior, npm publishing, Cloudflare deployment,
credential changes, status workflow, new throttles, monitoring, or other excluded work.
