# BugDrop Board Staging Dogfood Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove BugDrop Board in a real staging deployment with a signed-token host app, remote D1,
real GitHub Issue mirroring, upvotes, polling, package dry-run, and deployment workflow rehearsal.

**Architecture:** Keep the product self-hosted and GitHub-first: Cloudflare Worker + D1 stores board
state, the customer's host app owns authentication and signs board tokens, and the Worker mirrors
new board items into GitHub Issues. Add only the staging/rehearsal plumbing needed to avoid
accidentally deploying staging through the default Worker config.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, Cloudflare D1, Wrangler, GitHub Actions,
GitHub CLI, npm package dry-run, Playwright for browser proof.

---

## Scope

In scope:

- A staging dogfood runbook that a maintainer can execute.
- Staging-safe deploy workflow support for selecting a Wrangler environment.
- Provisioning CLI support for remote Wrangler environments.
- A real staging Worker/D1 deployment.
- A real signed-token host surface, preferably an existing BugDrop dummy host app.
- End-to-end dogfood proof: item creation, GitHub Issue mirroring, upvote, polling update from a
  second session, CORS/origin correctness, and package dry-run.

Out of scope:

- Hosted control plane.
- Billing.
- Realtime transport such as WebSocket, SSE, or Durable Object fanout.
- Comments.
- Downvotes.
- GitHub Projects.
- npm publish.
- Production deployment.
- New product behavior beyond staging/deployment/test plumbing.

## Staging Names

Use these names consistently for the first dogfood run:

- GitHub Environment: `staging`
- Wrangler environment: `staging`
- Worker name: `bugdrop-board-staging`
- D1 database name: `bugdrop-board-staging`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-dogfood`
- Board name: `BugDrop Board Dogfood`
- Board id expected from repo convention: `board_mean_weasel_bugdrop_board_dogfood`
- Token audience: `bugdrop-board`
- Token issuer: `bugdrop-board-dogfood-host`

Record the actual staging Worker URL and host app URL in a handoff note after deployment. Do not
commit secrets. Cloudflare D1 database ids are not secrets, but confirm with the operator before
committing a Mean Weasel staging database id to this public or shared repo.

## File Structure

Modify:

- `.github/workflows/deploy.yml`: add an optional Wrangler environment input and pass it to
  migrations, provisioning, and deploy commands.
- `scripts/provision-board-core.js`: parse and validate an optional `--env <name>` argument.
- `scripts/provision-board.js`: pass `--env <name>` to Wrangler D1 execution when provided.
- `test/provision-board.test.ts`: cover `--env staging`, invalid env names, and existing local/remote
  behavior.
- `README.md`: link to the staging dogfood runbook from release rehearsal/current handoff notes.
- `docs/staging-dogfood.md`: exact operator runbook for staging resources, workflow runs, browser
  proof, and rollback.

Do not modify:

- Core board API behavior under `src/routes/`.
- Widget UI behavior under `src/widget/`.
- Voting semantics.
- GitHub Issue mirroring semantics.

---

### Task 1: Create The Working Branch And Preflight

**Files:**

- Modify later tasks only after preflight is clean.

- [ ] **Step 1: Start from current main**

Run:

```bash
cd /Users/neonwatty/Desktop/bugdrop-board
git switch main
git pull --ff-only
git switch -c codex/staging-dogfood
```

Expected:

```text
Switched to a new branch 'codex/staging-dogfood'
```

- [ ] **Step 2: Confirm no local residue**

Run:

```bash
git status --short --branch
gh pr list --state open --json number,title,url --limit 20
```

Expected:

```text
## codex/staging-dogfood
[]
```

- [ ] **Step 3: Run the existing release rehearsal before changes**

Run:

```bash
npm run release:rehearsal
```

Expected:

```text
board_mean_weasel_release_rehearsal
GitHub Actions are Node 24-ready
```

and exit code `0`.

- [ ] **Step 4: Commit nothing**

Run:

```bash
git status --short
```

Expected: no output.

---

### Task 2: Add Provisioning CLI `--env` Tests

**Files:**

- Modify: `test/provision-board.test.ts`

- [ ] **Step 1: Inspect current tests**

Run:

```bash
sed -n '1,220p' test/provision-board.test.ts
```

Expected: tests already cover repo parsing, board id generation, name length, and local/remote mode.

- [ ] **Step 2: Add tests for `--env` parsing and validation**

Add these tests inside the existing `parseArgs` describe block:

```ts
it('parses a wrangler environment', () => {
  expect(parseArgs(['--repo', 'mean-weasel/demo', '--remote', '--env', 'staging'])).toMatchObject({
    repo: 'mean-weasel/demo',
    local: false,
    env: 'staging',
  });
});

