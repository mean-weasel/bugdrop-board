# BugDrop Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first embedded BugDrop Board vertical slice: a self-hostable Cloudflare Worker/Hono backend, D1-backed ideas/upvotes/status state, host-signed auth, GitHub Issue mirroring, vanilla TypeScript widget, dummy host app, and polling-based freshness.

**Architecture:** The board is D1-first and GitHub-mirrored. D1 stores board items, upvotes, statuses, and polling events; GitHub Issues are created for engineering workflow, not used as the board database. The widget is framework-free TypeScript embedded in a host app and authenticated with short-lived host-signed tokens.

**Tech Stack:** Cloudflare Workers, Hono, D1, TypeScript, esbuild, Vitest, Playwright, Wrangler, GitHub App API, vanilla DOM/CSS widget.

---

## Source Documents

- Spec: `docs/superpowers/specs/2026-06-03-bugdrop-board-design.md`
- Repo guidance: `AGENTS.md`
- Style reference: `/Users/neonwatty/Desktop/bugdrop`

## GoalBuddy Conveyor

This build should run as a conveyor of GoalBuddy prep boards rather than one giant board.
Each board has a narrow oracle, a bounded file surface, and a handoff that seeds the next
board.

### Conveyor Board 0: Scaffold and Build Rails

**Starter command after prep:** `/goal Follow docs/goals/bugdrop-board-scaffold/goal.md.`

**Goal oracle:** `npm run validate` passes and `npm run build:widget` creates
`public/board.js` with no application behavior beyond bootstrapping.

**Likely misfire:** copying BugDrop too literally and dragging screenshot-specific code into
the board repo.

**Seed board shape:**

- Scout: inspect BugDrop package/config files and list only reusable setup pieces.
- Worker: scaffold package, TypeScript, lint, format, Vitest, Wrangler, widget build, and
  minimal Worker health route.
- Judge: run validation and inspect generated widget bundle path.

### Conveyor Board 1: D1 Data Model and Host-Signed Auth

**Starter command after prep:** `/goal Follow docs/goals/bugdrop-board-data-auth/goal.md.`

**Goal oracle:** D1 migrations apply locally, auth negative tests reject missing/expired/
wrong-scope tokens, and board/item/vote repositories pass uniqueness and cross-board tests.

**Likely misfire:** accepting a forged user id or allowing duplicate upvotes under two
requests.

**Seed board shape:**

- Scout: choose final HMAC token envelope and D1 local test strategy.
- Worker: add migrations, repository modules, token verification, and unit/integration tests.
- Judge: run tests against a local D1 database and inspect constraints.

### Conveyor Board 2: Item Creation and GitHub Issue Mirror

**Starter command after prep:** `/goal Follow docs/goals/bugdrop-board-github-mirror/goal.md.`

**Goal oracle:** creating an item with a valid token persists a D1 item, creates one mocked
GitHub Issue payload, stores the issue URL, appends an event, and fails atomically when
GitHub creation fails.

**Likely misfire:** creating D1 items without GitHub Issues, which violates the product
promise.

**Seed board shape:**

- Scout: inspect BugDrop GitHub App helpers and define the minimum Issue API client.
- Worker: implement create-item route with validation and GitHub client injection.
- Judge: run success and failure tests, including wrong-repo token scope.

### Conveyor Board 3: Upvotes, Statuses, and Polling API

**Starter command after prep:** `/goal Follow docs/goals/bugdrop-board-votes-polling/goal.md.`

**Goal oracle:** two simulated viewers can load a board, one viewer creates/upvotes an item,
and the other viewer receives the changed item via cursor polling.

**Likely misfire:** returning stale counters or skipping events when multiple writes occur in
quick succession.

**Seed board shape:**

- Worker: implement initial board load, upvote toggle, status projection, and events cursor.
- Judge: verify acting-user immediate state plus other-viewer polling state.

### Conveyor Board 4: Embedded Widget and Dummy Host App

**Starter command after prep:** `/goal Follow docs/goals/bugdrop-board-widget-host/goal.md.`

**Goal oracle:** Playwright opens the dummy host app, mounts the embedded widget, creates an
item with a host-signed token, toggles an upvote, and observes the polling update in a second
browser context.

**Likely misfire:** building a board that works as a page but not as an embedded widget.

**Seed board shape:**

- Scout: decide mount API and token callback shape.
- Worker: implement widget UI and dummy host token endpoint.
- Judge: inspect screenshots, console output, and Playwright traces.

### Conveyor Board 5: Self-Hosting, Hardening, and Release Readiness

**Starter command after prep:** `/goal Follow docs/goals/bugdrop-board-self-hosting/goal.md.`

**Goal oracle:** a fresh clone can follow docs to configure local dev, run migrations, start
the Worker and dummy host, and execute the E2E smoke without hidden hosted-only assumptions.

**Likely misfire:** hosted path works, but self-hosters lack required bindings, secrets, or
setup docs.

**Seed board shape:**

- Scout: run docs from scratch in a clean checkout or worktree.
- Worker: add self-host docs, `.dev.vars.example`, migration docs, and config checks.
- Judge: run the documented commands and record exact proof.

## Target File Structure

```text
.
  package.json
  tsconfig.json
  tsconfig.widget.json
  eslint.config.js
  prettier.config.cjs
  vitest.config.ts
  playwright.config.ts
  wrangler.toml
  migrations/
    0001_initial.sql
  scripts/
    build-widget.js
  public/
    board.js
  src/
    index.ts
    types.ts
    routes/
      api.ts
    lib/
      board-repository.ts
      board-token.ts
      github.ts
      ids.ts
      validation.ts
    widget/
      api.ts
      dom.ts
      index.ts
      theme.ts
      types.ts
  test/
    apply-migrations.ts
    board-repository.test.ts
    board-token.test.ts
    github.test.ts
    routes.test.ts
  e2e/
    board-widget.spec.ts
    fixtures/
      host-app.ts
```

