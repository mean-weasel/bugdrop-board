#!/usr/bin/env node

import process from 'node:process';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const options = {
    url: process.env.DEPLOY_SMOKE_URL,
    expectEnvironment: process.env.DEPLOY_SMOKE_EXPECT_ENVIRONMENT,
    corsOrigin: process.env.DEPLOY_SMOKE_CORS_ORIGIN,
    corsBoardId: process.env.DEPLOY_SMOKE_CORS_BOARD_ID,
    corsTokenEndpoint: process.env.DEPLOY_SMOKE_CORS_TOKEN_ENDPOINT,
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
    if (arg === '--cors-origin') {
      options.corsOrigin = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--cors-board-id') {
      options.corsBoardId = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--cors-token-endpoint') {
      options.corsTokenEndpoint = requireValue(arg, next);
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
Optionally verifies browser CORS for authenticated board reads when all --cors-* flags are provided.

Options:
  --url <url>                       Worker base URL. Can also use DEPLOY_SMOKE_URL.
  --expect-environment <name>       Optional expected /health environment value. Can also use DEPLOY_SMOKE_EXPECT_ENVIRONMENT.
  --cors-origin <origin>            Browser origin expected in Access-Control-Allow-Origin. Can also use DEPLOY_SMOKE_CORS_ORIGIN.
  --cors-board-id <id>              Board id used for authenticated /items and /events checks. Can also use DEPLOY_SMOKE_CORS_BOARD_ID.
  --cors-token-endpoint <url>       Endpoint returning { "token": "payload.signature" }. Can also use DEPLOY_SMOKE_CORS_TOKEN_ENDPOINT.`);
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

async function fetchJson(url, fetchImpl, init) {
  const response = await fetchImpl(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${text.slice(0, 200)}`);
  }
  try {
    return { response, json: JSON.parse(text) };
  } catch {
    throw new Error(`${url} did not return JSON: ${text.slice(0, 200)}`);
  }
}

async function fetchHead(url, fetchImpl) {
  const response = await fetchImpl(url, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response;
}

export async function runSmoke(options, fetchImpl = fetch) {
  const baseUrl = normalizeBaseUrl(options.url);
  const healthUrl = new URL('/health', baseUrl);
  const boardUrl = new URL('/board.js', baseUrl);

  const { json: health } = await fetchJson(healthUrl, fetchImpl);
  if (health.status !== 'ok') {
    throw new Error(`${healthUrl} returned non-ok status: ${JSON.stringify(health)}`);
  }
  if (options.expectEnvironment && health.environment !== options.expectEnvironment) {
    throw new Error(
      `${healthUrl} returned environment ${health.environment}, expected ${options.expectEnvironment}`
    );
  }

  const boardResponse = await fetchHead(boardUrl, fetchImpl);
  const contentType = boardResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('javascript')) {
    throw new Error(`${boardUrl} returned unexpected content-type: ${contentType || '<missing>'}`);
  }

  const result = {
    url: baseUrl.toString(),
    health,
    board: {
      url: boardUrl.toString(),
      status: boardResponse.status,
      contentType,
      cacheStatus: boardResponse.headers.get('cf-cache-status'),
      etag: boardResponse.headers.get('etag'),
    },
  };

  if (hasAnyCorsOption(options)) {
    result.cors = await verifyCors(baseUrl, options, fetchImpl);
  }

  return result;
}

function hasAnyCorsOption(options) {
  return Boolean(options.corsOrigin || options.corsBoardId || options.corsTokenEndpoint);
}

async function verifyCors(baseUrl, options, fetchImpl) {
  requireCorsOptions(options);

  const origin = options.corsOrigin;
  const boardId = options.corsBoardId;
  const tokenEndpoint = new URL(options.corsTokenEndpoint);
  const { json: tokenBody } = await fetchJson(tokenEndpoint, fetchImpl);
  const token = tokenBody.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(`${tokenEndpoint} did not return a token string`);
  }

  const itemsUrl = new URL(`/boards/${boardId}/items`, baseUrl);
  const eventsUrl = new URL(`/boards/${boardId}/events?since=0`, baseUrl);
  const preflight = await fetchImpl(itemsUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization',
    },
  });
  if (!preflight.ok) {
    throw new Error(`${itemsUrl} preflight returned ${preflight.status}`);
  }
  assertAllowOrigin(itemsUrl, preflight, origin);

  const headers = { Authorization: `Bearer ${token}`, Origin: origin };
  const items = await fetchJson(itemsUrl, fetchImpl, { headers });
  assertAllowOrigin(itemsUrl, items.response, origin);
  const events = await fetchJson(eventsUrl, fetchImpl, { headers });
  assertAllowOrigin(eventsUrl, events.response, origin);

  return {
    origin,
    boardId,
    tokenShape: token
      .split('.')
      .map(part => part.length)
      .join('.'),
    preflight: corsResponseSummary(preflight),
    items: corsResponseSummary(items.response),
    events: corsResponseSummary(events.response),
  };
}

function requireCorsOptions(options) {
  const missing = [];
  if (!options.corsOrigin) missing.push('--cors-origin');
  if (!options.corsBoardId) missing.push('--cors-board-id');
  if (!options.corsTokenEndpoint) missing.push('--cors-token-endpoint');
  if (missing.length > 0) {
    throw new Error(`Browser CORS smoke requires ${missing.join(', ')}`);
  }
}

function assertAllowOrigin(url, response, expectedOrigin) {
  const actual = response.headers.get('access-control-allow-origin');
  if (actual !== expectedOrigin) {
    throw new Error(
      `${url} returned Access-Control-Allow-Origin ${actual ?? '<missing>'}, expected ${expectedOrigin}`
    );
  }
}

function corsResponseSummary(response) {
  return {
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin'),
    allowMethods: response.headers.get('access-control-allow-methods'),
    allowHeaders: response.headers.get('access-control-allow-headers'),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  console.log(JSON.stringify(await runSmoke(options), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
