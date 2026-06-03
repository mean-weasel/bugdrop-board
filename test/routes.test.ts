import { describe, expect, it } from 'vitest';
import api from '../src/routes/api';
import type { Env } from '../src/types';

function env(): Env {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: '*',
    ASSETS: {} as Fetcher,
  };
}

describe('api routes', () => {
  it('returns health status', async () => {
    const res = await api.request('/health', {}, env());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'ok',
      environment: 'test',
    });
  });
});