it('rejects invalid wrangler environment names', () => {
  expect(() => parseArgs(['--repo', 'mean-weasel/demo', '--env', '../prod'])).toThrow(
    'Expected --env to contain only letters, numbers, underscores, and hyphens'
  );
});
```

- [ ] **Step 3: Run the focused test and confirm it fails**

Run:

```bash
npm run test -- test/provision-board.test.ts
```

Expected: failure because `parseArgs` does not parse `--env` yet.

- [ ] **Step 4: Commit nothing**

This is the red phase. Do not commit until Task 3 passes.

---

### Task 3: Implement Provisioning CLI `--env`

**Files:**

- Modify: `scripts/provision-board-core.js`
- Modify: `scripts/provision-board.js`
- Modify: `test/provision-board.test.ts`

- [ ] **Step 1: Add environment validation to core parser**

In `scripts/provision-board-core.js`, add this constant below `REPO_PATTERN`:

```js
const ENV_PATTERN = /^[A-Za-z0-9_-]+$/;
```

Add this parser branch after the `--name` branch:

```js
    } else if (arg === '--env') {
      const env = readValue(argv, (index += 1), '--env');
      if (!ENV_PATTERN.test(env)) {
        throw new Error('Expected --env to contain only letters, numbers, underscores, and hyphens');
      }
      options.env = env;
```

- [ ] **Step 2: Pass `--env` through to Wrangler**

In `scripts/provision-board.js`, build `wranglerArgs` in two parts:

```js
const wranglerArgs = ['wrangler', 'd1', 'execute', 'DB', options.local ? '--local' : '--remote'];
if (options.env) {
  wranglerArgs.push('--env', options.env);
}
wranglerArgs.push('--command', buildUpsertSql(board));
```

Replace the existing single `wranglerArgs` array with that block.

- [ ] **Step 3: Include env in JSON output**

In `scripts/provision-board.js`, update `output`:

```js
const output = {
  board,
  binding: 'DB',
  mode: options.local ? 'local' : 'remote',
  ...(options.env ? { env: options.env } : {}),
};
```

- [ ] **Step 4: Update help text**

In `scripts/provision-board.js`, change the usage line to:

```text
Usage: npm run provision:board -- --repo owner/name [--name "Board Name"] [--local|--remote] [--env staging]
```

Add this example:

```text
  npm run provision:board -- --repo mean-weasel/demo --remote --env staging
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test -- test/provision-board.test.ts
```

Expected:

```text
Test Files  1 passed
```

- [ ] **Step 6: Run parser-adjacent checks**

Run:

```bash
npm run validate
```

Expected:

```text
Test Files  7 passed
Tests  49 passed
```

The exact test count may be higher if other tests are added first; it must not be lower than the
current suite plus the two new tests.

- [ ] **Step 7: Commit**

Run:

```bash
git add scripts/provision-board-core.js scripts/provision-board.js test/provision-board.test.ts
git commit -m "feat: support wrangler env in board provisioning"
```

---

### Task 4: Add Wrangler Environment Selection To Deploy Workflow

**Files:**

- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add a workflow input**

Under `workflow_dispatch.inputs.environment`, add:

```yaml
wrangler_environment:
  description: Optional Wrangler environment name, for example staging.
  required: false
  type: string
```

- [ ] **Step 2: Add an environment variable**

Under job `env:`, add:

```yaml
WRANGLER_ENVIRONMENT: ${{ inputs.wrangler_environment }}
```

- [ ] **Step 3: Validate Wrangler environment names**

After `Validate required secrets`, add:

```yaml
- name: Validate Wrangler environment
  run: |
    if [ -n "$WRANGLER_ENVIRONMENT" ] && ! printf '%s' "$WRANGLER_ENVIRONMENT" | grep -Eq '^[A-Za-z0-9_-]+$'; then
      echo "::error::Wrangler environment must contain only letters, numbers, underscores, and hyphens"
      exit 1
    fi
```

- [ ] **Step 4: Apply migrations with optional environment**

Replace the remote migration step command with:

```yaml
run: |
  args=(d1 migrations apply DB --remote)
  if [ -n "$WRANGLER_ENVIRONMENT" ]; then
    args+=(--env "$WRANGLER_ENVIRONMENT")
  fi
  npx wrangler "${args[@]}"
```

- [ ] **Step 5: Provision with optional environment**

Replace the provision step command with:

```yaml
run: |
  args=(--repo "$PROVISION_REPO" --remote)
  if [ -n "$WRANGLER_ENVIRONMENT" ]; then
    args+=(--env "$WRANGLER_ENVIRONMENT")
  fi
  if [ -n "$PROVISION_NAME" ]; then
    args+=(--name "$PROVISION_NAME")
  fi
  npm run provision:board -- "${args[@]}"
```

- [ ] **Step 6: Deploy with optional environment**

Replace the deploy step command with:

```yaml
run: |
  args=(deploy --secrets-file .deploy.secrets)
  if [ -n "$WRANGLER_ENVIRONMENT" ]; then
    args+=(--env "$WRANGLER_ENVIRONMENT")
  fi
  npx wrangler "${args[@]}"
```

- [ ] **Step 7: Run workflow syntax and action guard checks**

Run:

```bash
npx prettier --check .github/workflows/deploy.yml
npm run check:actions-node24
```

Expected:

```text
All matched files use Prettier code style!
GitHub Actions are Node 24-ready
```

- [ ] **Step 8: Commit**

Run:

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: support wrangler env deploys"
```

---

### Task 5: Add The Staging Dogfood Runbook

**Files:**

- Create: `docs/staging-dogfood.md`
- Modify: `README.md`

- [ ] **Step 1: Create the runbook**

Create `docs/staging-dogfood.md` with:

````markdown
# Staging Dogfood

This runbook proves BugDrop Board in a real staging deployment before npm publish or production
deploy. It intentionally avoids hosted control plane, billing, realtime, comments, downvotes,
GitHub Projects, and new product behavior.

## Names

- GitHub Environment: `staging`
- Wrangler environment: `staging`
- Worker name: `bugdrop-board-staging`
- D1 database name: `bugdrop-board-staging`
- Dogfood mirror repo: `mean-weasel/bugdrop-board-dogfood`
- Board name: `BugDrop Board Dogfood`
- Expected board id: `board_mean_weasel_bugdrop_board_dogfood`
- Token audience: `bugdrop-board`
- Token issuer: `bugdrop-board-dogfood-host`

## Local Preflight

Run:

```bash
npm run release:rehearsal
```
````

Expected: local provisioning, package dry-run, deploy dry-run, Playwright E2E, validation, knip,
critical audit, and Actions guard all pass.

## Cloudflare Resources

Log in:

```bash
npx wrangler whoami
```

Create the staging D1 database:

```bash
npx wrangler d1 create bugdrop-board-staging
```

Copy the returned `database_id` into the staging environment binding used by the deployment branch.
Do not commit secrets.

## GitHub Resources

Create or verify the dogfood repo:

```bash
gh repo view mean-weasel/bugdrop-board-dogfood >/dev/null 2>&1 || \
  gh repo create mean-weasel/bugdrop-board-dogfood --private --description "BugDrop Board staging dogfood mirror repo"
```

Create or verify the GitHub Environment named `staging` in repository settings.

Set Environment secrets:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --env staging --body "$CLOUDFLARE_ACCOUNT_ID"
gh secret set CLOUDFLARE_API_TOKEN --env staging --body "$CLOUDFLARE_API_TOKEN"
gh secret set BOARD_TOKEN_SECRET --env staging --body "$BOARD_TOKEN_SECRET"
gh secret set GITHUB_ISSUE_ACCESS_TOKEN --env staging --body "$GITHUB_ISSUE_ACCESS_TOKEN"
```

Set the npm secret only for package dry-run/publish workflow validation:

```bash
gh secret set NPM_TOKEN --body "$NPM_TOKEN"
```

## Package Dry-Run

Run the **Package Widget** workflow with:

- `dry_run`: enabled
- `npm_tag`: `next`

Expected: the package job passes and logs a tarball containing `README.md`, `package.json`,
`public/board.js`, and `src/widget/`.

## Deploy Staging Worker

Run the **Deploy Worker** workflow with:

- GitHub Environment: `staging`
- Wrangler environment: `staging`
- Apply remote D1 migrations: enabled
- Provision repo: `mean-weasel/bugdrop-board-dogfood`
- Provision name: `BugDrop Board Dogfood`

Expected: validation gates pass, remote migrations apply, board provisioning prints
`board_mean_weasel_bugdrop_board_dogfood`, and Wrangler deploys `bugdrop-board-staging`.

## Host App Dogfood

Use an existing BugDrop dummy host app when available. The host app must:

- serve a signed-in page that embeds the staging Worker script;
- expose a backend token endpoint that returns `{ "token": "payload.signature" }`;
- sign with the same `BOARD_TOKEN_SECRET` as the Worker;
- use `aud` = `bugdrop-board`;
- use `iss` = `bugdrop-board-dogfood-host`;
- set `boardId` = `board_mean_weasel_bugdrop_board_dogfood`;
- issue different `externalUserId` values for at least two viewer sessions.

Embed:

```html
<script
  src="https://bugdrop-board-staging.<account-subdomain>.workers.dev/board.js"
  data-board-id="board_mean_weasel_bugdrop_board_dogfood"
  data-api-url="https://bugdrop-board-staging.<account-subdomain>.workers.dev"
  data-token-endpoint="/api/bugdrop-board-token"
  data-poll-interval="3000"
  data-color="#1f883d"
></script>
```

Replace the Worker origin with the actual staging Worker URL returned by Wrangler.

## Browser Proof

Use two browser sessions with different signed-in dummy users:

1. Viewer A opens the host app page.
2. Viewer B opens the same host app page in a separate browser context.
3. Viewer A creates item `Staging dogfood item`.
4. Confirm a GitHub Issue appears in `mean-weasel/bugdrop-board-dogfood`.
5. Confirm Viewer B sees `Staging dogfood item` through polling.
6. Viewer A upvotes the item.
7. Confirm Viewer A shows `Upvoted 1`.
8. Confirm Viewer B shows `Upvote 1` after polling.

## HTTP Smoke

Run:

```bash
curl -fsS https://bugdrop-board-staging.<account-subdomain>.workers.dev/health
curl -fsSI https://bugdrop-board-staging.<account-subdomain>.workers.dev/board.js
```

Expected: `/health` returns JSON with environment `staging`, and `/board.js` returns `200`.

## Rollback

Rollback is operator-controlled:

1. Re-run **Deploy Worker** from the previous known-good commit, or use Cloudflare Worker rollback.
2. Restore previous Worker secrets if a secret rotation caused the failure.
3. Re-run HTTP smoke and the two-viewer host app proof.

````

- [ ] **Step 2: Link the runbook from README**

In `README.md`, under `## Release Rehearsal`, add after the staging workflow bullets:

```markdown
For the full staging sequence, use [Staging Dogfood](docs/staging-dogfood.md).
````

- [ ] **Step 3: Format docs**

Run:

```bash
npx prettier --check README.md docs/staging-dogfood.md
```

Expected:

```text
All matched files use Prettier code style!
```

- [ ] **Step 4: Commit**

Run:

```bash
git add README.md docs/staging-dogfood.md
git commit -m "docs: add staging dogfood runbook"
```

---

### Task 6: Verify The Repo Changes

**Files:**

- No file edits.

- [ ] **Step 1: Run local release rehearsal**

Run:

```bash
npm run release:rehearsal
```

Expected:

```text
board_mean_weasel_release_rehearsal
GitHub Actions are Node 24-ready
```

and exit code `0`.

- [ ] **Step 2: Run full CI-style check**

Run:

```bash
make check
```

Expected:

```text
✓ All checks passed
```

- [ ] **Step 3: Run deploy workflow syntax proof**

Run:

```bash
npx prettier --check .github/workflows/deploy.yml
npm run check:actions-node24
```

Expected:

```text
All matched files use Prettier code style!
GitHub Actions are Node 24-ready
```

- [ ] **Step 4: Scope drift scan**

Run:

```bash
git diff main...HEAD | rg -n "billing|downvote|comment|GitHub Projects|websocket|WebSocket|SSE|Durable Object|hosted control|control plane|npm publish" || true
```

Expected: no matches except allowed runbook statements that describe excluded scope or package
dry-run boundaries.

- [ ] **Step 5: Push and open PR**

Run:

```bash
git push -u origin codex/staging-dogfood
gh pr create --base main --head codex/staging-dogfood --title "ci: prepare staging dogfood flow" --body "$(cat <<'BODY'
## Summary
- add Wrangler environment support to board provisioning
- let the Deploy Worker workflow target an optional Wrangler environment
- document the staging dogfood sequence for package dry-run, staging deploy, signed host app proof, and rollback

## Verification
- npm run release:rehearsal
- make check
- npx prettier --check .github/workflows/deploy.yml README.md docs/staging-dogfood.md
- npm run check:actions-node24
- scope drift scan

## Scope
No hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, npm publish, production deploy, or product behavior.
BODY
)"
```

- [ ] **Step 6: Watch CI**

Run:

```bash
gh pr checks --watch --interval 10
```

Expected:

```text
Lint, Typecheck, Knip, Audit pass
Unit Tests & Build pass
```

---

### Task 7: Execute Package Workflow Dry-Run

**Files:**

- No repo edits unless workflow fails because of repo code.

- [ ] **Step 1: Trigger Package Widget dry-run**

Run from `main` after the PR from Task 6 has merged:

```bash
gh workflow run "Package Widget" --ref main -f dry_run=true -f npm_tag=next
```

Expected:

```text
✓ Created workflow_dispatch event for package.yml at main
```

- [ ] **Step 2: Watch the workflow**

Run:

```bash
gh run list --workflow "Package Widget" --limit 1
gh run watch "$(gh run list --workflow "Package Widget" --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: workflow completes successfully.

