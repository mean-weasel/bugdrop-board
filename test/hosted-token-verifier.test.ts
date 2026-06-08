import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyHostedBoardToken } from '../src/lib/hosted-token-verifier';
import type {
  HostedBoardConfig,
  HostedTokenVerifierConfig,
} from '../src/lib/hosted-config-repository';

const now = new Date('2026-06-08T12:00:00.000Z');

describe('hosted token verifier', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies an RS256 token with a matching JWKS key', async () => {
    const keyPair = await generateKeyPair();
    const jwk = await publicJwk(keyPair, 'kid-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ keys: [jwk] })));
    const config = hostedConfig({
      tokenVerifier: verifier({
        type: 'jwks',
        jwksUrl: 'https://app.example.com/.well-known/jwks.json',
        keyId: 'kid-1',
      }),
    });
    const token = await signJwt(
      {
        iss: 'https://app.example.com',
        aud: 'bugdrop-board',
        boardId: config.boardId,
        tenantId: config.tenantId,
        appId: config.appId,
        externalUserId: 'user_1',
        displayName: 'Ada',
        exp: unixSeconds(now) + 60,
      },
      keyPair.privateKey,
      { kid: 'kid-1' }
    );

    await expect(verifyHostedBoardToken(token, config, { now })).resolves.toMatchObject({
      boardId: config.boardId,
      tenantId: config.tenantId,
      appId: config.appId,
      externalUserId: 'user_1',
      displayName: 'Ada',
    });
  });

  it('verifies an RS256 token with an uploaded public key', async () => {
    const keyPair = await generateKeyPair();
    const pem = await publicKeyPem(keyPair.publicKey);
    const config = hostedConfig({
      tokenVerifier: verifier({
        type: 'public_key',
        publicKeyPem: pem,
        keyId: 'kid-public',
      }),
    });
    const token = await signJwt(
      {
        iss: 'https://app.example.com',
        aud: 'bugdrop-board',
        boardId: config.boardId,
        tenantId: config.tenantId,
        appId: config.appId,
        sub: 'subject-user',
        exp: unixSeconds(now) + 60,
      },
      keyPair.privateKey,
      { kid: 'kid-public' }
    );

    await expect(verifyHostedBoardToken(token, config, { now })).resolves.toMatchObject({
      externalUserId: 'subject-user',
    });
  });

  it('fails closed when JWKS does not contain the selected key id', async () => {
    const keyPair = await generateKeyPair();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ keys: [await publicJwk(keyPair, 'other-kid')] }))
    );
    const config = hostedConfig({
      tokenVerifier: verifier({ type: 'jwks', jwksUrl: 'https://app.example.com/jwks' }),
    });
    const token = await validToken(keyPair.privateKey, config, { kid: 'missing-kid' });

    await expect(verifyHostedBoardToken(token, config, { now })).resolves.toBeNull();
  });

  it('fails closed on wrong hosted claims', async () => {
    const keyPair = await generateKeyPair();
    const config = hostedConfig({
      tokenVerifier: verifier({
        type: 'public_key',
        publicKeyPem: await publicKeyPem(keyPair.publicKey),
      }),
    });
    const token = await signJwt(
      {
        iss: 'https://app.example.com',
        aud: 'bugdrop-board',
        boardId: 'board_other',
        tenantId: config.tenantId,
        appId: config.appId,
        externalUserId: 'user_1',
        exp: unixSeconds(now) + 60,
      },
      keyPair.privateKey
    );

    await expect(verifyHostedBoardToken(token, config, { now })).resolves.toBeNull();
  });

  it('fails closed on expired or excessive TTL tokens', async () => {
    const keyPair = await generateKeyPair();
    const config = hostedConfig({
      tokenVerifier: verifier({
        type: 'public_key',
        publicKeyPem: await publicKeyPem(keyPair.publicKey),
        maxTtlSeconds: 300,
      }),
    });
    const expired = await validToken(keyPair.privateKey, config, { exp: unixSeconds(now) - 1 });
    const tooLong = await validToken(keyPair.privateKey, config, { exp: unixSeconds(now) + 301 });

    await expect(verifyHostedBoardToken(expired, config, { now })).resolves.toBeNull();
    await expect(verifyHostedBoardToken(tooLong, config, { now })).resolves.toBeNull();
  });

  it('fails closed on malformed tokens and unsupported algorithms', async () => {
    const keyPair = await generateKeyPair();
    const config = hostedConfig({
      tokenVerifier: verifier({
        type: 'public_key',
        publicKeyPem: await publicKeyPem(keyPair.publicKey),
      }),
    });
    const hs256 = await signJwt(
      {
        iss: 'https://app.example.com',
        aud: 'bugdrop-board',
        boardId: config.boardId,
        tenantId: config.tenantId,
        appId: config.appId,
        externalUserId: 'user_1',
        exp: unixSeconds(now) + 60,
      },
      keyPair.privateKey,
      { alg: 'HS256' }
    );

    await expect(verifyHostedBoardToken('not-a-jwt', config, { now })).resolves.toBeNull();
    await expect(verifyHostedBoardToken(hs256, config, { now })).resolves.toBeNull();
  });
});

function hostedConfig(overrides: Partial<HostedBoardConfig> = {}): HostedBoardConfig {
  return {
    id: 'hosted_config_1',
    tenantId: 'tenant_1',
    appId: 'app_1',
    boardId: 'board_mean_weasel_demo',
    status: 'active',
    activeOrigins: ['https://app.example.com'],
    tokenVerifier: verifier({ type: 'jwks', jwksUrl: 'https://app.example.com/jwks' }),
    ...overrides,
  };
}

function verifier(
  overrides: Partial<HostedTokenVerifierConfig> & Pick<HostedTokenVerifierConfig, 'type'>
): HostedTokenVerifierConfig {
  return {
    id: 'verifier_1',
    type: overrides.type,
    issuer: 'https://app.example.com',
    audience: 'bugdrop-board',
    maxTtlSeconds: 300,
    status: 'active',
    isDefault: overrides.type === 'jwks',
    ...overrides,
  };
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

async function publicKeyPem(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const body =
    base64(new Uint8Array(spki))
      .match(/.{1,64}/g)
      ?.join('\n') ?? '';
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

async function validToken(
  privateKey: CryptoKey,
  config: HostedBoardConfig,
  overrides: Partial<Record<string, unknown>> = {}
): Promise<string> {
  return signJwt(
    {
      iss: config.tokenVerifier?.issuer,
      aud: config.tokenVerifier?.audience,
      boardId: config.boardId,
      tenantId: config.tenantId,
      appId: config.appId,
      externalUserId: 'user_1',
      exp: unixSeconds(now) + 60,
      ...overrides,
    },
    privateKey,
    { kid: typeof overrides.kid === 'string' ? overrides.kid : undefined }
  );
}

async function signJwt(
  claims: Record<string, unknown>,
  privateKey: CryptoKey,
  headerOverrides: Partial<{ alg: string; kid: string }> = {}
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT', ...headerOverrides };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64urlBytes(new Uint8Array(signature))}`;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function base64url(value: string): string {
  return base64urlBytes(new TextEncoder().encode(value));
}

function base64urlBytes(bytes: Uint8Array): string {
  return base64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