## Task 1: Scaffold Package, Tooling, and Worker Health

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.widget.json`
- Create: `eslint.config.js`
- Create: `prettier.config.cjs`
- Create: `vitest.config.ts`
- Create: `test/apply-migrations.ts`
- Create: `wrangler.toml`
- Create: `src/index.ts`
- Create: `src/types.ts`
- Create: `src/routes/api.ts`
- Create: `test/routes.test.ts`

- [ ] **Step 1: Create `package.json` with BugDrop-style scripts**

```json
{
  "name": "bugdrop-board",
  "version": "0.1.0",
  "description": "Embedded, self-hostable ideas/request board backed by GitHub Issues.",
  "type": "module",
  "main": "./public/board.js",
  "exports": {
    ".": "./public/board.js",
    "./board": "./public/board.js",
    "./board.js": "./public/board.js"
  },
  "files": ["public/board.js", "public/board.v*.js", "src/widget/", "README.md"],
  "scripts": {
    "dev": "wrangler dev --port 8788",
    "build": "tsc",
    "build:widget": "node scripts/build-widget.js",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "typecheck": "tsc --noEmit && tsc --project tsconfig.widget.json --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint --fix .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "validate": "npm run lint && npm run format:check && npm run typecheck && npm run test"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "@cloudflare/vitest-pool-workers": "^0.16.12",
    "@eslint/js": "^9.39.2",
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.10.2",
    "@vitest/coverage-v8": "^4.1.6",
    "esbuild": "^0.28.0",
    "eslint": "^9.39.2",
    "globals": "^16.5.0",
    "jsdom": "^29.0.1",
    "prettier": "^3.8.1",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.50.0",
    "vitest": "^4.1.6",
    "wrangler": "^4.92.0"
  },
  "dependencies": {
    "hono": "^4.12.19"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and `npm install` exits 0.

- [ ] **Step 3: Add TypeScript configs**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers", "@types/node"],
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "e2e", "src/widget"]
}
```

Create `tsconfig.widget.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "types": ["@types/node"]
  },
  "include": ["src/widget/**/*"],
  "exclude": ["node_modules", "dist", "test", "e2e"]
}
```

- [ ] **Step 4: Add lint and format configs**

Create `eslint.config.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'public',
      'playwright-report',
      '.wrangler',
      '.superpowers',
      'commitlint.config.cjs',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/widget/index.ts'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
    },
  }
);
```

Create `prettier.config.cjs`:

```js
module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
};
```

- [ ] **Step 5: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(join(rootDir, 'migrations')),
        },
      },
    })),
  ],
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/apply-migrations.ts'],
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
```

Create `test/apply-migrations.ts`:

```ts
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { beforeEach } from 'vitest';
import type { Env } from '../src/types';

declare module 'cloudflare:workers' {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
```

- [ ] **Step 6: Add Wrangler config**

Create `wrangler.toml`:

```toml
name = "bugdrop-board"
main = "src/index.ts"
compatibility_date = "2024-01-29"

[assets]
directory = "public"
binding = "ASSETS"

[vars]
ENVIRONMENT = "development"
ALLOWED_ORIGINS = "*"
GITHUB_APP_NAME = "neonwatty-bugdrop"
BOARD_TOKEN_AUDIENCE = "bugdrop-board"
BOARD_TOKEN_ISSUER = "dummy-host"

[[d1_databases]]
binding = "DB"
database_name = "bugdrop-board-dev"
database_id = "00000000-0000-0000-0000-000000000000"
```

Expected: local development works with Wrangler's local D1 mode. When a real D1 database is
created, the Worker implementation commit updates `database_id` with the value printed by
`npx wrangler d1 create bugdrop-board-dev`.

- [ ] **Step 7: Add base Worker types**

Create `src/types.ts`:

```ts
export interface Env {
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  GITHUB_APP_NAME: string;
  GITHUB_APP_ID?: string;
  GITHUB_PRIVATE_KEY?: string;
  BOARD_TOKEN_SECRET?: string;
  BOARD_TOKEN_AUDIENCE?: string;
  BOARD_TOKEN_ISSUER?: string;
  DB: D1Database;
  ASSETS: Fetcher;
}

export type BoardStatus = 'open' | 'planned' | 'in_progress' | 'shipped' | 'closed';

export interface BoardItem {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: BoardStatus;
  githubIssueNumber: number;
  githubIssueUrl: string;
  upvoteCount: number;
  createdByExternalUserId: string;
  createdByDisplayName?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 8: Add health route test first**

Create `test/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import api from '../src/routes/api';
import type { Env } from '../src/types';

function env(): Env {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: '*',
    GITHUB_APP_NAME: 'bugdrop-board-test',
    DB: {} as D1Database,
    ASSETS: {} as Fetcher,
  };
}

describe('api routes', () => {
  it('returns health status', async () => {
    const res = await api.request('/health', {}, env());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'ok',
      environment: 'test',
    });
  });
});
```

- [ ] **Step 9: Run health test and verify it fails**

Run:

```bash
npm run test -- test/routes.test.ts
```

Expected: FAIL because `src/routes/api` does not exist yet.

- [ ] **Step 10: Implement minimal API and Worker entry**

Create `src/routes/api.ts`:

```ts
import { Hono } from 'hono';
import type { Env } from '../types';

type ApiEnv = { Bindings: Env };

const api = new Hono<ApiEnv>();

