import type { Context } from 'hono';
import { verifyBoardToken } from '../lib/board-token';
import { parseCreateItemInput } from '../lib/validation';
import type { Env } from '../types';

type ApiEnv = { Bindings: Env };
type BoardTokenClaims = Awaited<ReturnType<typeof verifyBoardToken>>;

type AuthorizedRequest = { ok: true; claims: BoardTokenClaims } | { ok: false; response: Response };

export function applyCorsHeaders(c: Context<ApiEnv>): void {
  const origin = c.req.header('Origin');
  const allowedOrigin = allowedCorsOrigin(c.env.ALLOWED_ORIGINS, origin);
  if (!allowedOrigin) {
    return;
  }

  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  c.header('Access-Control-Max-Age', '600');
}

export async function authorizeBoardRequest(
  c: Context<ApiEnv>,
  boardId: string
): Promise<AuthorizedRequest> {
  const token = parseBearerToken(c.req.header('Authorization'));
  if (!token) {
    return { ok: false, response: c.json({ error: 'Missing bearer token' }, 401) };
  }
  if (!c.env.BOARD_TOKEN_SECRET) {
    return { ok: false, response: c.json({ error: 'Board token secret is not configured' }, 500) };
  }

  const claims = await verifyToken(token, c.env, boardId);
  if (!claims) {
    return { ok: false, response: c.json({ error: 'Invalid board token' }, 401) };
  }

  return { ok: true, claims };
}

export function parseSince(value: string | undefined) {
  if (typeof value === 'undefined') {
    return { ok: true as const, value: 0 };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false as const, error: 'Since cursor must be a nonnegative integer' };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false as const, error: 'Since cursor must be a safe integer' };
  }

  return { ok: true as const, value: parsed };
}

export async function parseJsonBody(request: Request) {
  try {
    return { ok: true as const, value: parseCreateItemInput(await request.json()) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Invalid JSON body',
    };
  }
}

function allowedCorsOrigin(allowedOrigins: string, origin: string | undefined): string | null {
  if (!origin) {
    return null;
  }
  if (allowedOrigins === '*') {
    return '*';
  }

  const allowed = allowedOrigins
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function parseBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function verifyToken(token: string, env: Env, boardId: string) {
  try {
    return await verifyBoardToken(token, {
      secret: env.BOARD_TOKEN_SECRET,
      expectedBoardId: boardId,
      expectedAudience: env.BOARD_TOKEN_AUDIENCE,
      expectedIssuer: env.BOARD_TOKEN_ISSUER,
    });
  } catch {
    return null;
  }
}
