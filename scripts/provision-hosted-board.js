#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { buildHostedProvisioningPlan, parseHostedArgs } from './provision-hosted-board-core.js';

function printHelp() {
  console.log(`Usage: npm run provision:hosted-board -- --tenant-slug slug --tenant-name "Tenant" --app-slug app --app-name "App" --repo owner/name --origin https://app.example.com --issuer https://app.example.com --audience bugdrop-board --jwks-url https://app.example.com/.well-known/jwks.json --github-installation-id 123 --api-url https://board.bugdrop.dev --token-endpoint /api/bugdrop-board-token [--local|--remote] [--env production] [--dry-run]

Creates or updates one hosted BugDrop Board setup in D1 and prints a redacted setup handoff.

Examples:
  npm run provision:hosted-board -- --tenant-slug mean-weasel --tenant-name "Mean Weasel" --app-slug dogfood --app-name "Dogfood" --repo mean-weasel/demo --origin https://bugdrop.dev --issuer https://bugdrop.dev --audience bugdrop-board --jwks-url https://bugdrop.dev/.well-known/jwks.json --github-installation-id 123456 --api-url https://board.bugdrop.dev --token-endpoint /api/bugdrop-board-token --dry-run
  npm run provision:hosted-board -- --tenant-slug mean-weasel --tenant-name "Mean Weasel" --app-slug dogfood --app-name "Dogfood" --repo mean-weasel/demo --origin https://bugdrop.dev --issuer https://bugdrop.dev --audience bugdrop-board --jwks-url https://bugdrop.dev/.well-known/jwks.json --github-installation-id 123456 --api-url https://board.bugdrop.dev --token-endpoint /api/bugdrop-board-token --remote --env production`);
}

function run() {
  const options = parseHostedArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const plan = buildHostedProvisioningPlan(options);
  if (!options.dryRun) {
    const wranglerArgs = [
      'wrangler',
      'd1',
      'execute',
      'DB',
      options.local ? '--local' : '--remote',
    ];
    if (options.env) wranglerArgs.push('--env', options.env);
    wranglerArgs.push('--command', plan.sql);

    const result = spawnSync('npx', wranglerArgs, { encoding: 'utf8' });
    if (result.status !== 0) {
      process.stderr.write(result.stderr || result.stdout);
      process.exit(result.status ?? 1);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: options.local ? 'local' : 'remote',
        ...(options.env ? { env: options.env } : {}),
        dryRun: options.dryRun === true,
        board: plan.board,
        handoff: plan.handoff,
        ...(options.dryRun ? { sql: plan.sql } : {}),
      },
      null,
      2
    )
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
