#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const PREVIEW_CONTRACT = Object.freeze({
  environment: 'preview',
  workerName: 'bugdrop-board-preview',
  workerOrigin: 'https://bugdrop-board-preview.neonwatty.workers.dev',
  d1Name: 'bugdrop-board-preview',
  d1Id: 'd8b341bd-8be8-45f3-90d8-231abe398781',
  repository: 'mean-weasel/bugdrop-board-widget-test',
  repositoryId: 'R_kgDOT5iiFg',
  tenantId: 'tenant_preview',
  tenantSlug: 'preview',
  appId: 'app_preview_board',
  appSlug: 'board',
  demoBoardId: 'board_preview_demo',
  ciBoardId: 'board_preview_ci',
  demoOrigin: 'https://bugdrop-board-widget-test.vercel.app',
  ciOrigin: 'https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app',
  issuer: 'https://bugdrop-board-widget-test.vercel.app',
  audience: 'bugdrop-board',
  jwksUrl: 'https://bugdrop-board-widget-test.vercel.app/api/jwks',
  keyId: 'preview-2026-01',
  maxTtlSeconds: 300,
});

const SHA_PATTERN = /^[a-f0-9]{40}$/;

export function validatePreviewContract(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Preview contract is required');
  }

  for (const key of Object.keys(PREVIEW_CONTRACT)) {
    if (candidate[key] !== PREVIEW_CONTRACT[key]) {
      throw new Error(`Preview contract ${key} is missing or unapproved`);
    }
  }
  const origins = [candidate.demoOrigin, candidate.ciOrigin];
  if (origins.some(origin => !origin || origin === '*' || new URL(origin).origin !== origin)) {
    throw new Error('Preview origins must be exact approved origins');
  }
  if (new Set(origins).size !== 2) {
    throw new Error('Preview origins must be distinct');
  }
  if (!candidate.demoBoardId || candidate.demoBoardId === candidate.ciBoardId) {
    throw new Error('Preview board ids must be non-empty and distinct');
  }
  if (candidate.maxTtlSeconds > 300) {
    throw new Error('Preview token TTL must not exceed 300 seconds');
  }
  return candidate;
}

export function validateBuildSha(value) {
  if (!SHA_PATTERN.test(value ?? '')) {
    throw new Error('BUILD_SHA must be an exact lowercase 40-character Git SHA');
  }
  return value;
}

export function validateWranglerPreview(text) {
  const contract = validatePreviewContract(PREVIEW_CONTRACT);
  const environment = parseTomlSection(text, 'env.preview');
  const assets = parseTomlSection(text, 'env.preview.assets');
  const variables = parseTomlSection(text, 'env.preview.vars');
  const database = parseTomlSection(text, 'env.preview.d1_databases', true);

  requireEqual(environment.name, contract.workerName, 'preview Worker name');
  requireEqual(environment.workers_dev, 'true', 'preview workers_dev');
  requireEqual(assets.directory, 'public', 'preview asset directory');
  requireEqual(assets.binding, 'ASSETS', 'preview asset binding');
  requireEqual(assets.run_worker_first, '["/board.js"]', 'preview board.js routing');
  requireEqual(variables.ENVIRONMENT, contract.environment, 'preview environment');
  requireEqual(
    variables.ALLOWED_ORIGINS,
    `${contract.demoOrigin},${contract.ciOrigin}`,
    'preview allowed origins'
  );
  requireEqual(variables.BOARD_TOKEN_ISSUER, contract.issuer, 'preview issuer');
  requireEqual(variables.BOARD_TOKEN_AUDIENCE, contract.audience, 'preview audience');
  requireEqual(
    variables.BOARD_TOKEN_MAX_TTL_SECONDS,
    String(contract.maxTtlSeconds),
    'preview token TTL'
  );
  validateBuildSha(variables.BUILD_SHA);
  requireEqual(database.binding, 'DB', 'preview D1 binding');
  requireEqual(database.database_name, contract.d1Name, 'preview D1 name');
  requireEqual(database.database_id, contract.d1Id, 'preview D1 id');
  requireEqual(database.migrations_dir, 'migrations', 'preview migrations directory');
  return contract;
}

function parseTomlSection(text, name, array = false) {
  const escaped = name.replaceAll('.', '\\.');
  const open = array ? `\\[\\[${escaped}\\]\\]` : `\\[${escaped}\\]`;
  const match = new RegExp(`${open}\\n([\\s\\S]*?)(?=\\n\\[|$)`).exec(text);
  if (!match) {
    throw new Error(`Missing [${name}] preview configuration`);
  }

  return Object.fromEntries(
    match[1]
      .split('\n')
      .map(line => line.replace(/\s+#.*$/, '').trim())
      .filter(Boolean)
      .map(line => {
        const separator = line.indexOf('=');
        if (separator < 1) throw new Error(`Invalid preview configuration line: ${line}`);
        return [line.slice(0, separator).trim(), unquote(line.slice(separator + 1).trim())];
      })
  );
}

function unquote(value) {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must be ${expected}; received ${actual ?? '<missing>'}`);
  }
}

function main() {
  const path = process.argv[2] ?? 'wrangler.toml';
  const contract = validateWranglerPreview(readFileSync(path, 'utf8'));
  console.log(
    JSON.stringify(
      {
        valid: true,
        workerOrigin: contract.workerOrigin,
        d1Id: contract.d1Id,
        origins: [contract.demoOrigin, contract.ciOrigin],
        boardIds: [contract.demoBoardId, contract.ciBoardId],
        verifier: {
          algorithm: 'RS256',
          jwksUrl: contract.jwksUrl,
          issuer: contract.issuer,
          audience: contract.audience,
          keyId: contract.keyId,
          maxTtlSeconds: contract.maxTtlSeconds,
        },
      },
      null,
      2
    )
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
