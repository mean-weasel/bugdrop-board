#!/usr/bin/env node

import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { buildHostedProvisioningPlan } from './provision-hosted-board-core.js';
import { PREVIEW_CONTRACT, validatePreviewContract } from './validate-preview-config.mjs';

const INSTALLATION_ID_PATTERN = /^[1-9][0-9]*$/;

export function parsePreviewProvisionArgs(argv, environment = process.env) {
  const options = {
    dryRun: true,
    installationId: environment.BUGDROP_BOARD_PREVIEW_RUNTIME_INSTALLATION_ID,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--installation-id') {
      options.installationId = requiredValue(argv, (index += 1), arg);
    } else if (arg === '--remote') {
      options.dryRun = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.help && !INSTALLATION_ID_PATTERN.test(options.installationId ?? '')) {
    throw new Error('A numeric preview runtime GitHub installation id is required');
  }
  return options;
}

export function buildPreviewProvisioningPlan(installationId) {
  const contract = validatePreviewContract(PREVIEW_CONTRACT);
  if (!INSTALLATION_ID_PATTERN.test(installationId ?? '')) {
    throw new Error('A numeric preview runtime GitHub installation id is required');
  }
  const shared = {
    tenantSlug: contract.tenantSlug,
    tenantName: 'BugDrop Board Preview',
    appSlug: contract.appSlug,
    appName: 'BugDrop Board Preview Venue',
    repo: contract.repository,
    origins: [contract.demoOrigin, contract.ciOrigin],
    issuer: contract.issuer,
    audience: contract.audience,
    tokenVerifierType: 'jwks',
    jwksUrl: contract.jwksUrl,
    keyId: contract.keyId,
    maxTtlSeconds: contract.maxTtlSeconds,
    githubInstallationId: installationId,
    githubAccountLogin: 'mean-weasel',
    apiUrl: contract.workerOrigin,
  };
  const demo = buildHostedProvisioningPlan({
    ...shared,
    boardId: contract.demoBoardId,
    boardName: 'BugDrop Board Preview Demo',
    tokenEndpoint: '/api/board-token?mode=demo&viewer=ada',
  });
  const ci = buildHostedProvisioningPlan({
    ...shared,
    boardId: contract.ciBoardId,
    boardName: 'BugDrop Board Preview CI',
    tokenEndpoint: '/api/board-token?mode=ci&viewer=ada',
  });
  assertExpectedIds(demo, ci, contract);

  return {
    contract,
    demo: publicBoardPlan(demo),
    ci: publicBoardPlan(ci),
    sql: compactSql([demo.sql, ci.sql, hardeningSql(demo, contract)].join('\n\n')),
  };
}

export function runPreviewProvision(options, runner) {
  const plan = buildPreviewProvisioningPlan(options.installationId);
  if (!options.dryRun) {
    if (!runner) throw new Error('Remote preview provisioning requires a command runner');
    const result = runner(
      'npx',
      ['wrangler', 'd1', 'execute', 'DB', '--remote', '--env', 'preview', '--command', plan.sql],
      { encoding: 'utf8' }
    );
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || 'Preview provisioning failed');
    }
  }
  return {
    dryRun: options.dryRun,
    environment: plan.contract.environment,
    workerOrigin: plan.contract.workerOrigin,
    repository: plan.contract.repository,
    boards: [plan.demo, plan.ci],
    sql: plan.sql,
  };
}

function hardeningSql(plan, contract) {
  const origins = [contract.demoOrigin, contract.ciOrigin].map(sql).join(', ');
  return `UPDATE hosted_app_origins
SET status = 'disabled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE app_id = ${sql(contract.appId)} AND origin NOT IN (${origins});

UPDATE hosted_app_token_verifiers
SET status = 'disabled', is_default = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE app_id = ${sql(contract.appId)} AND id <> ${sql(plan.ids.verifierId)};

UPDATE hosted_github_connections
SET status = 'disabled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE app_id = ${sql(contract.appId)} AND id <> ${sql(plan.ids.githubConnectionId)};

UPDATE hosted_board_configs
SET status = 'disabled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE app_id = ${sql(contract.appId)}
  AND board_id NOT IN (${sql(contract.demoBoardId)}, ${sql(contract.ciBoardId)});`;
}

function assertExpectedIds(demo, ci, contract) {
  if (demo.board.id !== contract.demoBoardId || ci.board.id !== contract.ciBoardId) {
    throw new Error('Preview provisioning produced unexpected board ids');
  }
  if (demo.board.id === ci.board.id) {
    throw new Error('Preview provisioning requires distinct board ids');
  }
  for (const plan of [demo, ci]) {
    if (plan.ids.tenantId !== contract.tenantId || plan.ids.appId !== contract.appId) {
      throw new Error('Preview provisioning produced unexpected tenant or app ids');
    }
  }
}

function publicBoardPlan(plan) {
  return {
    board: plan.board,
    tenantId: plan.ids.tenantId,
    appId: plan.ids.appId,
    verifierId: plan.ids.verifierId,
    githubConnectionId: plan.ids.githubConnectionId,
  };
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function compactSql(value) {
  return value
    .split(';')
    .map(statement => statement.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(statement => `${statement};`)
    .join('\n');
}

function printHelp() {
  console.log(`Usage: npm run provision:preview -- --installation-id 123 [--dry-run|--remote]

Dry-run is the default. --remote writes only the fixed preview tenant, app, demo/CI boards,
origins, RS256 JWKS verifier, and dedicated companion repository connection.`);
}

async function main() {
  const options = parsePreviewProvisionArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const runner = options.dryRun ? undefined : (await import('node:child_process')).spawnSync;
  console.log(JSON.stringify(runPreviewProvision(options, runner), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