- [ ] **Step 3: Inspect package proof**

Run:

```bash
gh run view "$(gh run list --workflow "Package Widget" --limit 1 --json databaseId --jq '.[0].databaseId')" --log | rg -n "Tarball Contents|public/board.js|src/widget|bugdrop-board@0.1.0"
```

Expected: log includes the package tarball contents and version.

---

### Task 8: Execute Staging Worker Deploy

**Files:**

- No repo edits unless workflow fails because of repo code.

- [ ] **Step 1: Verify required local environment variables are set**

Run:

```bash
test -n "$CLOUDFLARE_ACCOUNT_ID"
test -n "$CLOUDFLARE_API_TOKEN"
test -n "$BOARD_TOKEN_SECRET"
test -n "$GITHUB_ISSUE_ACCESS_TOKEN"
```

Expected: exit code `0`.

- [ ] **Step 2: Configure GitHub Environment secrets**

Run:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --env staging --body "$CLOUDFLARE_ACCOUNT_ID"
gh secret set CLOUDFLARE_API_TOKEN --env staging --body "$CLOUDFLARE_API_TOKEN"
gh secret set BOARD_TOKEN_SECRET --env staging --body "$BOARD_TOKEN_SECRET"
gh secret set GITHUB_ISSUE_ACCESS_TOKEN --env staging --body "$GITHUB_ISSUE_ACCESS_TOKEN"
```

Expected: each command reports the secret was set.

- [ ] **Step 3: Create or verify dogfood GitHub repo**

Run:

```bash
gh repo view mean-weasel/bugdrop-board-dogfood >/dev/null 2>&1 || \
  gh repo create mean-weasel/bugdrop-board-dogfood --private --description "BugDrop Board staging dogfood mirror repo"
