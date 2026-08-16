import { env as workerEnv } from 'cloudflare:workers';
import { describe, expect, it, vi } from 'vitest';
import { createApi } from '../src/routes/api';
import type { Env } from '../src/types';
import {
  PREVIEW_CONTRACT,
  validateBuildSha,
  validatePreviewContract,
  validateWranglerPreview,
} from '../scripts/validate-preview-config.mjs';

const BUILD_SHA = 'a'.repeat(40);

describe('preview configuration', () => {
  it('accepts the exact isolated Worker, D1, origin, and RS256 contract', () => {
    expect(validatePreviewContract(PREVIEW_CONTRACT)).toBe(PREVIEW_CONTRACT);
    expect(validateWranglerPreview(wranglerFixture())).toBe(PREVIEW_CONTRACT);
  });

  it.each([
    ['missing origin', { demoOrigin: '' }],
    ['null origin', { ciOrigin: null }],
    ['wildcard origin', { demoOrigin: '*' }],
    ['unapproved origin', { ciOrigin: 'https://preview.example.com' }],
    ['overlapping board ids', { ciBoardId: PREVIEW_CONTRACT.demoBoardId }],
    ['excessive TTL', { maxTtlSeconds: 301 }],
  ])('rejects %s', (_name, override) => {
    expect(() => validatePreviewContract({ ...PREVIEW_CONTRACT, ...override })).toThrow();
  });

  it('rejects malformed build identities', () => {
    expect(validateBuildSha(BUILD_SHA)).toBe(BUILD_SHA);
    for (const value of ['', 'A'.repeat(40), 'a'.repeat(39), 'not-a-sha']) {
      expect(() => validateBuildSha(value)).toThrow(/BUILD_SHA/);
    }
  });

  it('exposes immutable preview provenance on health, API, and board.js responses', async () => {
    const assetFetch = vi.fn().mockResolvedValue(
      new Response('console.log("board")', {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      })
    );
    const env = previewEnv({ fetch: assetFetch } as unknown as Fetcher);
    const api = createApi();

    const health = await api.request('/health', {}, env);
    expect(health.status).toBe(200);
    expect(health.headers.get('x-bugdrop-build-sha')).toBe(BUILD_SHA);
    await expect(health.json()).resolves.toMatchObject({
      environment: 'preview',
      buildSha: BUILD_SHA,
    });

    const board = await api.request('/board.js', {}, env);
    expect(board.status).toBe(200);
    expect(board.headers.get('x-bugdrop-build-sha')).toBe(BUILD_SHA);
    expect(assetFetch).toHaveBeenCalledOnce();

    const unauthorized = await api.request(`/boards/${PREVIEW_CONTRACT.ciBoardId}/items`, {}, env);
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('x-bugdrop-build-sha')).toBe(BUILD_SHA);
  });

  it('fails closed before serving preview routes when BUILD_SHA is absent or invalid', async () => {
    const api = createApi();
    for (const buildSha of [null, '', 'A'.repeat(40)]) {
      const response = await api.request(
        '/health',
        {},
        previewEnv({ fetch: vi.fn() } as unknown as Fetcher, buildSha)
      );
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        error: 'Preview build identity is unavailable',
      });
    }
  });
});

function previewEnv(assets: Fetcher, buildSha: string | null = BUILD_SHA): Env {
  return {
    ENVIRONMENT: 'preview',
    ALLOWED_ORIGINS: `${PREVIEW_CONTRACT.demoOrigin},${PREVIEW_CONTRACT.ciOrigin}`,
    ASSETS: assets,
    DB: workerEnv.DB,
    BOARD_TOKEN_SECRET: '',
    BOARD_TOKEN_AUDIENCE: PREVIEW_CONTRACT.audience,
    BOARD_TOKEN_ISSUER: PREVIEW_CONTRACT.issuer,
    BOARD_TOKEN_MAX_TTL_SECONDS: String(PREVIEW_CONTRACT.maxTtlSeconds),
    BUILD_SHA: buildSha ?? undefined,
  };
}

function wranglerFixture() {
  return `[env.preview]
name = "${PREVIEW_CONTRACT.workerName}"
workers_dev = true

[env.preview.assets]
directory = "public"
binding = "ASSETS"
run_worker_first = ["/board.js"]

[env.preview.vars]
ENVIRONMENT = "preview"
ALLOWED_ORIGINS = "${PREVIEW_CONTRACT.demoOrigin},${PREVIEW_CONTRACT.ciOrigin}"
BOARD_TOKEN_AUDIENCE = "${PREVIEW_CONTRACT.audience}"
BOARD_TOKEN_ISSUER = "${PREVIEW_CONTRACT.issuer}"
BOARD_TOKEN_MAX_TTL_SECONDS = "${PREVIEW_CONTRACT.maxTtlSeconds}"
BUILD_SHA = "${'0'.repeat(40)}"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "${PREVIEW_CONTRACT.d1Name}"
database_id = "${PREVIEW_CONTRACT.d1Id}"
migrations_dir = "migrations"`;
}
