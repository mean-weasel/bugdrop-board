#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';

const REPO = 'mean-weasel/bugdrop-board';
const ENVIRONMENT = 'staging';
const CLOUDFLARE_ACCOUNT_ID = '341a3846c29902f6363c151395932f5a';
const CLOUDFLARE_API_ORIGIN = 'https://api.cloudflare.com/client/v4';
const DOGFOOD_REPO = 'mean-weasel/bugdrop-board-dogfood';
const DOGFOOD_D1_NAME = 'bugdrop-board-staging';
const MIN_BOARD_SECRET_LENGTH = 32;
const ENV_SECRET_NAMES = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'BOARD_TOKEN_SECRET',
  'ISSUE_ACCESS_TOKEN',
];

function printHelp() {
  console.log(`Usage: node scripts/staging-secrets.js <command>

Commands:
  --status
    List configured staging secret names only.

  --set-account-id
    Set the non-sensitive Cloudflare account id in the staging GitHub Environment.

  --generate-board-secret-file <path>
    Generate BOARD_TOKEN_SECRET into a local ignored file with 0600 permissions.

  --set-from-env
    Set staging secrets from CLOUDFLARE_API_TOKEN, BOARD_TOKEN_SECRET, and
    GITHUB_ISSUE_ACCESS_TOKEN environment variables. Refuses to store the
    current broad gh auth token as ISSUE_ACCESS_TOKEN.

  --verify-env
    Verify required environment variables without printing values. Checks
    BOARD_TOKEN_SECRET strength, Cloudflare token validity/D1 visibility, and
    dogfood GitHub repo/Issues read access.
`);
}

async function run() {
  const [command, value] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === '--status') {
    printSecretStatus();
    return;
  }

  if (command === '--set-account-id') {
    setSecret('CLOUDFLARE_ACCOUNT_ID', CLOUDFLARE_ACCOUNT_ID);
    console.log('Set staging secret: CLOUDFLARE_ACCOUNT_ID');
    return;
  }

  if (command === '--generate-board-secret-file') {
    writeBoardSecretFile(value);
    return;
  }

  if (command === '--set-from-env') {
    setFromEnv();
    return;
  }

  if (command === '--verify-env') {
    await verifyEnv();
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function setFromEnv() {
  const values = {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: requireEnv('CLOUDFLARE_API_TOKEN'),
    BOARD_TOKEN_SECRET: requireEnv('BOARD_TOKEN_SECRET'),
    ISSUE_ACCESS_TOKEN: requireEnv('GITHUB_ISSUE_ACCESS_TOKEN'),
  };

  assertBoardSecretLooksStrong(values.BOARD_TOKEN_SECRET);
  assertIssueTokenIsNotGhAuthToken(values.ISSUE_ACCESS_TOKEN);

  for (const name of ENV_SECRET_NAMES) {
    setSecret(name, values[name]);
    console.log(`Set staging secret: ${name}`);
  }
}

async function verifyEnv() {
  const cloudflareApiToken = requireEnv('CLOUDFLARE_API_TOKEN');
  const boardTokenSecret = requireEnv('BOARD_TOKEN_SECRET');
  const githubIssueToken = requireEnv('GITHUB_ISSUE_ACCESS_TOKEN');

  assertBoardSecretLooksStrong(boardTokenSecret);
  console.log('Verified env secret shape: BOARD_TOKEN_SECRET');

  assertIssueTokenIsNotGhAuthToken(githubIssueToken);
  verifyGitHubIssueToken(githubIssueToken);
  console.log('Verified env secret access: GITHUB_ISSUE_ACCESS_TOKEN');

  await verifyCloudflareToken(cloudflareApiToken);
  console.log('Verified env secret access: CLOUDFLARE_API_TOKEN');
}

function writeBoardSecretFile(path) {
  if (!path) {
    throw new Error('Expected a path after --generate-board-secret-file');
  }

  const fullPath = resolve(path);
  const secret = randomBytes(48).toString('base64');
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `BOARD_TOKEN_SECRET=${secret}\n`, { mode: 0o600, flag: 'wx' });
  console.log(`Wrote BOARD_TOKEN_SECRET to ${fullPath}`);
  console.log(`Load it with: set -a; source ${shellQuote(fullPath)}; set +a`);
}

function printSecretStatus() {
  runCommand('gh', ['secret', 'list', '--env', ENVIRONMENT, '-R', REPO], { allowEmpty: true });
}

function setSecret(name, value) {
  runCommand('gh', ['secret', 'set', name, '--env', ENVIRONMENT, '-R', REPO], {
    input: value,
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function assertBoardSecretLooksStrong(secret) {
  if (secret.length < MIN_BOARD_SECRET_LENGTH) {
    throw new Error(`BOARD_TOKEN_SECRET must be at least ${MIN_BOARD_SECRET_LENGTH} characters`);
  }
}

function assertIssueTokenIsNotGhAuthToken(issueToken) {
  const result = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('Could not compare ISSUE_ACCESS_TOKEN with current gh auth token');
  }

  if (hash(issueToken) === hash(result.stdout.trim())) {
    throw new Error('Refusing to store current broad gh auth token as ISSUE_ACCESS_TOKEN');
  }
}

function verifyGitHubIssueToken(issueToken) {
  runCommand('gh', ['api', `repos/${DOGFOOD_REPO}`, '--jq', '.full_name'], {
    env: { GH_TOKEN: issueToken, GH_PROMPT_DISABLED: '1' },
    silentStdout: true,
  });

  runCommand('gh', ['api', `repos/${DOGFOOD_REPO}/issues?per_page=1`, '--jq', 'length'], {
    env: { GH_TOKEN: issueToken, GH_PROMPT_DISABLED: '1' },
    silentStdout: true,
  });
}

async function verifyCloudflareToken(token) {
  const tokenStatus = await cloudflareRequest('/user/tokens/verify', token);
  if (tokenStatus.result?.status !== 'active') {
    throw new Error('CLOUDFLARE_API_TOKEN is not active');
  }

  const databaseList = await cloudflareRequest(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database?name=${encodeURIComponent(DOGFOOD_D1_NAME)}&per_page=1`,
    token
  );
  const databases = Array.isArray(databaseList.result) ? databaseList.result : [];
  const hasStagingDatabase = databases.some(database => database?.name === DOGFOOD_D1_NAME);

  if (!hasStagingDatabase) {
    throw new Error(`CLOUDFLARE_API_TOKEN cannot see D1 database ${DOGFOOD_D1_NAME}`);
  }
}

async function cloudflareRequest(path, token) {
  const response = await fetch(`${CLOUDFLARE_API_ORIGIN}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    const message = summarizeCloudflareErrors(body);
    throw new Error(`Cloudflare API verification failed for ${path}: ${message}`);
  }

  return body;
}

function summarizeCloudflareErrors(body) {
  if (!body?.errors?.length) {
    return 'request was not successful';
  }

  return body.errors.map(error => error.message || `error ${error.code}`).join('; ');
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    input: options.input,
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  if ((result.stdout || options.allowEmpty) && !options.silentStdout) {
    process.stdout.write(result.stdout);
  }
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