api.get('/health', c => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

export default api;
```

Create `src/index.ts`:

```ts
import api from './routes/api';

export default api;
```

- [ ] **Step 11: Run validation for scaffold**

Run:

```bash
npm run validate
```

Expected: lint, format check, typecheck, and the health test pass.

- [ ] **Step 12: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.widget.json eslint.config.js prettier.config.cjs vitest.config.ts wrangler.toml src test
git commit -m "chore: scaffold Worker project"
```

## Task 2: Widget Build Rails

**Files:**

- Create: `scripts/build-widget.js`
- Create: `src/widget/index.ts`
- Create: `src/widget/types.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add minimal widget entry**

Create `src/widget/types.ts`:

```ts
export interface BoardWidgetConfig {
  apiUrl: string;
  boardId: string;
}
```

Create `src/widget/index.ts`:

```ts
import type { BoardWidgetConfig } from './types';

declare const __BUGDROP_BOARD_VERSION__: string;

const script = document.currentScript as HTMLScriptElement | null;

function readConfig(): BoardWidgetConfig {
  if (!script) {
    throw new Error('BugDrop Board script tag could not be identified');
  }

  const boardId = script.dataset.boardId || script.dataset.repo;
  if (!boardId) {
    throw new Error('BugDrop Board requires data-board-id or data-repo');
  }

  const scriptUrl = new URL(script.src);
  const apiUrl = script.dataset.apiUrl || scriptUrl.origin;

  return { apiUrl, boardId };
}

function mount(config: BoardWidgetConfig): void {
  const root = document.createElement('div');
  root.setAttribute('data-bugdrop-board-root', '');
  root.textContent = `BugDrop Board ${__BUGDROP_BOARD_VERSION__}: ${config.boardId}`;
  document.body.append(root);
}

mount(readConfig());
```

- [ ] **Step 2: Add widget build script**

Create `scripts/build-widget.js`:

```js
#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = (process.env.VERSION || packageJson.version).replace(/^v/, '');
const [major, minor, patch] = version.split('.');

mkdirSync(publicDir, { recursive: true });

execSync(
  `npx esbuild src/widget/index.ts --bundle --minify --format=iife --define:__BUGDROP_BOARD_VERSION__='"${version}"' --outfile=public/board.js`,
  { cwd: rootDir, stdio: 'inherit' }
);

const latestPath = join(publicDir, 'board.js');
copyFileSync(latestPath, join(publicDir, `board.v${major}.js`));
copyFileSync(latestPath, join(publicDir, `board.v${major}.${minor}.js`));
copyFileSync(latestPath, join(publicDir, `board.v${major}.${minor}.${patch}.js`));

writeFileSync(
  join(publicDir, 'versions.json'),
  JSON.stringify(
    {
      current: version,
      latest: 'board.js',
      versions: {
        [`v${major}`]: `board.v${major}.js`,
        [`v${major}.${minor}`]: `board.v${major}.${minor}.js`,
        [`v${major}.${minor}.${patch}`]: `board.v${major}.${minor}.${patch}.js`,
      },
      generatedAt: new Date().toISOString(),
    },
    null,
    2
  )
);

console.log(`Built BugDrop Board widget ${version}`);
```

- [ ] **Step 3: Ensure generated widget artifacts are ignored**

Modify `.gitignore` if needed:

```text
public/board.js
public/board.v*.js
public/versions.json
```

- [ ] **Step 4: Build the widget**

Run:

```bash
npm run build:widget
```

Expected: `public/board.js`, versioned bundles, and `public/versions.json` are generated.

- [ ] **Step 5: Typecheck widget**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit widget rails**

```bash
git add scripts/build-widget.js src/widget .gitignore
git commit -m "chore: add widget build rails"
```

## Task 3: D1 Schema and Repository Layer

**Files:**

- Create: `migrations/0001_initial.sql`
- Create: `src/lib/ids.ts`
- Create: `src/lib/board-repository.ts`
- Create: `test/board-repository.test.ts`

- [ ] **Step 1: Write D1 migration**

Create `migrations/0001_initial.sql`:

```sql
CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(repo_owner, repo_name)
);

CREATE TABLE board_items (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  github_issue_number INTEGER NOT NULL,
  github_issue_url TEXT NOT NULL,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  created_by_external_user_id TEXT NOT NULL,
  created_by_display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(status IN ('open', 'planned', 'in_progress', 'shipped', 'closed')),
  CHECK(upvote_count >= 0)
);

CREATE INDEX idx_board_items_board_recent ON board_items(board_id, created_at DESC);
CREATE INDEX idx_board_items_board_votes ON board_items(board_id, upvote_count DESC, created_at DESC);

CREATE TABLE board_votes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(board_id, item_id, external_user_id)
);

CREATE TABLE board_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  item_id TEXT REFERENCES board_items(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_board_events_board_id ON board_events(board_id, id);
```

- [ ] **Step 2: Add id helper**

Create `src/lib/ids.ts`:

```ts
export function createId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${token}`;
}
```

- [ ] **Step 3: Write repository tests first**

Create `test/board-repository.test.ts` with tests for board creation, item creation,
upvote toggle, duplicate prevention, and cross-board isolation:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { BoardRepository } from '../src/lib/board-repository';

describe('BoardRepository', () => {
  let repo: BoardRepository;

  beforeEach(() => {
    repo = new BoardRepository(env.DB);
  });

  it('creates and loads one board per repo', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'demo' });
    const loaded = await repo.getBoard(board.id);
    expect(loaded).toMatchObject({
      id: board.id,
      repoOwner: 'mean-weasel',
      repoName: 'demo',
    });
  });

  it('creates an item and appends an item_created event', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'demo' });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add keyboard shortcuts',
      description: 'Power users need faster navigation.',
      githubIssueNumber: 42,
      githubIssueUrl: 'https://github.com/mean-weasel/demo/issues/42',
      externalUserId: 'user_1',
      displayName: 'Ada',
    });

    expect(item).toMatchObject({ title: 'Add keyboard shortcuts', upvoteCount: 0 });
    const events = await repo.listEvents(board.id, 0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'item_created', itemId: item.id });
  });

  it('toggles one upvote per external user', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'demo' });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      githubIssueNumber: 43,
      githubIssueUrl: 'https://github.com/mean-weasel/demo/issues/43',
      externalUserId: 'user_1',
    });

    const upvoted = await repo.toggleUpvote(board.id, item.id, 'user_2');
    expect(upvoted.upvoteCount).toBe(1);
    expect(upvoted.viewerHasUpvoted).toBe(true);

    const removed = await repo.toggleUpvote(board.id, item.id, 'user_2');
    expect(removed.upvoteCount).toBe(0);
    expect(removed.viewerHasUpvoted).toBe(false);
  });

  it('does not leak item events across boards', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'a' });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'b' });
    await repo.createItem({
      boardId: boardA.id,
      title: 'A item',
      description: 'Only board A should see this.',
      githubIssueNumber: 1,
      githubIssueUrl: 'https://github.com/mean-weasel/a/issues/1',
      externalUserId: 'user_1',
    });

    expect(await repo.listEvents(boardB.id, 0)).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Confirm the D1 test harness is active**

The D1 harness was added in Task 1 through the Cloudflare Workers Vitest pool:

```ts
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
```

Expected: repository tests access `env.DB`, and `test/apply-migrations.ts` applies
`migrations/0001_initial.sql` before each test.

- [ ] **Step 5: Run repository tests and verify they fail**

Run:

```bash
npm run test -- test/board-repository.test.ts
```

Expected: FAIL because `BoardRepository` does not exist.

- [ ] **Step 6: Implement repository**

Create `src/lib/board-repository.ts` with methods:

