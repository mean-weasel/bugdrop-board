import { env as workerEnv } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRepository } from '../src/lib/board-repository';
import { createBoardToken } from '../src/lib/board-token';
import { HostedConfigRepository } from '../src/lib/hosted-config-repository';
import { createApi } from '../src/routes/api';
import type { Env } from '../src/types';

const TOKEN_SECRET = 'security-gate-secret';
const TOKEN_AUDIENCE = 'bugdrop-board';
const TOKEN_ISSUER = 'https://hosted.example.com';
let sequence = 0;
let boards: BoardRepository;
let repoName: string;

function env(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'https://fallback.example.com',
    ASSETS: {} as Fetcher,
    DB: workerEnv.DB,
    BOARD_TOKEN_SECRET: TOKEN_SECRET,
    BOARD_TOKEN_AUDIENCE: TOKEN_AUDIENCE,
    BOARD_TOKEN_ISSUER: TOKEN_ISSUER,
    ...overrides,
  };
}

describe('hosted beta security gate', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sequence += 1;
    boards = new BoardRepository(workerEnv.DB);
    repoName = `security_gate_${sequence}`;
  });

  it('allows only provisioned hosted origins for CORS', async () => {
    const setup = await setupHostedJwksBoard();
    const api = createApi();

    const allowed = await api.request(
      `/boards/${setup.board.id}/items`,
      { method: 'OPTIONS', headers: { Origin: 'https://app.example.com' } },
      env({ ALLOWED_ORIGINS: 'https://fallback.example.com' })
    );
    const denied = await api.request(
      `/boards/${setup.board.id}/items`,
      { method: 'OPTIONS', headers: { Origin: 'https://fallback.example.com' } },
      env({ ALLOWED_ORIGINS: 'https://fallback.example.com' })
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect(denied.status).toBe(204);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('fails closed for hosted token TTL, issuer, audience, key, tenant, app, and board drift', async () => {
    const currentKey = await generateKeyPair();
    const oldKey = await generateKeyPair();
    const setup = await setupHostedJwksBoard({ keyPair: currentKey });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ keys: [await publicJwk(currentKey, 'current')] }))
    );
    const api = createApi();
    const now = Math.floor(Date.now() / 1000);
    const validClaims = {
      iss: TOKEN_ISSUER,
      aud: TOKEN_AUDIENCE,
      boardId: setup.board.id,
      tenantId: setup.tenant.id,
      appId: setup.app.id,
      externalUserId: 'viewer',
      exp: now + 60,
    };
    const cases = [
      { name: 'ttl', claims: { ...validClaims, exp: now + 301 }, key: currentKey.privateKey },
      {
        name: 'issuer',
        claims: { ...validClaims, iss: 'https://wrong.example.com' },
        key: currentKey.privateKey,
      },
      {
        name: 'audience',
        claims: { ...validClaims, aud: 'wrong-audience' },
        key: currentKey.privateKey,
      },
      {
        name: 'tenant',
        claims: { ...validClaims, tenantId: 'tenant_other' },
        key: currentKey.privateKey,
      },
      { name: 'app', claims: { ...validClaims, appId: 'app_other' }, key: currentKey.privateKey },
      {
        name: 'board',
        claims: { ...validClaims, boardId: 'board_other' },
        key: currentKey.privateKey,
      },
      { name: 'key', claims: validClaims, key: oldKey.privateKey },
    ];

    const valid = await api.request(
      `/boards/${setup.board.id}/items`,
      { headers: { Authorization: `Bearer ${await signJwt(validClaims, currentKey.privateKey)}` } },
      env()
    );
    expect(valid.status).toBe(200);

    for (const item of cases) {
      const token = await signJwt(item.claims, item.key, { kid: 'current' });
      const res = await api.request(
        `/boards/${setup.board.id}/items`,
        { headers: { Authorization: `Bearer ${token}` } },
        env()
      );
      expect(res.status, item.name).toBe(401);
    }
  });

  it('fails GitHub repo mismatch before D1 item or event persistence', async () => {
    const setup = await setupHostedHmacBoard({ githubRepoName: `${repoName}_other` });
    const api = createApi();
    const token = await hmacToken(setup.board.id, setup.tenant.id, setup.app.id);

    const res = await api.request(
      `/boards/${setup.board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Add SSO', description: 'Enterprise users need SSO.' }),
      },
      env({
        GITHUB_APP_ID: '12345',
        GITHUB_APP_PRIVATE_KEY: await privateKeyPem((await generateKeyPair()).privateKey),
      })
    );

    expect(res.status).toBe(500);
    await expect(boards.listItems(setup.board.id)).resolves.toHaveLength(0);
    await expect(boards.listEvents(setup.board.id, 0)).resolves.toHaveLength(0);
  });

  it('rate limits hosted reads and event polling with retry metadata', async () => {
    const setup = await setupHostedHmacBoard();
    const api = createApi();
    const token = await hmacToken(setup.board.id, setup.tenant.id, setup.app.id);
    const gateEnv = env({
      REQUEST_THROTTLE_WINDOW_SECONDS: '60',
      ITEM_READ_RATE_LIMIT: '1',
      EVENTS_POLL_RATE_LIMIT: '1',
    });

    expect(
      (
        await api.request(
          `/boards/${setup.board.id}/items`,
          { headers: { Authorization: `Bearer ${token}` } },
          gateEnv
        )
      ).status
    ).toBe(200);
    const readLimited = await api.request(
      `/boards/${setup.board.id}/items`,
      { headers: { Authorization: `Bearer ${token}` } },
      gateEnv
    );
    expect(readLimited.status).toBe(429);
    await expect(readLimited.json()).resolves.toMatchObject({
      error: 'Rate limit exceeded',
      limit: 1,
    });
    expect(readLimited.headers.get('Retry-After')).toMatch(/^\d+$/);

    expect(
      (
        await api.request(
          `/boards/${setup.board.id}/events`,
          { headers: { Authorization: `Bearer ${token}` } },
          gateEnv
        )
      ).status
    ).toBe(200);
    const eventsLimited = await api.request(
      `/boards/${setup.board.id}/events`,
      { headers: { Authorization: `Bearer ${token}` } },
      gateEnv
    );
    expect(eventsLimited.status).toBe(429);
    await expect(eventsLimited.json()).resolves.toMatchObject({
      error: 'Rate limit exceeded',
      limit: 1,
    });
  });

  it('keeps hosted event payloads free of signed host user identifiers', async () => {
    const setup = await setupHostedHmacBoard();
    const api = createApi({
      createIssueCreator: () => ({
        createIssue: () => Promise.resolve({ number: 7, htmlUrl: 'https://github.example/7' }),
      }),
    });
    const creator = await hmacToken(setup.board.id, setup.tenant.id, setup.app.id, {
      externalUserId: 'creator_private_id',
      displayName: 'Creator Private Name',
    });

    const created = await api.request(
      `/boards/${setup.board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${creator}` },
        body: JSON.stringify({ title: 'Add exports', description: 'CSV export for admins.' }),
      },
      env()
    );
    const itemId = ((await created.json()) as { item: { id: string } }).item.id;
    const voter = await hmacToken(setup.board.id, setup.tenant.id, setup.app.id, {
      externalUserId: 'voter_private_id',
      displayName: 'Voter Private Name',
    });
    await api.request(
      `/boards/${setup.board.id}/items/${itemId}/upvote`,
      { method: 'POST', headers: { Authorization: `Bearer ${voter}` } },
      env()
    );

    const viewer = await hmacToken(setup.board.id, setup.tenant.id, setup.app.id, {
      externalUserId: 'viewer_private_id',
    });
    const events = await api.request(
      `/boards/${setup.board.id}/events`,
      { headers: { Authorization: `Bearer ${viewer}` } },
      env()
    );
    const body = await events.json();
    const serialized = JSON.stringify(body);

    expect(serialized).toContain(itemId);
    expect(serialized).not.toContain('creator_private_id');
    expect(serialized).not.toContain('voter_private_id');
    expect(serialized).not.toContain('viewer_private_id');
    expect(serialized).not.toContain('Creator Private Name');
    expect(serialized).not.toContain('Voter Private Name');
  });
});

async function setupHostedJwksBoard(input: { keyPair?: CryptoKeyPair } = {}) {
  const keyPair = input.keyPair ?? (await generateKeyPair());
  const board = await boardRepo().upsertBoard({ repoOwner: 'mean-weasel', repoName });
  const { tenant, app } = await baseHostedConfig(board.id);
  await hostedRepo().createTokenVerifier({
    tenantId: tenant.id,
    appId: app.id,
    type: 'jwks',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    jwksUrl: 'https://app.example.com/.well-known/jwks.json',
    keyId: 'current',
    maxTtlSeconds: 300,
  });
  await hostedRepo().configureBoard({ tenantId: tenant.id, appId: app.id, boardId: board.id });
  return { board, tenant, app, keyPair };
}

async function setupHostedHmacBoard(input: { githubRepoName?: string } = {}) {
  const board = await boardRepo().upsertBoard({ repoOwner: 'mean-weasel', repoName });
  const { tenant, app } = await baseHostedConfig(board.id);
  await hostedRepo().createTokenVerifier({
    tenantId: tenant.id,
    appId: app.id,
    type: 'hmac_legacy',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    secretRef: 'worker-secret',
  });
  const connection = await hostedRepo().createGitHubConnection({
    tenantId: tenant.id,
    appId: app.id,
    installationId: '98765',
    repoOwner: 'mean-weasel',
    repoName: input.githubRepoName ?? repoName,
    status: 'active',
  });
  await hostedRepo().configureBoard({
    tenantId: tenant.id,
    appId: app.id,
    boardId: board.id,
    githubConnectionId: connection.id,
  });
  return { board, tenant, app };
}

async function baseHostedConfig(boardId: string) {
  const tenant = await hostedRepo().createTenant({
    name: `Security Tenant ${sequence}`,
    slug: `security-tenant-${sequence}-${boardId}`,
  });
  const app = await hostedRepo().createApp({
    tenantId: tenant.id,
    name: 'Security App',
    slug: `security-app-${sequence}`,
  });
  await hostedRepo().addOrigin({
    tenantId: tenant.id,
    appId: app.id,
    origin: 'https://app.example.com',
  });
  return { tenant, app };
}

function boardRepo() {
  return new BoardRepository(workerEnv.DB);
}

function hostedRepo() {
  return new HostedConfigRepository(workerEnv.DB);
}

async function hmacToken(
  boardId: string,
  tenantId: string,
  appId: string,
  overrides: Partial<{ externalUserId: string; displayName: string }> = {}
) {
  return createBoardToken(
    {
      boardId,
      tenantId,
      appId,
      externalUserId: overrides.externalUserId ?? 'viewer',
      displayName: overrides.displayName,
      exp: Math.floor(Date.now() / 1000) + 60,
      aud: TOKEN_AUDIENCE,
      iss: TOKEN_ISSUER,
    },
    TOKEN_SECRET
  );
}

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
}

async function publicJwk(keyPair: CryptoKeyPair, kid: string): Promise<JsonWebKey> {
  return {
    ...(await crypto.subtle.exportKey('jwk', keyPair.publicKey)),
    kid,
    alg: 'RS256',
    use: 'sig',
  };
}

async function signJwt(
  claims: Record<string, unknown>,
  privateKey: CryptoKey,
  headerOverrides: Partial<{ kid: string }> = {}
) {
  const header = { alg: 'RS256', typ: 'JWT', ...headerOverrides };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64urlBytes(new Uint8Array(signature))}`;
}

async function privateKeyPem(privateKey: CryptoKey): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey));
  const body =
    btoa(String.fromCharCode(...bytes))
      .match(/.{1,64}/g)
      ?.join('\n') ?? '';
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
}

function base64url(value: string): string {
  return base64urlBytes(new TextEncoder().encode(value));
}

function base64urlBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
