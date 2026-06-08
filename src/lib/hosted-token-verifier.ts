import type { HostedBoardConfig } from './hosted-config-repository';

interface HostedTokenClaims {
  boardId: string;
  externalUserId: string;
  tenantId?: string;
  appId?: string;
  displayName?: string;
  email?: string;
  exp: number;
  aud?: string;
  iss?: string;
}

export async function verifyHostedBoardToken(
  token: string,
  config: HostedBoardConfig,
  options: { now?: Date } = {}
): Promise<HostedTokenClaims | null> {
  try {
    const verifier = config.tokenVerifier;
    if (!verifier || verifier.status !== 'active') {
      return null;
    }

    const parsed = parseToken(token);
    if (parsed.header.alg !== 'RS256') {
      return null;
    }

    const key =
      verifier.type === 'jwks'
        ? await keyFromJwks(verifier.jwksUrl, verifier.keyId ?? parsed.header.kid)
        : verifier.type === 'public_key'
          ? await keyFromPublicKeyPem(verifier.publicKeyPem)
          : null;
    if (!key) {
      return null;
    }

    const validSignature = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      parsed.signature,
      new TextEncoder().encode(parsed.signingInput)
    );
    if (!validSignature) {
      return null;
    }

    return verifiedClaims(parsed.payload, config, options.now ?? new Date());
  } catch {
    return null;
  }
}

interface TokenHeader {
  alg?: string;
  kid?: string;
}

interface TokenPayload {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  boardId?: unknown;
  tenantId?: unknown;
  appId?: unknown;
  externalUserId?: unknown;
  displayName?: unknown;
  email?: unknown;
  exp?: unknown;
}

interface ParsedToken {
  header: TokenHeader;
  payload: TokenPayload;
  signingInput: string;
  signature: Uint8Array;
}

interface JwksResponse {
  keys?: JwksKey[];
}

interface JwksKey extends JsonWebKey {
  kid?: string;
  alg?: string;
}

function parseToken(token: string): ParsedToken {
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra) {
    throw new Error('Invalid hosted token format');
  }

  return {
    header: parseJsonSegment<TokenHeader>(header),
    payload: parseJsonSegment<TokenPayload>(payload),
    signingInput: `${header}.${payload}`,
    signature: base64UrlDecodeBytes(signature),
  };
}

function verifiedClaims(
  payload: TokenPayload,
  config: HostedBoardConfig,
  now: Date
): HostedTokenClaims | null {
  const verifier = config.tokenVerifier;
  const externalUserId = stringClaim(payload.externalUserId) ?? stringClaim(payload.sub);
  if (
    !verifier ||
    stringClaim(payload.iss) !== verifier.issuer ||
    !audienceMatches(payload.aud, verifier.audience) ||
    stringClaim(payload.boardId) !== config.boardId ||
    stringClaim(payload.tenantId) !== config.tenantId ||
    stringClaim(payload.appId) !== config.appId ||
    !externalUserId ||
    typeof payload.exp !== 'number'
  ) {
    return null;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (payload.exp <= nowSeconds || payload.exp > nowSeconds + verifier.maxTtlSeconds) {
    return null;
  }

  return {
    boardId: config.boardId,
    tenantId: config.tenantId,
    appId: config.appId,
    externalUserId,
    displayName: stringClaim(payload.displayName),
    email: stringClaim(payload.email),
    exp: payload.exp,
    aud: verifier.audience,
    iss: verifier.issuer,
  };
}

async function keyFromJwks(jwksUrl: string | undefined, keyId: string | undefined) {
  if (!jwksUrl) {
    return null;
  }

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    return null;
  }

  const jwks = (await response.json()) as JwksResponse;
  const keys = Array.isArray(jwks.keys) ? jwks.keys : [];
  const jwk = keyId ? keys.find(key => key.kid === keyId) : keys.length === 1 ? keys[0] : undefined;
  if (!jwk || (jwk.alg && jwk.alg !== 'RS256')) {
    return null;
  }

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function keyFromPublicKeyPem(publicKeyPem: string | undefined) {
  if (!publicKeyPem) {
    return null;
  }

  const body = publicKeyPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');
  if (!body) {
    return null;
  }

  return crypto.subtle.importKey(
    'spki',
    base64DecodeBytes(body),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function audienceMatches(value: unknown, expected: string): boolean {
  return value === expected || (Array.isArray(value) && value.includes(expected));
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseJsonSegment<T>(value: string): T {
  return JSON.parse(base64UrlDecodeString(value)) as T;
}

function base64UrlDecodeString(value: string): string {
  const bytes = base64UrlDecodeBytes(value);
  return new TextDecoder().decode(bytes);
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  return base64DecodeBytes(value.replaceAll('-', '+').replaceAll('_', '/'));
}

function base64DecodeBytes(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}