```ts
import type { BoardItem, BoardStatus } from '../types';
import { createId } from './ids';

interface BoardRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: BoardStatus;
  github_issue_number: number;
  github_issue_url: string;
  upvote_count: number;
  created_by_external_user_id: string;
  created_by_display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: number;
  board_id: string;
  event_type: string;
  item_id: string | null;
  payload_json: string;
  created_at: string;
}

export interface Board {
  id: string;
  repoOwner: string;
  repoName: string;
  name: string;
}

export interface BoardEvent {
  id: number;
  boardId: string;
  eventType: string;
  itemId: string | null;
  payload: unknown;
  createdAt: string;
}

export interface ViewerItem extends BoardItem {
  viewerHasUpvoted: boolean;
}

export class BoardRepository {
  constructor(private readonly db: D1Database) {}

  async upsertBoard(input: { repoOwner: string; repoName: string; name?: string }): Promise<Board> {
    const id = `board_${input.repoOwner}_${input.repoName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const name = input.name ?? `${input.repoOwner}/${input.repoName}`;

    await this.db
      .prepare(
        `INSERT INTO boards (id, repo_owner, repo_name, name)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(repo_owner, repo_name) DO UPDATE SET
           name = excluded.name,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
      )
      .bind(id, input.repoOwner, input.repoName, name)
      .run();

    const board = await this.getBoard(id);
    if (!board) throw new Error('Failed to upsert board');
    return board;
  }

  async getBoard(boardId: string): Promise<Board | null> {
    const row = await this.db.prepare('SELECT * FROM boards WHERE id = ?').bind(boardId).first<BoardRow>();
    return row ? this.mapBoard(row) : null;
  }

  async createItem(input: {
    boardId: string;
    title: string;
    description: string;
    githubIssueNumber: number;
    githubIssueUrl: string;
    externalUserId: string;
    displayName?: string;
  }): Promise<BoardItem> {
    const id = createId('item');
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO board_items (
            id, board_id, title, description, github_issue_number, github_issue_url,
            created_by_external_user_id, created_by_display_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          input.boardId,
          input.title,
          input.description,
          input.githubIssueNumber,
          input.githubIssueUrl,
          input.externalUserId,
          input.displayName ?? null
        ),
      this.db
        .prepare(
          `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
           VALUES (?, 'item_created', ?, ?)`
        )
        .bind(input.boardId, id, JSON.stringify({ itemId: id })),
    ]);

    const item = await this.getItem(input.boardId, id);
    if (!item) throw new Error('Failed to create board item');
    return item;
  }

  async getItem(boardId: string, itemId: string): Promise<BoardItem | null> {
    const row = await this.db
      .prepare('SELECT * FROM board_items WHERE board_id = ? AND id = ?')
      .bind(boardId, itemId)
      .first<ItemRow>();
    return row ? this.mapItem(row) : null;
  }

  async toggleUpvote(boardId: string, itemId: string, externalUserId: string): Promise<ViewerItem> {
    const existing = await this.db
      .prepare('SELECT id FROM board_votes WHERE board_id = ? AND item_id = ? AND external_user_id = ?')
      .bind(boardId, itemId, externalUserId)
      .first<{ id: string }>();

    if (existing) {
      await this.db.batch([
        this.db.prepare('DELETE FROM board_votes WHERE id = ?').bind(existing.id),
        this.db
          .prepare(
            `UPDATE board_items
             SET upvote_count = MAX(upvote_count - 1, 0),
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE board_id = ? AND id = ?`
          )
          .bind(boardId, itemId),
        this.db
          .prepare(
            `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
             VALUES (?, 'upvote_removed', ?, ?)`
          )
          .bind(boardId, itemId, JSON.stringify({ itemId, externalUserId })),
      ]);
    } else {
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO board_votes (id, board_id, item_id, external_user_id)
             VALUES (?, ?, ?, ?)`
          )
          .bind(createId('vote'), boardId, itemId, externalUserId),
        this.db
          .prepare(
            `UPDATE board_items
             SET upvote_count = upvote_count + 1,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE board_id = ? AND id = ?`
          )
          .bind(boardId, itemId),
        this.db
          .prepare(
            `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
             VALUES (?, 'upvote_added', ?, ?)`
          )
          .bind(boardId, itemId, JSON.stringify({ itemId, externalUserId })),
      ]);
    }

    const item = await this.getItem(boardId, itemId);
    if (!item) throw new Error('Board item not found');
    return { ...item, viewerHasUpvoted: !existing };
  }

  async listEvents(boardId: string, since: number): Promise<BoardEvent[]> {
    const result = await this.db
      .prepare('SELECT * FROM board_events WHERE board_id = ? AND id > ? ORDER BY id ASC LIMIT 100')
      .bind(boardId, since)
      .all<EventRow>();
    return result.results.map(row => ({
      id: row.id,
      boardId: row.board_id,
      eventType: row.event_type,
      itemId: row.item_id,
      payload: JSON.parse(row.payload_json) as unknown,
      createdAt: row.created_at,
    }));
  }

  private mapBoard(row: BoardRow): Board {
    return {
      id: row.id,
      repoOwner: row.repo_owner,
      repoName: row.repo_name,
      name: row.name,
    };
  }

  private mapItem(row: ItemRow): BoardItem {
    return {
      id: row.id,
      boardId: row.board_id,
      title: row.title,
      description: row.description,
      status: row.status,
      githubIssueNumber: row.github_issue_number,
      githubIssueUrl: row.github_issue_url,
      upvoteCount: row.upvote_count,
      createdByExternalUserId: row.created_by_external_user_id,
      createdByDisplayName: row.created_by_display_name ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

- [ ] **Step 7: Run repository tests**

Run:

```bash
npm run test -- test/board-repository.test.ts
```

Expected: PASS after the D1 harness is corrected for the chosen local test binding.

- [ ] **Step 8: Commit repository layer**

```bash
git add migrations src/lib/ids.ts src/lib/board-repository.ts test/board-repository.test.ts
git commit -m "feat: add D1 board repository"
```

## Task 4: Host-Signed Board Tokens

**Files:**

- Create: `src/lib/board-token.ts`
- Create: `test/board-token.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write token tests first**

Create `test/board-token.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createBoardToken, verifyBoardToken } from '../src/lib/board-token';

const secret = 'test-secret-that-is-long-enough';
const now = new Date('2026-06-03T12:00:00.000Z');

describe('board tokens', () => {
  it('verifies a valid scoped token', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        displayName: 'Ada',
        exp: Math.floor(now.getTime() / 1000) + 60,
        aud: 'bugdrop-board',
        iss: 'dummy-host',
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        expectedAudience: 'bugdrop-board',
        expectedIssuer: 'dummy-host',
        now,
      })
    ).resolves.toMatchObject({ externalUserId: 'user_1', displayName: 'Ada' });
  });

  it('rejects expired tokens', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: Math.floor(now.getTime() / 1000) - 1,
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('expired');
  });

  it('rejects wrong board scope', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: Math.floor(now.getTime() / 1000) + 60,
      },
      secret
    );

    await expect(
      verifyBoardToken(token, {
        secret,
        expectedBoardId: 'board_other_repo',
        now,
      })
    ).rejects.toThrow('scope');
  });

  it('rejects tampering', async () => {
    const token = await createBoardToken(
      {
        boardId: 'board_mean_weasel_demo',
        externalUserId: 'user_1',
        exp: Math.floor(now.getTime() / 1000) + 60,
      },
      secret
    );

    await expect(
      verifyBoardToken(`${token}tampered`, {
        secret,
        expectedBoardId: 'board_mean_weasel_demo',
        now,
      })
    ).rejects.toThrow('signature');
  });
});
```

- [ ] **Step 2: Run token tests and verify they fail**

Run:

```bash
npm run test -- test/board-token.test.ts
```

Expected: FAIL because `src/lib/board-token.ts` does not exist.

- [ ] **Step 3: Implement HMAC token helper**

Create `src/lib/board-token.ts`:

```ts
export interface BoardTokenClaims {
  boardId: string;
  externalUserId: string;
  displayName?: string;
  email?: string;
  exp: number;
  aud?: string;
  iss?: string;
}

