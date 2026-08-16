#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const options = {
    url: process.env.DEPLOY_SMOKE_URL,
    expectEnvironment: process.env.DEPLOY_SMOKE_EXPECT_ENVIRONMENT,
    corsOrigin: process.env.DEPLOY_SMOKE_CORS_ORIGIN,
    corsDisallowedOrigin: process.env.DEPLOY_SMOKE_CORS_DISALLOWED_ORIGIN,
    corsBoardId: process.env.DEPLOY_SMOKE_CORS_BOARD_ID,
    corsTokenEndpoint: process.env.DEPLOY_SMOKE_CORS_TOKEN_ENDPOINT,
    expectBuildSha: process.env.DEPLOY_SMOKE_EXPECT_BUILD_SHA,
    localBoardPath: process.env.DEPLOY_SMOKE_LOCAL_BOARD_PATH,
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
    if (arg === '--cors-disallowed-origin') {
      options.corsDisallowedOrigin = requireValue(arg, next);
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
    if (arg === '--expect-build-sha') {
      options.expectBuildSha = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--local-board-path') {
      options.localBoardPath = requireValue(arg, next);
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
  --cors-disallowed-origin <origin> Browser origin expected not to receive Access-Control-Allow-Origin. Can also use DEPLOY_SMOKE_CORS_DISALLOWED_ORIGIN.
  --cors-board-id <id>              Board id used for authenticated /items and /events checks. Can also use DEPLOY_SMOKE_CORS_BOARD_ID.
  --cors-token-endpoint <url>       POST endpoint returning { "token": "payload.signature" }. Can also use DEPLOY_SMOKE_CORS_TOKEN_ENDPOINT.
  --expect-build-sha <sha>          Required preview BUILD_SHA. Can also use DEPLOY_SMOKE_EXPECT_BUILD_SHA.
  --local-board-path <path>         Local board.js to hash-match before preview mutation. Can also use DEPLOY_SMOKE_LOCAL_BOARD_PATH.`);
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

async function fetchAsset(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return { response, bytes: new Uint8Array(await response.arrayBuffer()) };
}

export async function runSmoke(options, fetchImpl = fetch, readFileImpl = readFile) {
  const baseUrl = normalizeBaseUrl(options.url);
  const healthUrl = new URL('/health', baseUrl);
  const boardUrl = new URL('/board.js', baseUrl);

  const { response: healthResponse, json: health } = await fetchJson(healthUrl, fetchImpl);
  if (health.status !== 'ok') {
    throw new Error(`${healthUrl} returned non-ok status: ${JSON.stringify(health)}`);
  }
  if (options.expectEnvironment && health.environment !== options.expectEnvironment) {
    throw new Error(
      `${healthUrl} returned environment ${health.environment}, expected ${options.expectEnvironment}`
    );
  }

  if (health.environment === 'preview') {
    requirePreviewProvenanceOptions(options);
    assertBuildIdentity(healthUrl, healthResponse, health, options.expectBuildSha);
  }

  const { response: boardResponse, bytes: boardBytes } = await fetchAsset(boardUrl, fetchImpl);
  const contentType = boardResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('javascript')) {
    throw new Error(`${boardUrl} returned unexpected content-type: ${contentType || '<missing>'}`);
  }
  let boardSha256;
  if (health.environment === 'preview') {
    assertBuildHeader(boardUrl, boardResponse, options.expectBuildSha);
    const localBytes = await readFileImpl(options.localBoardPath);
    const localSha256 = sha256(localBytes);
    boardSha256 = sha256(boardBytes);
    if (boardSha256 !== localSha256) {
      throw new Error(
        `${boardUrl} SHA-256 ${boardSha256} does not match local board.js ${localSha256}`
      );
    }
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
      ...(boardSha256 ? { sha256: boardSha256 } : {}),
    },
  };

  if (hasAnyCorsOption(options)) {
    result.cors = await verifyCors(baseUrl, options, fetchImpl);
  }

  return result;
}

function hasAnyCorsOption(options) {
  return Boolean(
    options.corsOrigin ||
    options.corsDisallowedOrigin ||
    options.corsBoardId ||
    options.corsTokenEndpoint
  );
}

async function verifyCors(baseUrl, options, fetchImpl) {
  requireCorsOptions(options);

  const origin = options.corsOrigin;
  const boardId = options.corsBoardId;
  const tokenEndpoint = new URL(options.corsTokenEndpoint);
  const { json: tokenBody } = await fetchJson(tokenEndpoint, fetchImpl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: '{}',
  });
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
  assertOptionalBuildHeader(itemsUrl, preflight, options.expectBuildSha);

  const headers = { Authorization: `Bearer ${token}`, Origin: origin };
  const items = await fetchJson(itemsUrl, fetchImpl, { headers });
  assertAllowOrigin(itemsUrl, items.response, origin);
  assertOptionalBuildHeader(itemsUrl, items.response, options.expectBuildSha);
  const events = await fetchJson(eventsUrl, fetchImpl, { headers });
  assertAllowOrigin(eventsUrl, events.response, origin);
  assertOptionalBuildHeader(eventsUrl, events.response, options.expectBuildSha);

  const result = {
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
  if (options.corsDisallowedOrigin) {
    result.disallowed = await verifyDisallowedCors(
      baseUrl,
      boardId,
      token,
      options.corsDisallowedOrigin,
      fetchImpl,
      options.expectBuildSha
    );
  }
  return result;
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

async function verifyDisallowedCors(baseUrl, boardId, token, origin, fetchImpl, expectBuildSha) {
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
  assertDisallowedOrigin(itemsUrl, preflight, origin);
  assertOptionalBuildHeader(itemsUrl, preflight, expectBuildSha);

  const headers = { Authorization: `Bearer ${token}`, Origin: origin };
  const items = await fetchJson(itemsUrl, fetchImpl, { headers });
  assertDisallowedOrigin(itemsUrl, items.response, origin);
  assertOptionalBuildHeader(itemsUrl, items.response, expectBuildSha);
  const events = await fetchJson(eventsUrl, fetchImpl, { headers });
  assertDisallowedOrigin(eventsUrl, events.response, origin);
  assertOptionalBuildHeader(eventsUrl, events.response, expectBuildSha);

  return {
    origin,
    preflight: corsResponseSummary(preflight),
    items: corsResponseSummary(items.response),
    events: corsResponseSummary(events.response),
  };
}

function requirePreviewProvenanceOptions(options) {
  if (!/^[a-f0-9]{40}$/.test(options.expectBuildSha ?? '')) {
    throw new Error('Preview smoke requires an exact lowercase 40-character --expect-build-sha');
  }
  if (!options.localBoardPath) {
    throw new Error('Preview smoke requires --local-board-path for immutable widget proof');
  }
}

function assertBuildIdentity(url, response, body, expected) {
  if (body.buildSha !== expected) {
    throw new Error(
      `${url} returned buildSha ${body.buildSha ?? '<missing>'}, expected ${expected}`
    );
  }
  assertBuildHeader(url, response, expected);
}

function assertOptionalBuildHeader(url, response, expected) {
  if (expected) assertBuildHeader(url, response, expected);
}

function assertBuildHeader(url, response, expected) {
  const actual = response.headers.get('x-bugdrop-build-sha');
  if (actual !== expected) {
    throw new Error(
      `${url} returned X-BugDrop-Build-Sha ${actual ?? '<missing>'}, expected ${expected}`
    );
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertDisallowedOrigin(url, response, disallowedOrigin) {
  const actual = response.headers.get('access-control-allow-origin');
  if (actual === disallowedOrigin || actual === '*') {
    throw new Error(
      `${url} returned Access-Control-Allow-Origin ${actual}, expected no CORS access for ${disallowedOrigin}`
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