```

Expected: repo exists and the GitHub token used by the Worker can create Issues in it.

- [ ] **Step 4: Trigger Deploy Worker staging run**

Run:

```bash
gh workflow run "Deploy Worker" \
  --ref main \
  -f environment=staging \
  -f wrangler_environment=staging \
  -f apply_migrations=true \
  -f provision_repo=mean-weasel/bugdrop-board-dogfood \
  -f provision_name="BugDrop Board Dogfood"
```

Expected:

```text
✓ Created workflow_dispatch event for deploy.yml at main
```

- [ ] **Step 5: Watch workflow**

Run:

```bash
gh run watch "$(gh run list --workflow "Deploy Worker" --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: workflow completes successfully and logs board id
`board_mean_weasel_bugdrop_board_dogfood`.

- [ ] **Step 6: Smoke Worker**

Run:

```bash
STAGING_WORKER_URL="https://bugdrop-board-staging.<account-subdomain>.workers.dev"
curl -fsS "$STAGING_WORKER_URL/health"
curl -fsSI "$STAGING_WORKER_URL/board.js"
```

Expected:

- `/health` returns JSON.
- `/board.js` returns `HTTP/2 200` or `HTTP/3 200`.

Replace `STAGING_WORKER_URL` with the actual staging Worker URL from Wrangler before running.

