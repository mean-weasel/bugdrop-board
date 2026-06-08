import { boardFromRepo } from './provision-board-core.js';
import { buildHostedSql } from './provision-hosted-board-sql.js';

const ENV_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;
const ID_PART_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const LAYOUTS = new Set(['inline', 'panel', 'kanban']);
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const TOKEN_VERIFIER_TYPES = new Set(['jwks', 'hmac_legacy']);
const SECRET_KEYS = new Set([
  'accesstoken',
  'authorization',
  'bearertoken',
  'githubinstallationtoken',
  'hmacsecret',
  'privatekey',
  'privatekeypem',
  'refreshtoken',
  'secret',
]);

export function parseHostedArgs(argv) {
  const options = { local: true, origins: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--tenant-slug') options.tenantSlug = slugValue(argv, (index += 1), arg);
    else if (arg === '--tenant-name') options.tenantName = value(argv, (index += 1), arg);
    else if (arg === '--app-slug') options.appSlug = slugValue(argv, (index += 1), arg);
    else if (arg === '--app-name') options.appName = value(argv, (index += 1), arg);
    else if (arg === '--repo') options.repo = value(argv, (index += 1), arg);
    else if (arg === '--board-name') options.boardName = value(argv, (index += 1), arg);
    else if (arg === '--origin') options.origins.push(originValue(argv, (index += 1), arg));
    else if (arg === '--issuer') options.issuer = value(argv, (index += 1), arg);
    else if (arg === '--audience') options.audience = value(argv, (index += 1), arg);
    else if (arg === '--verifier-type') {
      options.tokenVerifierType = oneOf(argv, (index += 1), arg, TOKEN_VERIFIER_TYPES);
    } else if (arg === '--jwks-url') options.jwksUrl = httpsUrlValue(argv, (index += 1), arg);
    else if (arg === '--key-id') options.keyId = value(argv, (index += 1), arg);
    else if (arg === '--token-max-ttl-seconds') {
      options.maxTtlSeconds = positiveInteger(argv, (index += 1), arg);
    } else if (arg === '--github-installation-id') {
      options.githubInstallationId = value(argv, (index += 1), arg);
    } else if (arg === '--github-account-login') {
      options.githubAccountLogin = value(argv, (index += 1), arg);
    } else if (arg === '--api-url') options.apiUrl = originValue(argv, (index += 1), arg);
    else if (arg === '--token-endpoint') {
      options.tokenEndpoint = tokenEndpointValue(argv, (index += 1), arg);
    } else if (arg === '--layout') options.layout = oneOf(argv, (index += 1), arg, LAYOUTS);
    else if (arg === '--density') options.density = oneOf(argv, (index += 1), arg, DENSITIES);
    else if (arg === '--color') options.color = value(argv, (index += 1), arg);
    else if (arg === '--config-selector') options.configSelector = value(argv, (index += 1), arg);
    else if (arg === '--env') options.env = envValue(argv, (index += 1), arg);
    else if (arg === '--local') options.local = true;
    else if (arg === '--remote') options.local = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return requireHostedOptions(options);
}

export function buildHostedProvisioningPlan(options) {
  const board = boardFromRepo(options.repo, options.boardName);
  const { ids, sql } = buildHostedSql(options, board);

  return {
    sql,
    board,
    ids,
    handoff: redactHostedSetupOutput({
      tenant: { id: ids.tenantId, slug: options.tenantSlug, name: options.tenantName },
      app: { id: ids.appId, slug: options.appSlug, name: options.appName },
      board,
      origins: options.origins,
      tokenVerifier: {
        id: ids.verifierId,
        type: tokenVerifierType(options),
        issuer: options.issuer,
        audience: options.audience,
        jwksUrl: options.jwksUrl,
        keyId: options.keyId,
        maxTtlSeconds: options.maxTtlSeconds ?? 300,
      },
      githubConnection: {
        id: ids.githubConnectionId,
        installationId: options.githubInstallationId,
        accountLogin: options.githubAccountLogin,
        repo: `${board.repoOwner}/${board.repoName}`,
      },
      embedSnippet: buildEmbedSnippet(board.id, options),
      securityChecklist: securityChecklist(options),
    }),
  };
}

function buildEmbedSnippet(boardId, options) {
  const attrs = [
    ['src', `${options.apiUrl}/board.js`],
    ['data-board-id', boardId],
    ['data-api-url', options.apiUrl],
    ['data-token-endpoint', options.tokenEndpoint],
    ['data-layout', options.layout ?? 'inline'],
    ['data-density', options.density ?? 'comfortable'],
    ['data-color', options.color],
    ['data-config-selector', options.configSelector],
  ].filter(([, attrValue]) => Boolean(attrValue));
  return `<script ${attrs.map(([name, attrValue]) => `${name}="${htmlAttr(attrValue)}"`).join(' ')}></script>`;
}

export function redactHostedSetupOutput(value) {
  if (Array.isArray(value)) {
    return value.map(item => redactHostedSetupOutput(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEYS.has(normalizeKey(key)) ? '[redacted]' : redactHostedSetupOutput(entry),
    ])
  );
}

function securityChecklist(options) {
  const checklist = [
    `Confirm allowed origin list includes only: ${options.origins.join(', ')}`,
    `Confirm host tokens use issuer ${options.issuer}`,
    `Confirm host tokens use audience ${options.audience}`,
    `Confirm GitHub installation ${options.githubInstallationId} is installed on the mirrored repo`,
    'Confirm the host token endpoint returns short-lived { token } responses for authenticated users',
  ];
  if (tokenVerifierType(options) === 'hmac_legacy') {
    checklist.push('Confirm the legacy HMAC token verifier uses the Worker BOARD_TOKEN_SECRET');
    checklist.push('Confirm host tokens include tenantId and appId claims from the setup handoff');
  }
  return checklist;
}

function requireHostedOptions(options) {
  if (options.help) return options;
  const required = [
    'tenantSlug',
    'tenantName',
    'appSlug',
    'appName',
    'repo',
    'issuer',
    'audience',
    'githubInstallationId',
    'apiUrl',
    'tokenEndpoint',
  ];
  for (const key of required) {
    if (!options[key]) throw new Error(`Missing required --${kebab(key)}`);
  }
  if (tokenVerifierType(options) === 'jwks' && !options.jwksUrl) {
    throw new Error('Missing required --jwks-url for jwks verifier type');
  }
  if (options.origins.length === 0) throw new Error('Expected at least one --origin');
  return options;
}

function tokenVerifierType(options) {
  return options.tokenVerifierType ?? 'jwks';
}

function value(argv, index, flag) {
  const next = argv[index];
  if (!next || next.startsWith('--')) throw new Error(`Expected a value after ${flag}`);
  return next;
}

function slugValue(argv, index, flag) {
  const next = value(argv, index, flag);
  if (!ID_PART_PATTERN.test(next)) throw new Error(`Expected ${flag} to be a slug`);
  return next;
}

function envValue(argv, index, flag) {
  const next = value(argv, index, flag);
  if (!ENV_PATTERN.test(next)) throw new Error('Expected --env to contain only safe characters');
  return next;
}

function originValue(argv, index, flag) {
  const parsed = new URL(value(argv, index, flag));
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Expected ${flag} URL`);
  return parsed.origin;
}

function httpsUrlValue(argv, index, flag) {
  const next = value(argv, index, flag);
  const parsed = new URL(next);
  if (parsed.protocol !== 'https:') throw new Error(`Expected ${flag} to be an https URL`);
  return next;
}

function tokenEndpointValue(argv, index, flag) {
  const next = value(argv, index, flag);
  if (!next.startsWith('/') && !/^https:\/\//.test(next)) {
    throw new Error(`Expected ${flag} to be a relative path or https URL`);
  }
  return next;
}

function oneOf(argv, index, flag, allowed) {
  const next = value(argv, index, flag);
  if (!allowed.has(next))
    throw new Error(`Expected ${flag} to be one of ${[...allowed].join(', ')}`);
  return next;
}

function positiveInteger(argv, index, flag) {
  const parsed = Number(value(argv, index, flag));
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected ${flag} to be a positive integer`);
  }
  return parsed;
}

function htmlAttr(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function normalizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function kebab(value) {
  return value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}
