#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { boardFromRepo, buildUpsertSql, parseArgs } from './provision-board-core.js';

function printHelp() {
  console.log(`Usage: npm run provision:board -- --repo owner/name [--name "Board Name"] [--local|--remote] [--env staging]

Creates or updates one durable BugDrop Board row in D1 and prints the stable board id.

Examples:
  npm run provision:board -- --repo mean-weasel/demo --name "Demo Board" --local
  npm run provision:board -- --repo mean-weasel/demo --remote
  npm run provision:board -- --repo mean-weasel/demo --remote --env staging`);
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const board = boardFromRepo(options.repo, options.name);
  const wranglerArgs = ['wrangler', 'd1', 'execute', 'DB', options.local ? '--local' : '--remote'];
  if (options.env) {
    wranglerArgs.push('--env', options.env);
  }
  wranglerArgs.push('--command', buildUpsertSql(board));

  const result = spawnSync('npx', wranglerArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  const output = {
    board,
    binding: 'DB',
    mode: options.local ? 'local' : 'remote',
    ...(options.env ? { env: options.env } : {}),
  };
  console.log(JSON.stringify(output, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