---

### Task 9: Execute Signed Host App Dogfood

**Files:**

- Prefer no repo edits; use an existing BugDrop dummy host app.
- If no suitable host exists, prepare a separate plan for a staging host fixture instead of adding it
  here.

- [ ] **Step 1: Locate existing dummy host app**

Run from the parent workspace:

```bash
cd /Users/neonwatty/Desktop
rg -n "bugdrop-board|BugDrop Board|BOARD_TOKEN_SECRET|bugdrop-board-token|data-board-id|bugdrop" --glob '!*node_modules*' .
```

Expected: at least one existing BugDrop dummy app or host fixture is identified.

- [ ] **Step 2: Configure the host app token endpoint**

Set host app backend config:

```bash
BOARD_TOKEN_SECRET="$BOARD_TOKEN_SECRET"
BOARD_TOKEN_AUDIENCE="bugdrop-board"
BOARD_TOKEN_ISSUER="bugdrop-board-dogfood-host"
BUGDROP_BOARD_ID="board_mean_weasel_bugdrop_board_dogfood"
BUGDROP_BOARD_API_URL="$STAGING_WORKER_URL"
```

Expected: host app signs tokens with matching secret/audience/issuer and includes the dogfood board
id.

- [ ] **Step 3: Configure allowed origins**

