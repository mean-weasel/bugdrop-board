import type { Context } from 'hono';
import { RequestThrottle, type ThrottleAction } from '../lib/request-throttle';
import type { Env } from '../types';

type ApiEnv = { Bindings: Env };

export async function enforceWriteThrottle(
  c: Context<ApiEnv>,
  action: ThrottleAction,
  boardId: string,
  externalUserId: string
): Promise<Response | null> {
  const result = await new RequestThrottle(c.env.DB).check({
    action,
    boardId,
    externalUserId,
    env: c.env,
  });
  if (result.allowed) {
    return null;
  }

  c.header('Retry-After', String(result.retryAfterSeconds));
  return c.json(
    {
      error: 'Rate limit exceeded',
      limit: result.limit,
      windowSeconds: result.windowSeconds,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    429
  );
}
