import { Hono } from 'hono';
import type { Env } from '../types';

type ApiEnv = { Bindings: Env };

const api = new Hono<ApiEnv>();

api.get('/health', c => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

export default api;