Set the deployed Worker `ALLOWED_ORIGINS` to the exact host app origin before the Deploy Worker run.

Expected: browser requests from the host app receive CORS headers, while unrelated origins do not.

- [ ] **Step 4: Browser dogfood**

Use two browser contexts:

1. Viewer A opens the host app page.
2. Viewer B opens the host app page.
3. Viewer A creates item `Staging dogfood item`.
4. Viewer A sees the item and a GitHub Issue number.
5. Viewer B sees `Staging dogfood item` within 10 seconds.
6. Viewer A upvotes.
7. Viewer A sees `Upvoted 1`.
8. Viewer B sees `Upvote 1` within 10 seconds.

Expected: all eight checks pass.

- [ ] **Step 5: GitHub Issue proof**

Run:

```bash
gh issue list --repo mean-weasel/bugdrop-board-dogfood --state open --json number,title,url --limit 10
```

Expected: output includes `Staging dogfood item`.

- [ ] **Step 6: Record proof**

Create `docs/staging-dogfood-results/YYYY-MM-DD.md` with:

```markdown
# Staging Dogfood Results

- Date: 2026-06-04
- Worker URL: <actual Worker URL>
- Host app URL: <actual host app URL>
- Board id: `board_mean_weasel_bugdrop_board_dogfood`
- GitHub Issue URL: <actual issue URL>
- Package Widget dry-run: passed
- Deploy Worker staging run: passed
- Viewer A create item: passed
- Viewer B polling visibility: passed
- Viewer A upvote: passed
- Viewer B polling upvote visibility: passed
- CORS exact-origin check: passed

## Commands

- `npm run release:rehearsal`
- `gh workflow run "Package Widget" --ref main -f dry_run=true -f npm_tag=next`
- `gh workflow run "Deploy Worker" --ref main -f environment=staging -f wrangler_environment=staging -f apply_migrations=true -f provision_repo=mean-weasel/bugdrop-board-dogfood -f provision_name="BugDrop Board Dogfood"`
- `curl -fsS "$STAGING_WORKER_URL/health"`
- `curl -fsSI "$STAGING_WORKER_URL/board.js"`
- `gh issue list --repo mean-weasel/bugdrop-board-dogfood --state open --json number,title,url --limit 10`
```