export interface VerifyBoardTokenOptions {
  secret: string;
  expectedBoardId: string;
  expectedAudience?: string;
  expectedIssuer?: string;
  now?: Date;
}

const encoder = new TextEncoder();

export async function createBoardToken(
  claims: BoardTokenClaims,
  secret: string
): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyBoardToken(
  token: string,
  options: VerifyBoardTokenOptions
): Promise<BoardTokenClaims> {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid board token format');

  const expected = await sign(payload, options.secret);
  if (!timingSafeEqual(signature, expected)) throw new Error('Invalid board token signature');

  const claims = JSON.parse(base64UrlDecode(payload)) as BoardTokenClaims;
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (claims.exp <= nowSeconds) throw new Error('Board token expired');
  if (claims.boardId !== options.expectedBoardId) throw new Error('Board token scope mismatch');
  if (options.expectedAudience && claims.aud !== options.expectedAudience) {
    throw new Error('Board token audience mismatch');
  }
  if (options.expectedIssuer && claims.iss !== options.expectedIssuer) {
    throw new Error('Board token issuer mismatch');
  }
  if (!claims.externalUserId) throw new Error('Board token missing external user id');
  return claims;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const binary = atob(padded.replaceAll('-', '+').replaceAll('_', '/'));
  return Array.from(binary, char => char.charCodeAt(0))
    .map(code => String.fromCharCode(code))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
```

- [ ] **Step 4: Run token tests**

Run:

```bash
npm run test -- test/board-token.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit token auth**

```bash
git add src/lib/board-token.ts test/board-token.test.ts src/types.ts
git commit -m "feat: add host-signed board tokens"
```

## Task 5: Validation and GitHub Issue Client

**Files:**

- Create: `src/lib/validation.ts`
- Create: `src/lib/github.ts`
- Create: `test/github.test.ts`

- [ ] **Step 1: Add validation helper**

Create `src/lib/validation.ts`:

```ts
export interface CreateItemInput {
  title: string;
  description: string;
}

export function parseCreateItemInput(value: unknown): CreateItemInput {
  if (!isRecord(value)) throw new Error('Invalid JSON body');

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';

  if (title.length < 3) throw new Error('Title must be at least 3 characters');
  if (title.length > 120) throw new Error('Title must be 120 characters or fewer');
  if (description.length > 4000) throw new Error('Description must be 4000 characters or fewer');

  return { title, description };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 2: Write GitHub client tests**

Create `test/github.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitHubIssue } from '../src/lib/github';

describe('createGitHubIssue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an issue with board metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ number: 7, html_url: 'https://github.com/o/r/issues/7' }), {
        status: 201,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const issue = await createGitHubIssue({
      token: 'ghs_token',
      owner: 'o',
      repo: 'r',
      title: 'Add SSO',
      description: 'Enterprise users need it.',
      boardItemId: 'item_1',
    });

    expect(issue).toEqual({ number: 7, htmlUrl: 'https://github.com/o/r/issues/7' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/o/r/issues',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('item_1'),
      })
    );
  });

  it('throws on GitHub API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad credentials', { status: 401 })));

    await expect(
      createGitHubIssue({
        token: 'bad',
        owner: 'o',
        repo: 'r',
        title: 'Add SSO',
        description: '',
        boardItemId: 'item_1',
      })
    ).rejects.toThrow('Failed to create GitHub issue');
  });
});
```

- [ ] **Step 3: Run GitHub tests and verify they fail**

Run:

```bash
npm run test -- test/github.test.ts
```

Expected: FAIL because `src/lib/github.ts` does not exist.

- [ ] **Step 4: Implement minimum Issue client**

Create `src/lib/github.ts`:

```ts
const GITHUB_API = 'https://api.github.com';

export interface CreateIssueInput {
  token: string;
  owner: string;
  repo: string;
  title: string;
  description: string;
  boardItemId: string;
}

export interface CreatedIssue {
  number: number;
  htmlUrl: string;
}

export async function createGitHubIssue(input: CreateIssueInput): Promise<CreatedIssue> {
  const body = [
    input.description,
    '',
    '---',
    `BugDrop Board item: \`${input.boardItemId}\``,
    'Upvotes are tracked in BugDrop Board, not GitHub reactions.',
  ].join('\n');

  const response = await fetch(`${GITHUB_API}/repos/${input.owner}/${input.repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'BugDrop-Board/0.1',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: input.title,
      body,
      labels: ['enhancement'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create GitHub issue: ${response.status} - ${await response.text()}`);
  }

  const data = (await response.json()) as { number: number; html_url: string };
  return { number: data.number, htmlUrl: data.html_url };
}
```

- [ ] **Step 5: Run GitHub tests**

Run:

```bash
npm run test -- test/github.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit validation and GitHub client**

```bash
git add src/lib/validation.ts src/lib/github.ts test/github.test.ts
git commit -m "feat: add GitHub issue client"
```

## Task 6: Create Item API Route

**Files:**

- Modify: `src/routes/api.ts`
- Modify: `src/types.ts`
- Create or modify: `test/routes.test.ts`

- [ ] **Step 1: Add create-item route tests**

Extend `test/routes.test.ts` with:

```ts
import { createBoardToken } from '../src/lib/board-token';

it('rejects create item without token', async () => {
  const res = await api.request('/boards/board_mean_weasel_demo/items', { method: 'POST' }, env());
  expect(res.status).toBe(401);
});

it('creates item with valid token and returns item state', async () => {
  const token = await createBoardToken(
    {
      boardId: 'board_mean_weasel_demo',
      externalUserId: 'user_1',
      displayName: 'Ada',
      exp: Math.floor(Date.now() / 1000) + 60,
    },
    'test-secret'
  );

  const res = await api.request(
    '/boards/board_mean_weasel_demo/items',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Add SSO', description: 'Enterprise users need SSO.' }),
    },
    {
      ...env(),
      BOARD_TOKEN_SECRET: 'test-secret',
    }
  );

  expect(res.status).toBe(201);
  await expect(res.json()).resolves.toMatchObject({
    item: {
      title: 'Add SSO',
      status: 'open',
      upvoteCount: 0,
    },
  });
});
```

