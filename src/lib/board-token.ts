interface BoardTokenClaims {
  boardId: string;
  externalUserId: string;
  displayName?: string;
  email?: string;
  exp: number;
  aud?: string;
  iss?: string;
}

interface VerifyBoardTokenOptions {
  secret: string;
  expectedBoardId: string;
  expectedAudience?: string;
  expectedIssuer?: string;
  maxTtlSeconds?: number;
  now?: Date;
}

const DEFAULT_BOARD_TOKEN_MAX_TTL_SECONDS = 300;

const encoder = new TextEncoder();

export async function createBoardToken(claims: BoardTokenClaims, secret: string): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyBoardToken(
  token: string,
  options: VerifyBoardTokenOptions
): Promise<BoardTokenClaims> {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) {
    throw new Error('Invalid board token format');
  }

  const expected = await sign(payload, options.secret);
  if (!timingSafeEqual(signature, expected)) {
    throw new Error('Invalid board token signature');
  }

  const claims = parseClaims(payload);
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (claims.exp <= nowSeconds) {
    throw new Error('Board token expired');
  }
  if (claims.exp > nowSeconds + maxTtlSeconds(options.maxTtlSeconds)) {
    throw new Error('Board token exceeds maximum TTL');
  }
  if (claims.boardId !== options.expectedBoardId) {
    throw new Error('Board token scope mismatch');
  }
  if (options.expectedAudience && claims.aud !== options.expectedAudience) {
    throw new Error('Board token audience mismatch');
  }
  if (options.expectedIssuer && claims.iss !== options.expectedIssuer) {
    throw new Error('Board token issuer mismatch');
  }
  if (!claims.externalUserId) {
    throw new Error('Board token missing external user id');
  }

  return claims;
}

function maxTtlSeconds(value: number | undefined): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : DEFAULT_BOARD_TOKEN_MAX_TTL_SECONDS;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function parseClaims(payload: string): BoardTokenClaims {
  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as Partial<BoardTokenClaims>;
    if (
      typeof decoded.boardId !== 'string' ||
      typeof decoded.externalUserId !== 'string' ||
      typeof decoded.exp !== 'number'
    ) {
      throw new Error('Invalid board token claims');
    }

    return {
      boardId: decoded.boardId,
      externalUserId: decoded.externalUserId,
      displayName: decoded.displayName,
      email: decoded.email,
      exp: decoded.exp,
      aud: decoded.aud,
      iss: decoded.iss,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid board token claims') {
      throw error;
    }
    throw new Error('Invalid board token payload');
  }
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const binary = atob(padded.replaceAll('-', '+').replaceAll('_', '/'));
  return Array.from(binary, char => char.charCodeAt(0))
    .map(code => String.fromCharCode(code))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}