Replace angle-bracket values with the actual URLs before committing. Do not commit secrets.

- [ ] **Step 7: Commit results**

Run:

```bash
git add docs/staging-dogfood-results/YYYY-MM-DD.md
git commit -m "docs: record staging dogfood proof"
```

Use the actual date in the filename.

---

### Task 10: Final Release Decision Gate

**Files:**

- Modify: `README.md` only if the dogfood run changes release guidance.

- [ ] **Step 1: Answer release identity questions**

Record decisions in the PR or a short issue:

```markdown
- npm package name: `bugdrop-board`
- first publish version: `0.1.0`
- npm dist-tag for first publish: `next`
- production Worker target: not approved in this gate
- production npm publish: not approved in this gate
```

If any line changes, update the corresponding docs before publishing.

- [ ] **Step 2: Confirm final non-goals remained untouched**

Run:

```bash
git log --oneline --decorate -20
git diff main...HEAD | rg -n "billing|downvote|comment|GitHub Projects|websocket|WebSocket|SSE|Durable Object|hosted control|control plane" || true
```

Expected: no product behavior changes and no excluded-scope implementation.

- [ ] **Step 3: Open final handoff PR**

Run:

```bash
git push -u origin codex/staging-dogfood-results
gh pr create --base main --head codex/staging-dogfood-results --title "docs: record staging dogfood proof" --body "Records the staging dogfood proof for BugDrop Board. No product behavior changes."
```

- [ ] **Step 4: Stop before publish**

Do not run `npm publish` and do not deploy production in this plan. The next plan should be either:

- `first npm publish to next`, or
- `production deploy rehearsal`, or
- `host app dogfood fixture`, if Task 9 could not use an existing dummy app.

---

## Self-Review

Spec coverage:

- Release rehearsal is preserved and used as the first local proof gate.
- Package dry-run is included through `Package Widget` and `npm run pack:check`.
- Staging deploy is included through `Deploy Worker` with explicit Wrangler environment support.
- Real signed-token host app proof is included with two viewers, GitHub Issue mirroring, upvote, and
  polling.
- Exclusions are named in scope, runbook, PR body, and final audit.

Placeholder scan:

- Secret values are not included by design. Commands read secrets from environment variables and set
  GitHub secrets without printing them.
- The only angle-bracket values are actual runtime URLs that must be replaced after Cloudflare
  returns deployment-specific URLs; the plan explicitly says not to commit them before replacement.

Type consistency:

- `--env` is consistently named in tests, parser, provisioning CLI, README/runbook, and workflow.
- `wrangler_environment` is consistently the GitHub Actions input and `WRANGLER_ENVIRONMENT` is the
  job environment variable.
- Board id `board_mean_weasel_bugdrop_board_dogfood` matches the existing repo-derived convention.
