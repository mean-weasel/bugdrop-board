#!/usr/bin/env node

import process from 'node:process';

function parseArgs(argv) {
  const options = {
    url: process.env.DEPLOY_SMOKE_URL,
    expectEnvironment: process.env.DEPLOY_SMOKE_EXPECT_ENVIRONMENT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--url') {
      options.url = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--expect-environment') {
      options.expectEnvironment = requireValue(arg, next);
      index += 1;
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

function printHelp() {
  console.log(`Usage: npm run deploy:smoke -- --url https://worker.example.com

Verifies a deployed BugDrop Board Worker by checking /health and /board.js.

Options:
  --url <url>                       Worker base URL. Can also use DEPLOY_SMOKE_URL.
  --expect-environment <name>       Optional expected /health environment value. Can also use DEPLOY_SMOKE_EXPECT_ENVIRONMENT.`);
}

function normalizeBaseUrl(value) {
  if (!value) {
    throw new Error('Missing Worker URL. Pass --url or set DEPLOY_SMOKE_URL.');
  }
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} did not return JSON: ${text.slice(0, 200)}`);
  }
}

async function fetchHead(url) {
  const response = await fetch(url, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const baseUrl = normalizeBaseUrl(options.url);
  const healthUrl = new URL('/health', baseUrl);
  const boardUrl = new URL('/board.js', baseUrl);

  const health = await fetchJson(healthUrl);
  if (health.status !== 'ok') {
    throw new Error(`${healthUrl} returned non-ok status: ${JSON.stringify(health)}`);
  }
  if (options.expectEnvironment && health.environment !== options.expectEnvironment) {
    throw new Error(
      `${healthUrl} returned environment ${health.environment}, expected ${options.expectEnvironment}`
    );
  }

  const boardResponse = await fetchHead(boardUrl);
  const contentType = boardResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('javascript')) {
    throw new Error(`${boardUrl} returned unexpected content-type: ${contentType || '<missing>'}`);
  }

  console.log(
    JSON.stringify(
      {
        url: baseUrl.toString(),
        health,
        board: {
          url: boardUrl.toString(),
          status: boardResponse.status,
          contentType,
          cacheStatus: boardResponse.headers.get('cf-cache-status'),
          etag: boardResponse.headers.get('etag'),
        },
      },
      null,
      2
    )
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
