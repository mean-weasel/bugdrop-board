#!/usr/bin/env node

import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs, runDoctor } from './doctor-selfhost-core.js';

function printHelp() {
  console.log(`Usage: npm run doctor:selfhost -- [options]

Runs non-mutating self-host setup diagnostics for BugDrop Board.

Options:
  --env <name>                  Wrangler environment to inspect. Defaults to production.
  --host-origin <origin>        Host app origin expected in ALLOWED_ORIGINS.
  --worker-url <url>            Deployed Worker URL used to compose follow-up smoke command.
  --token-endpoint <url>        Host endpoint returning { "token": "payload.signature" }.
  --repo <owner/name>           GitHub mirror repo used to verify board id shape.
  --board-id <id>               Board id expected for the repo.
  --check-cloudflare-auth       Run non-mutating npx wrangler whoami.
  --check-github-token          Check ISSUE_ACCESS_TOKEN can read --repo metadata.
  --json                        Emit JSON only.
  --help                        Show this help.`);
}

function printHuman(result) {
  console.log(
    `BugDrop Board self-host doctor: ${result.ok ? 'pass' : 'fail'} (${result.summary.pass} pass, ${result.summary.warn} warn, ${result.summary.fail} fail)`
  );
  for (const item of result.checks) {
    console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
  }
  if (result.nextCommands.deploySmoke) {
    console.log(`\nNext smoke:\n${result.nextCommands.deploySmoke}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const result = await runDoctor(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
  if (!result.ok) {
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