Use injected fake repository and GitHub client in the test environment if direct D1 setup is
too slow for route unit tests. Keep D1 repository integration coverage in Task 3.

- [ ] **Step 2: Run route tests and verify failure**

Run:

```bash
npm run test -- test/routes.test.ts
```

Expected: FAIL because create route is not implemented.

- [ ] **Step 3: Implement create route**

Modify `src/routes/api.ts` to include:

```ts
import { verifyBoardToken } from '../lib/board-token';
import { BoardRepository } from '../lib/board-repository';
import { createGitHubIssue } from '../lib/github';
import { parseCreateItemInput } from '../lib/validation';
```

Add the route:

```ts
api.post('/boards/:boardId/items', async c => {
  const boardId = c.req.param('boardId');
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Missing board token' }, 401);
  if (!c.env.BOARD_TOKEN_SECRET) return c.json({ error: 'Board token secret not configured' }, 500);

  let claims;
  try {
    claims = await verifyBoardToken(auth.slice('Bearer '.length), {
      secret: c.env.BOARD_TOKEN_SECRET,
      expectedBoardId: boardId,
      expectedAudience: c.env.BOARD_TOKEN_AUDIENCE,
      expectedIssuer: c.env.BOARD_TOKEN_ISSUER,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid board token' }, 401);
  }

  let input;
  try {
    input = parseCreateItemInput(await c.req.json());
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid request' }, 400);
  }

  const repo = new BoardRepository(c.env.DB);
  const board = await repo.getBoard(boardId);
  if (!board) return c.json({ error: 'Board not found' }, 404);

  if (!c.env.GITHUB_APP_ID || !c.env.GITHUB_PRIVATE_KEY) {
    return c.json({ error: 'GitHub App credentials not configured' }, 500);
  }

  const issue = await createGitHubIssue({
    token: c.env.GITHUB_PRIVATE_KEY,
    owner: board.repoOwner,
    repo: board.repoName,
    title: input.title,
    description: input.description,
    boardItemId: 'pending',
  });

  const item = await repo.createItem({
    boardId,
    title: input.title,
    description: input.description,
    githubIssueNumber: issue.number,
    githubIssueUrl: issue.htmlUrl,
    externalUserId: claims.externalUserId,
    displayName: claims.displayName,
  });

  return c.json({ item }, 201);
});
```

Then immediately refactor the temporary GitHub token shortcut: introduce a
`GitHubIssueClient` interface so tests inject fake issue creation and production code can
use an installation-token helper. The route must not treat `GITHUB_PRIVATE_KEY` as an
installation token in final code.

- [ ] **Step 4: Run route tests**

Run:

```bash
npm run test -- test/routes.test.ts
```

Expected: PASS with fake GitHub client injection and a route test proving GitHub failure
prevents D1 item creation.

- [ ] **Step 5: Commit create item route**

```bash
git add src/routes/api.ts src/types.ts test/routes.test.ts
git commit -m "feat: add board item creation API"
```

## Task 7: Upvote and Polling API

**Files:**

- Modify: `src/routes/api.ts`
- Modify: `src/lib/board-repository.ts`
- Modify: `test/routes.test.ts`

- [ ] **Step 1: Add upvote and polling route tests**

Add tests that:

```ts
it('toggles upvote for signed app user', async () => {
  // Seed board and item through repository.
  // POST /boards/:boardId/items/:itemId/upvote with valid token.
  // Expect first response upvoteCount 1 and viewerHasUpvoted true.
  // Repeat request.
  // Expect second response upvoteCount 0 and viewerHasUpvoted false.
});

it('returns only events after cursor', async () => {
  // Seed board, create item, record first cursor.
  // Toggle upvote.
  // GET /boards/:boardId/events?since=<first cursor>.
  // Expect one upvote event and a cursor greater than first cursor.
});
```

Fill these test bodies with the same helper style used in the create-item route tests.

- [ ] **Step 2: Run route tests and verify failure**

Run:

```bash
npm run test -- test/routes.test.ts
```

Expected: FAIL because upvote and events routes are not implemented.

- [ ] **Step 3: Implement routes**

Add:

```ts
api.post('/boards/:boardId/items/:itemId/upvote', async c => {
  const boardId = c.req.param('boardId');
  const itemId = c.req.param('itemId');
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Missing board token' }, 401);
  if (!c.env.BOARD_TOKEN_SECRET) return c.json({ error: 'Board token secret not configured' }, 500);

  let claims;
  try {
    claims = await verifyBoardToken(auth.slice('Bearer '.length), {
      secret: c.env.BOARD_TOKEN_SECRET,
      expectedBoardId: boardId,
      expectedAudience: c.env.BOARD_TOKEN_AUDIENCE,
      expectedIssuer: c.env.BOARD_TOKEN_ISSUER,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Invalid board token' }, 401);
  }

  const repo = new BoardRepository(c.env.DB);
  const item = await repo.toggleUpvote(boardId, itemId, claims.externalUserId);
  return c.json({ item });
});

api.get('/boards/:boardId/events', async c => {
  const boardId = c.req.param('boardId');
  const since = Number(c.req.query('since') ?? '0');
  if (!Number.isInteger(since) || since < 0) return c.json({ error: 'Invalid cursor' }, 400);

  const repo = new BoardRepository(c.env.DB);
  const events = await repo.listEvents(boardId, since);
  const cursor = events.at(-1)?.id ?? since;
  return c.json({ cursor, events });
});
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm run test -- test/routes.test.ts test/board-repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit upvote and polling API**

```bash
git add src/routes/api.ts src/lib/board-repository.ts test/routes.test.ts
git commit -m "feat: add upvotes and polling API"
```

## Task 8: Widget UI and API Client

**Files:**

- Create: `src/widget/api.ts`
- Create: `src/widget/dom.ts`
- Create: `src/widget/theme.ts`
- Modify: `src/widget/index.ts`
- Modify: `src/widget/types.ts`

- [ ] **Step 1: Define widget types**

Modify `src/widget/types.ts`:

```ts
export interface BoardWidgetConfig {
  apiUrl: string;
  boardId: string;
  tokenEndpoint?: string;
  accentColor: string;
}

