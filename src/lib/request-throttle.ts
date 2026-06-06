import type { Env } from '../types';

export type ThrottleAction = 'create_item' | 'toggle_upvote' | 'list_items' | 'list_events';

interface ThrottleInput {
  action: ThrottleAction;
  boardId: string;
  externalUserId: string;
  env: Env;
}

interface ThrottleCheck {
  allowed: boolean;
  limit: number;
  count: number;
  retryAfterSeconds: number;
  windowSeconds: number;
}

interface ThrottleConfig {
  limit: number;
  windowSeconds: number;
}

interface ThrottleRow {
  count: number;
}

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_CREATE_ITEM_LIMIT = 5;
const DEFAULT_UPVOTE_LIMIT = 60;
const DEFAULT_LIST_ITEMS_LIMIT = 120;
const DEFAULT_LIST_EVENTS_LIMIT = 180;

export class RequestThrottle {
  constructor(private readonly db: D1Database) {}

  async check(input: ThrottleInput): Promise<ThrottleCheck> {
    const config = throttleConfig(input.env, input.action);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(nowSeconds / config.windowSeconds) * config.windowSeconds;
    const retryAfterSeconds = Math.max(1, windowStart + config.windowSeconds - nowSeconds);
    const key = throttleKey(input.action, input.boardId, input.externalUserId);
    const row = await this.db
      .prepare(
        `INSERT INTO request_throttle_windows (
           key, action, board_id, external_user_id, window_start, count, expires_at
         )
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET
           window_start = CASE
             WHEN request_throttle_windows.window_start = excluded.window_start
               THEN request_throttle_windows.window_start
             ELSE excluded.window_start
           END,
           count = CASE
             WHEN request_throttle_windows.window_start = excluded.window_start
               THEN request_throttle_windows.count + 1
             ELSE 1
           END,
           expires_at = excluded.expires_at,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         RETURNING count`
      )
      .bind(
        key,
        input.action,
        input.boardId,
        input.externalUserId,
        windowStart,
        windowStart + config.windowSeconds * 2
      )
      .first<ThrottleRow>();

    const count = row?.count ?? config.limit + 1;
    return {
      allowed: count <= config.limit,
      limit: config.limit,
      count,
      retryAfterSeconds,
      windowSeconds: config.windowSeconds,
    };
  }
}

function throttleConfig(env: Env, action: ThrottleAction): ThrottleConfig {
  const windowSeconds = positiveInteger(
    env.REQUEST_THROTTLE_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS
  );
  if (action === 'create_item') {
    return {
      limit: positiveInteger(env.ITEM_CREATE_RATE_LIMIT, DEFAULT_CREATE_ITEM_LIMIT),
      windowSeconds,
    };
  }
  if (action === 'toggle_upvote') {
    return {
      limit: positiveInteger(env.UPVOTE_RATE_LIMIT, DEFAULT_UPVOTE_LIMIT),
      windowSeconds,
    };
  }
  if (action === 'list_items') {
    return {
      limit: positiveInteger(env.ITEM_READ_RATE_LIMIT, DEFAULT_LIST_ITEMS_LIMIT),
      windowSeconds,
    };
  }
  return {
    limit: positiveInteger(env.EVENTS_POLL_RATE_LIMIT, DEFAULT_LIST_EVENTS_LIMIT),
    windowSeconds,
  };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function throttleKey(action: ThrottleAction, boardId: string, externalUserId: string): string {
  return [action, boardId, externalUserId].join(':');
}
