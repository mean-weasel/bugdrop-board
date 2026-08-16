# Closed Beta Setup Checklist

Use this checklist before inviting a closed-beta self-host installer or before repeating the
dogfood-style setup in a new app. It is intentionally limited to setup safety and installer trust.

## 1. Preflight

- Confirm the repository checkout is clean or that unrelated local changes are understood.
- Confirm the local runtime matches the supported closed-beta toolchain:

  ```bash
  node --version # expected: 22.x, at least 22.12.0
  npm --version  # expected: 10.x
  npx wrangler --version
  ```

  Use `npm ci` with the committed lockfile. npm manages this repository's development dependencies;
  the widget itself is built and served by the deployed Worker.

- Confirm the widget and production Worker bundle:

  ```bash
  npm run build:widget
  npm run deploy:check:production
  ```

- Run local repo gates before touching deployment credentials:

  ```bash
  npm run validate
  npm run deploy:check:production
  npm audit --json
  ```

  The closed-beta hardening baseline reported zero vulnerabilities in the full audit. Rerun it for
  the exact lockfile being deployed; do not rely only on a severity threshold.

- After `wrangler.toml` contains the intended production vars and D1 id, run the non-mutating
  setup doctor:

  ```bash
  npm run doctor:selfhost -- \
    --env production \
    --host-origin https://app.example.com \
    --repo owner/name \
    --board-id board_owner_name \
    --worker-url https://bugdrop-board.example.workers.dev \
    --token-endpoint https://app.example.com/api/bugdrop-board-token
  ```

  The doctor is local by default. It checks setup drift and prints the exact follow-up
  `deploy:smoke` command without deploying, mutating D1, changing secrets, or
  creating GitHub Issues. Use `--check-cloudflare-auth` and `--check-github-token` only when the
  maintainer explicitly wants non-mutating account/token reachability checks.

## 2. Cloudflare And D1

- Create or choose the remote D1 database for the beta install.
- Put the returned id in the target `[[env.production.d1_databases]]` entry, keeping the binding
  name as `DB`.
- Confirm `[env.production.vars]` uses exact host origins, not `ALLOWED_ORIGINS = "*"`.
- Apply migrations only against the explicit production environment:

  ```bash
  npx wrangler d1 migrations apply DB --remote --env production
  ```

## 3. Secrets

- Set Worker secrets against the explicit production environment:

  ```bash
  npx wrangler secret put BOARD_TOKEN_SECRET --env production
  npx wrangler secret put GITHUB_ISSUE_ACCESS_TOKEN --env production
  ```

- Keep `.dev.vars` local. Do not commit `.dev.vars`, `.deploy.secrets`, screenshots of tokens, or
  copied token values.
- For GitHub Actions deploys, store the issue token as `ISSUE_ACCESS_TOKEN`; GitHub secret names
  cannot start with `GITHUB_`.

## 4. GitHub Repo Boundary

- Provision one board per host app repo:

  ```bash
  npm run provision:board -- --repo owner/name --name "App Feedback" --remote --env production
  ```

- Use a fine-grained GitHub token scoped only to that repo with **Issues: Read and write**.
- Confirm the printed `board.id` matches the embed script's `data-board-id`.

## 5. Host App Token Endpoint

- Add a backend-only, POST-only token endpoint that returns
  `{ "token": "payload.signature" }` with `Cache-Control: no-store`. The widget sends exactly one
  credentialed, no-store request with `Accept` and `Content-Type` set to `application/json` and the
  literal body `{}`. Reject GET and any other method or body; derive all identity, board, claim, and
  TTL authority from the authenticated server session and server-side configuration.
- Sign with the same `BOARD_TOKEN_SECRET`, `BOARD_TOKEN_AUDIENCE`, and `BOARD_TOKEN_ISSUER` as the
  Worker expects.
- Include `boardId`, stable `externalUserId`, and a short `exp`, usually five minutes or less. The
  Worker rejects tokens whose expiry is more than `BOARD_TOKEN_MAX_TTL_SECONDS` in the future; the
  closed-beta default is `300` seconds.
- Confirm the endpoint works in the signed-in host page. The widget fails closed on non-2xx,
  invalid JSON, and missing, non-string, or blank tokens, with no GET fallback. Browser credentials
  are included, so host cookies and host CORS rules must permit that POST request.

## 6. Deploy

- Dry-run the production Worker bundle:

  ```bash
  npm run deploy:check:production
  ```

- Deploy only with an explicit environment:

  ```bash
  npm run deploy:production
  ```

- Do not use plain `npm run deploy` for beta; it intentionally refuses ambiguous deploys.

## 7. Smoke Proof

- Verify public Worker surfaces:

  ```bash
  npm run deploy:smoke -- \
    --url https://bugdrop-board.example.workers.dev \
    --expect-environment production
  ```

  This real Worker request is required. The local Playwright host serves its own `/board.js` and
  does not prove deployed asset delivery. Worker-hosted `/board.js` is the sole supported widget
  distribution path.

- Verify browser CORS and authenticated read surfaces from the host app:

  ```bash
  npm run deploy:smoke -- \
    --url https://bugdrop-board.example.workers.dev \
    --expect-environment production \
    --cors-origin https://app.example.com \
    --cors-disallowed-origin https://evil.example \
    --cors-board-id board_owner_name \
    --cors-token-endpoint https://app.example.com/api/bugdrop-board-token
  ```

- In the embedded host app, create a test item, confirm the GitHub Issue appears in the provisioned
  repo, then use a second signed-in viewer to confirm the upvote count and polling update.
- Confirm the operator understands the closed-beta throttle boundary: reads, event polling, item
  creation, and upvote toggles are rate-limited per board and signed host user. CORS is browser
  containment only; bearer tokens remain the Worker authorization boundary.

## 8. Handoff Evidence

Record these before calling the beta install ready:

- Worker commit or deployment identifier;
- D1 database name/id location, without secrets;
- Worker URL and exact allowed host origins;
- provisioned repo and board id;
- doctor output summary;
- deploy run or command summary;
- deploy smoke output summary;
- live embedded create/upvote/GitHub mirror proof;
- known limitations and excluded features communicated to the beta user.

Use [Closed Beta Runbook](closed-beta-runbook.md) for the full operator flow, record the manual proof
with [Closed Beta Dogfood Script](closed-beta-dogfood-script.md), check
[Closed Beta Readiness](closed-beta-readiness.md), and share [Closed Beta Risks](closed-beta-risks.md)
before inviting the beta user.

## Out Of Scope For This Checklist

This checklist does not add or prove hosted control plane, billing, realtime, comments, downvotes,
GitHub Projects, status workflow, token replay prevention, monitoring, incident response,
backup/export/restore, Cloudflare deploy automation changes, credential rotation, or
abuse controls beyond the closed-beta throttles and token TTL boundary documented here. Those belong
to later closed-beta conveyor boards.