export interface BoardItemView {
  id: string;
  title: string;
  description: string;
  status: string;
  upvoteCount: number;
  viewerHasUpvoted?: boolean;
}

export interface BoardState {
  items: BoardItemView[];
  cursor: number;
  loading: boolean;
  error?: string;
}
```

- [ ] **Step 2: Add widget API client**

Create `src/widget/api.ts`:

```ts
import type { BoardItemView } from './types';

export class BoardApi {
  constructor(
    private readonly apiUrl: string,
    private readonly boardId: string,
    private readonly getToken: () => Promise<string>
  ) {}

  async createItem(input: { title: string; description: string }): Promise<BoardItemView> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await responseError(res));
    const data = (await res.json()) as { item: BoardItemView };
    return data.item;
  }

  async toggleUpvote(itemId: string): Promise<BoardItemView> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/items/${itemId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await this.getToken()}` },
    });
    if (!res.ok) throw new Error(await responseError(res));
    const data = (await res.json()) as { item: BoardItemView };
    return data.item;
  }

  async events(since: number): Promise<{ cursor: number; events: Array<{ itemId: string }> }> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/events?since=${since}`);
    if (!res.ok) throw new Error(await responseError(res));
    return (await res.json()) as { cursor: number; events: Array<{ itemId: string }> };
  }
}

async function responseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed with ${res.status}`;
  } catch {
    return `Request failed with ${res.status}`;
  }
}
```

- [ ] **Step 3: Add DOM renderer**

Create `src/widget/dom.ts`:

```ts
import type { BoardItemView, BoardState } from './types';

export interface BoardDomHandlers {
  onCreate(input: { title: string; description: string }): void;
  onUpvote(itemId: string): void;
}

export function renderBoard(root: HTMLElement, state: BoardState, handlers: BoardDomHandlers): void {
  root.innerHTML = '';

  const shell = document.createElement('section');
  shell.className = 'bugdrop-board';

  const form = document.createElement('form');
  form.className = 'bugdrop-board__form';
  form.innerHTML = `
    <label>
      <span>Idea title</span>
      <input name="title" maxlength="120" required />
    </label>
    <label>
      <span>Context</span>
      <textarea name="description" maxlength="4000"></textarea>
    </label>
    <button type="submit">Submit</button>
  `;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    handlers.onCreate({
      title: String(data.get('title') ?? ''),
      description: String(data.get('description') ?? ''),
    });
  });

  const list = document.createElement('div');
  list.className = 'bugdrop-board__list';
  state.items.forEach(item => list.append(renderItem(item, handlers)));

  if (state.error) {
    const error = document.createElement('p');
    error.className = 'bugdrop-board__error';
    error.textContent = state.error;
    shell.append(error);
  }

  shell.append(form, list);
  root.append(shell);
}

function renderItem(item: BoardItemView, handlers: BoardDomHandlers): HTMLElement {
  const article = document.createElement('article');
  article.className = 'bugdrop-board__item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bugdrop-board__upvote';
  button.textContent = `${item.viewerHasUpvoted ? 'Upvoted' : 'Upvote'} ${item.upvoteCount}`;
  button.addEventListener('click', () => handlers.onUpvote(item.id));

  const title = document.createElement('h3');
  title.textContent = item.title;

  const status = document.createElement('span');
  status.className = 'bugdrop-board__status';
  status.textContent = item.status;

  const description = document.createElement('p');
  description.textContent = item.description;

  article.append(button, title, status, description);
  return article;
}
```

- [ ] **Step 4: Add simple styling**

Create `src/widget/theme.ts`:

