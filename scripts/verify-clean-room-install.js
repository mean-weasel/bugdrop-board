#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { DEFAULT_HOST_CONFIG, buildHostHtml, parseArgs } from './verify-clean-room-install-core.js';

const rootRequire = createRequire(import.meta.url);
const localPackage = rootRequire('../package.json');

function printHelp() {
  console.log(`Usage: npm run install:smoke -- [--version ${localPackage.version}] [--package @scope/name]

Installs the published npm package into a temporary project, serves only the installed
public/board.js bundle, and verifies the documented inline embed boots in a browser.

Options:
  --package <name>          Package name to install. Defaults to package.json name.
  --version <version>       Version or dist-tag to install. Defaults to package.json version.
  --retries <count>         Install attempts before failing. Defaults to 3.
  --retry-delay-ms <ms>     Delay between failed install attempts. Defaults to 5000.
  --keep                    Keep the temporary smoke project for inspection.`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`);
  }
  return result.stdout;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function installWithRetries(spec, cwd, retries, retryDelayMs) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      run('npm', ['install', spec], cwd);
      return attempt;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs);
      }
    }
  }
  throw lastError;
}

function createCleanRoomServer(board) {
  const requests = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({ method: req.method, path: url.pathname, search: url.search });

    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(buildHostHtml());
      return;
    }

    if (url.pathname === DEFAULT_HOST_CONFIG.scriptPath) {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(board);
      return;
    }

    if (url.pathname === DEFAULT_HOST_CONFIG.tokenEndpoint) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ token: 'clean-room-token' }));
      return;
    }

    if (
      url.pathname === `${DEFAULT_HOST_CONFIG.apiUrl}/boards/${DEFAULT_HOST_CONFIG.boardId}/items`
    ) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          items: [
            {
              id: 'item_clean_room',
              title: 'Clean room install proof',
              description: 'Rendered from the published npm package bundle.',
              status: 'open',
              githubIssueNumber: 12,
              githubIssueUrl: 'https://github.com/mean-weasel/bugdrop-board/issues/12',
              upvoteCount: 2,
              viewerHasUpvoted: false,
            },
          ],
        })
      );
      return;
    }

    if (
      url.pathname === `${DEFAULT_HOST_CONFIG.apiUrl}/boards/${DEFAULT_HOST_CONFIG.boardId}/events`
    ) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ cursor: 0, events: [] }));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });
  return { server, requests };
}

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

export async function runInstallSmoke(options) {
  const spec = `${options.packageName}@${options.version}`;
  const tempDir = await mkdtemp(join(tmpdir(), 'bugdrop-board-clean-room-'));
  let server;
  let browser;

  try {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ private: true, type: 'commonjs' }, null, 2)
    );
    const installAttempt = await installWithRetries(
      spec,
      tempDir,
      options.retries,
      options.retryDelayMs
    );
    const smokeRequire = createRequire(join(tempDir, 'smoke.cjs'));
    const rootPath = smokeRequire.resolve(options.packageName);
    const boardPath = smokeRequire.resolve(`${options.packageName}/board.js`);
    const boardAliasPath = smokeRequire.resolve(`${options.packageName}/board`);
    const board = await readFile(boardPath, 'utf8');
    const boardSupportsCustomization =
      board.includes('configSelector') && board.includes('bugdropBoardLayout');
    const npmTree = JSON.parse(run('npm', ['ls', options.packageName, '--json'], tempDir));
    const installedVersion = npmTree.dependencies?.[options.packageName]?.version;

    const cleanRoom = createCleanRoomServer(board);
    server = cleanRoom.server;
    const port = await listen(server);
    const { chromium } = await import('@playwright/test');
    browser = await chromium.launch();
    const page = await browser.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('requestfailed', request => {
      failedRequests.push(
        `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim()
      );
    });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#feedback-board [data-bugdrop-board-root]');
    await page.waitForFunction(() => {
      const host = document.querySelector('#feedback-board [data-bugdrop-board-root]');
      return host?.shadowRoot?.textContent?.includes('Clean room install proof');
    });

    const domProof = await page.evaluate(() => {
      const slot = document.querySelector('#feedback-board');
      const host = document.querySelector('#feedback-board [data-bugdrop-board-root]');
      const rootText = host?.shadowRoot?.textContent ?? '';
      return {
        slotHasHost: Boolean(slot?.querySelector('[data-bugdrop-board-root]')),
        rootCountInSlot: slot?.querySelectorAll('[data-bugdrop-board-root]').length ?? 0,
        rootCountInBody: document.body.querySelectorAll('[data-bugdrop-board-root]').length,
        hasCustomHeading: rootText.includes('Clean-room board'),
        hasTitle: rootText.includes('Clean room install proof'),
        hasUpvote: rootText.includes('Vote 2') || rootText.includes('Upvote 2'),
        hasIssueLink: rootText.includes('Ticket #12') || rootText.includes('Issue #12'),
      };
    });
    domProof.hasCustomHeading = !boardSupportsCustomization || domProof.hasCustomHeading;

    const checks = {
      installedVersion: installedVersion === options.version || options.version === 'latest',
      rootMatchesBoard: rootPath === boardPath,
      boardAliasMatches: boardAliasPath === boardPath,
      boardPathEndsCorrectly: boardPath.endsWith('/public/board.js'),
      boardHasBundleContent: board.includes('bugdrop-board') && board.includes('fetch('),
      boardHasMountSelectorSupport: board.includes('mountSelector'),
      customizationConfigCompatible: !boardSupportsCustomization || domProof.hasCustomHeading,
      domProof,
      tokenEndpointRequested: cleanRoom.requests.some(
        req => req.path === DEFAULT_HOST_CONFIG.tokenEndpoint
      ),
      itemsEndpointRequested: cleanRoom.requests.some(
        req =>
          req.path === `${DEFAULT_HOST_CONFIG.apiUrl}/boards/${DEFAULT_HOST_CONFIG.boardId}/items`
      ),
      noConsoleErrors: consoleErrors.length === 0,
      noFailedRequests: failedRequests.length === 0,
    };
    assertChecks(checks);

    return {
      package: options.packageName,
      requested: spec,
      installedVersion,
      installAttempt,
      tempDir,
      rootPath,
      boardPath,
      boardAliasPath,
      boardSize: Buffer.byteLength(board),
      checks,
      requests: cleanRoom.requests,
      consoleErrors,
      failedRequests,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (!options.keep) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

function assertChecks(checks) {
  const failed = Object.entries(checks)
    .filter(([, value]) => {
      if (typeof value === 'boolean') return !value;
      if (value && typeof value === 'object') {
        return Object.values(value).some(inner => inner !== true && inner !== 1);
      }
      return false;
    })
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(`Clean-room install smoke failed checks: ${failed.join(', ')}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2), {
    packageName: localPackage.name,
    version: process.env.PACKAGE_VERSION ?? localPackage.version,
  });
  if (options.help) {
    printHelp();
    return;
  }
  console.log(JSON.stringify(await runInstallSmoke(options), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
