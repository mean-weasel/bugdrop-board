#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const rootRequire = createRequire(import.meta.url);
const localPackage = rootRequire('../package.json');

function parseArgs(argv) {
  const options = {
    packageName: localPackage.name,
    version: process.env.PACKAGE_VERSION ?? localPackage.version,
    retries: 3,
    retryDelayMs: 5000,
    keep: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--package') {
      options.packageName = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--version') {
      options.version = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--retries') {
      options.retries = parseInteger(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--retry-delay-ms') {
      options.retryDelayMs = parseInteger(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--keep') {
      options.keep = true;
      continue;
    }
    if (arg === '--help') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseInteger(flag, value) {
  const parsed = Number.parseInt(requireValue(flag, value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: npm run release:smoke -- [--version 0.1.0] [--package @scope/name]

Installs the published npm package into a temporary project and verifies the public entrypoints.

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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const spec = `${options.packageName}@${options.version}`;
  const tempDir = await mkdtemp(join(tmpdir(), 'bugdrop-board-package-smoke-'));

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
    const npmTree = JSON.parse(run('npm', ['ls', options.packageName, '--json'], tempDir));
    const installedVersion = npmTree.dependencies?.[options.packageName]?.version;

    const checks = {
      rootMatchesBoard: rootPath === boardPath,
      boardAliasMatches: boardAliasPath === boardPath,
      boardPathEndsCorrectly: boardPath.endsWith('/public/board.js'),
      boardHasContent: board.length > 1000,
      containsWidgetTag: board.includes('bugdrop-board'),
      containsFetchUsage: board.includes('fetch('),
      installedVersion: installedVersion === options.version || options.version === 'latest',
    };

    const failed = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);

    const output = {
      package: options.packageName,
      requested: spec,
      installedVersion,
      installAttempt,
      tempDir,
      boardPath,
      boardSize: Buffer.byteLength(board),
      checks,
    };

    console.log(JSON.stringify(output, null, 2));

    if (failed.length > 0) {
      throw new Error(`Package smoke failed checks: ${failed.join(', ')}`);
    }
  } finally {
    if (!options.keep) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