```ts
export function injectTheme(root: ShadowRoot, accentColor: string): void {
  const style = document.createElement('style');
  style.textContent = `
    :host { color-scheme: light; }
    .bugdrop-board { font-family: system-ui, sans-serif; color: #172026; max-width: 760px; }
    .bugdrop-board__form { display: grid; gap: 8px; margin-bottom: 16px; }
    .bugdrop-board__form input,
    .bugdrop-board__form textarea {
      border: 1px solid #d0d7de;
      border-radius: 6px;
      font: inherit;
      padding: 8px 10px;
    }
    .bugdrop-board__form button,
    .bugdrop-board__upvote {
      background: ${accentColor};
      border: 0;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font: inherit;
      padding: 8px 10px;
    }
    .bugdrop-board__list { display: grid; gap: 10px; }
    .bugdrop-board__item { border: 1px solid #d0d7de; border-radius: 8px; padding: 12px; }
    .bugdrop-board__item h3 { font-size: 16px; margin: 0 0 6px; }
    .bugdrop-board__item p { margin: 8px 0 0; }
    .bugdrop-board__status { color: #57606a; font-size: 12px; text-transform: uppercase; }
    .bugdrop-board__error { color: #b42318; }
  `;
  root.append(style);
}
```

- [ ] **Step 5: Wire widget state**

Modify `src/widget/index.ts` to mount a Shadow DOM, instantiate `BoardApi`, render state,
and poll:

```ts
import { BoardApi } from './api';
import { renderBoard } from './dom';
import { injectTheme } from './theme';
import type { BoardItemView, BoardState, BoardWidgetConfig } from './types';

const script = document.currentScript as HTMLScriptElement | null;

function readConfig(): BoardWidgetConfig {
  if (!script) throw new Error('BugDrop Board script tag could not be identified');
  const boardId = script.dataset.boardId || script.dataset.repo;
  if (!boardId) throw new Error('BugDrop Board requires data-board-id or data-repo');
  return {
    apiUrl: script.dataset.apiUrl || new URL(script.src).origin,
    boardId,
    tokenEndpoint: script.dataset.tokenEndpoint,
    accentColor: script.dataset.color || '#14b8a6',
  };
}

async function getToken(config: BoardWidgetConfig): Promise<string> {
  if (!config.tokenEndpoint) throw new Error('BugDrop Board requires data-token-endpoint');
  const res = await fetch(config.tokenEndpoint, { credentials: 'include' });
  if (!res.ok) throw new Error(`Token request failed with ${res.status}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

function upsertItem(items: BoardItemView[], item: BoardItemView): BoardItemView[] {
  const index = items.findIndex(existing => existing.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map(existing => (existing.id === item.id ? item : existing));
}

function mount(config: BoardWidgetConfig): void {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const root = document.createElement('div');
  shadow.append(root);
  injectTheme(shadow, config.accentColor);
  document.body.append(host);

  const api = new BoardApi(config.apiUrl, config.boardId, () => getToken(config));
  let state: BoardState = { items: [], cursor: 0, loading: false };

  const rerender = () =>
    renderBoard(root, state, {
      onCreate: async input => {
        try {
          const item = await api.createItem(input);
          state = { ...state, items: upsertItem(state.items, item) };
          rerender();
        } catch (error) {
          state = { ...state, error: error instanceof Error ? error.message : 'Create failed' };
          rerender();
        }
      },
      onUpvote: async itemId => {
        try {
          const item = await api.toggleUpvote(itemId);
          state = { ...state, items: upsertItem(state.items, item) };
          rerender();
        } catch (error) {
          state = { ...state, error: error instanceof Error ? error.message : 'Upvote failed' };
          rerender();
        }
      },
    });

  rerender();

  window.setInterval(async () => {
    if (document.hidden) return;
    const update = await api.events(state.cursor);
    state = { ...state, cursor: update.cursor };
    rerender();
  }, 3000 + Math.floor(Math.random() * 750));
}

mount(readConfig());
```

- [ ] **Step 6: Build widget**

Run:

```bash
npm run build:widget
```

Expected: PASS and generated `public/board.js` contains `bugdrop-board`.

- [ ] **Step 7: Commit widget UI**

```bash
git add src/widget scripts/build-widget.js
git commit -m "feat: add embedded board widget"
```

## Task 9: Dummy Host App and Playwright E2E

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/fixtures/host-app.ts`
- Create: `e2e/board-widget.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5177',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

- [ ] **Step 2: Add dummy host server fixture**

Create `e2e/fixtures/host-app.ts`:

```ts
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createBoardToken } from '../../src/lib/board-token';

export async function startHostApp(): Promise<{ server: Server; url: string }> {
  const server = createServer(async (req, res) => {
    if (req.url === '/token') {
      const token = await createBoardToken(
        {
          boardId: 'board_mean_weasel_demo',
          externalUserId: 'user_e2e',
          displayName: 'E2E User',
          exp: Math.floor(Date.now() / 1000) + 300,
        },
        'e2e-secret'
      );
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ token }));
      return;
    }

    if (req.url === '/board.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(await readFile(join(process.cwd(), 'public/board.js'), 'utf8'));
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.end(`
      <!doctype html>
      <html>
        <body>
          <main><h1>Dummy App</h1></main>
          <script
            src="/board.js"
            data-board-id="board_mean_weasel_demo"
            data-api-url="http://127.0.0.1:8788"
            data-token-endpoint="/token"
          ></script>
        </body>
      </html>
    `);
  });

  await new Promise<void>(resolve => server.listen(5177, '127.0.0.1', resolve));
  return { server, url: 'http://127.0.0.1:5177' };
}
```

- [ ] **Step 3: Add E2E test**

Create `e2e/board-widget.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { startHostApp } from './fixtures/host-app';

test('embedded board creates and upvotes an item', async ({ page }) => {
  const host = await startHostApp();
  try {
    await page.goto(host.url);
    await expect(page.getByText('Dummy App')).toBeVisible();

    await page.getByLabel('Idea title').fill('Add dark mode');
    await page.getByLabel('Context').fill('The app should be easier to use at night.');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Add dark mode')).toBeVisible();
    await page.getByRole('button', { name: /Upvote 0/ }).click();
    await expect(page.getByRole('button', { name: /Upvoted 1/ })).toBeVisible();
  } finally {
    await new Promise<void>(resolve => host.server.close(() => resolve()));
  }
});
```

- [ ] **Step 4: Run E2E and record first failure**

Run:

```bash
npm run build:widget
npm run dev
npm run test:e2e
```

Expected: initial failure identifies missing backend test setup, D1 seed data, or GitHub fake
client wiring. Fix within this task by adding a test-mode fake GitHub client and board seed
for `board_mean_weasel_demo`.

- [ ] **Step 5: Run full E2E after fixes**

Run:

```bash
npm run build:widget
npm run test:e2e
```

Expected: PASS with Wrangler or a dedicated test server started by the Playwright config.

- [ ] **Step 6: Commit E2E venue**

```bash
git add playwright.config.ts e2e package.json package-lock.json src test
git commit -m "test: add dummy host E2E venue"
```

## Task 10: Self-Hosting and Hardening

**Files:**

- Create: `.dev.vars.example`
- Modify: `README.md`
- Modify: `wrangler.toml`
- Modify: `AGENTS.md` if verification commands change

- [ ] **Step 1: Add `.dev.vars.example`**

```text
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
BOARD_TOKEN_SECRET=replace-with-a-long-random-secret
```

- [ ] **Step 2: Expand README with setup**

Replace `README.md` with:

```markdown
# bugdrop-board

Embedded, self-hostable ideas/request board backed by GitHub Issues.

## Status

Investigation and early implementation.

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy local secrets:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

3. Create or configure a local D1 database in `wrangler.toml`.

4. Apply migrations:

   ```bash
   npx wrangler d1 migrations apply bugdrop-board-dev --local
   ```

5. Build the widget:

   ```bash
   npm run build:widget
   ```

6. Start the Worker:

   ```bash
   npm run dev
   ```

7. Run checks:

   ```bash
   npm run validate
   npm run test:e2e
   ```

## Product Shape

Hosted users should only need GitHub and the embed script. Self-hosters operate their own
Cloudflare Worker, D1 database, optional R2 bucket, and GitHub App credentials.
```

- [ ] **Step 3: Run docs commands in a clean shell**

Run:

```bash
npm run validate
npm run build:widget
```

Expected: PASS.

- [ ] **Step 4: Commit docs and hardening**

```bash
git add README.md .dev.vars.example wrangler.toml AGENTS.md
git commit -m "docs: add self-hosting setup"
```

## Final Verification Gate

- [ ] **Step 1: Run full validation**

```bash
npm run validate
npm run build:widget
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 2: Try to disprove the core product promise**

Check these claims with direct evidence:

- Hosted installing user only needs GitHub and script setup.
- Self-hosted operator has explicit Worker, D1, secrets, and migration docs.
- Each board item creates a GitHub Issue or fails without creating a D1 item.
- Upvotes are one per signed app user and D1 is canonical.
- Polling returns new events without requiring WebSockets.

- [ ] **Step 3: Push implementation branch**

```bash
git status --short --branch
git push -u origin "$(git branch --show-current)"
```

Expected: clean working tree and pushed branch.

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`.
Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task or per GoalBuddy
   conveyor board, review between tasks, and keep receipts tight.
2. **Inline Execution** - execute tasks in this session using `superpowers:executing-plans`,
   with checkpoints after each conveyor board.

For GoalBuddy execution, prepare the first board with:

```text
$goal-prep Build Conveyor Board 0 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md, preserving the scaffold oracle and constraints.
```
