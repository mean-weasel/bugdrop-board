import { env as workerEnv } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import {
  buildPreviewProvisioningPlan,
  parsePreviewProvisionArgs,
  runPreviewProvision,
} from '../scripts/provision-preview.mjs';
import { PREVIEW_CONTRACT } from '../scripts/validate-preview-config.mjs';

describe('preview provisioning', () => {
  it('builds deterministic distinct demo and CI boards for the one approved repository', () => {
    const plan = buildPreviewProvisioningPlan('123456');
    expect(plan.demo.board).toMatchObject({
      id: PREVIEW_CONTRACT.demoBoardId,
      repoOwner: 'mean-weasel',
      repoName: 'bugdrop-board-widget-test',
    });
    expect(plan.ci.board).toMatchObject({
      id: PREVIEW_CONTRACT.ciBoardId,
      repoOwner: 'mean-weasel',
      repoName: 'bugdrop-board-widget-test',
    });
    expect(plan.demo.tenantId).toBe(PREVIEW_CONTRACT.tenantId);
    expect(plan.demo.appId).toBe(PREVIEW_CONTRACT.appId);
    expect(plan.sql).toContain(PREVIEW_CONTRACT.jwksUrl);
    expect(plan.sql).toContain(PREVIEW_CONTRACT.keyId);
    expect(plan.sql).not.toContain('hmac_legacy');
  });

  it('applies an idempotent exact two-origin RS256/JWKS configuration', async () => {
    const plan = buildPreviewProvisioningPlan('123456');
    await workerEnv.DB.exec(plan.sql);
    await workerEnv.DB.prepare(
      `INSERT INTO hosted_app_origins (id, tenant_id, app_id, origin, status)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        'origin_preview_rogue',
        PREVIEW_CONTRACT.tenantId,
        PREVIEW_CONTRACT.appId,
        'https://evil.example',
        'active'
      )
      .run();
    await workerEnv.DB.prepare(
      `INSERT INTO hosted_app_token_verifiers (
         id, tenant_id, app_id, verifier_type, issuer, audience, jwks_url,
         max_ttl_seconds, status, is_default
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        'verifier_preview_rogue',
        PREVIEW_CONTRACT.tenantId,
        PREVIEW_CONTRACT.appId,
        'jwks',
        'https://evil.example',
        'wrong',
        'https://evil.example/jwks',
        999,
        'active',
        1
      )
      .run();
    await workerEnv.DB.exec(plan.sql);

    const boards = await workerEnv.DB.prepare(
      `SELECT id, repo_owner, repo_name FROM boards
       WHERE id IN (?, ?) ORDER BY id`
    )
      .bind(PREVIEW_CONTRACT.demoBoardId, PREVIEW_CONTRACT.ciBoardId)
      .all();
    expect(boards.results).toHaveLength(2);
    expect(new Set(boards.results.map(row => `${row.repo_owner}/${row.repo_name}`))).toEqual(
      new Set([PREVIEW_CONTRACT.repository])
    );

    const origins = await workerEnv.DB.prepare(
      `SELECT origin FROM hosted_app_origins
       WHERE app_id = ? AND status = 'active' ORDER BY origin`
    )
      .bind(PREVIEW_CONTRACT.appId)
      .all();
    expect(origins.results.map(row => row.origin)).toEqual(
      [PREVIEW_CONTRACT.demoOrigin, PREVIEW_CONTRACT.ciOrigin].sort()
    );

    const verifiers = await workerEnv.DB.prepare(
      `SELECT verifier_type, issuer, audience, jwks_url, key_id, max_ttl_seconds
       FROM hosted_app_token_verifiers WHERE app_id = ? AND status = 'active'`
    )
      .bind(PREVIEW_CONTRACT.appId)
      .all();
    expect(verifiers.results).toEqual([
      expect.objectContaining({
        verifier_type: 'jwks',
        issuer: PREVIEW_CONTRACT.issuer,
        audience: PREVIEW_CONTRACT.audience,
        jwks_url: PREVIEW_CONTRACT.jwksUrl,
        key_id: PREVIEW_CONTRACT.keyId,
        max_ttl_seconds: PREVIEW_CONTRACT.maxTtlSeconds,
      }),
    ]);
  });

  it('is dry-run by default and requires an explicit numeric installation id', () => {
    expect(parsePreviewProvisionArgs(['--installation-id', '123'])).toEqual({
      dryRun: true,
      installationId: '123',
    });
    expect(() => parsePreviewProvisionArgs([], {})).toThrow(/installation id/);
    expect(() => parsePreviewProvisionArgs(['--installation-id', 'not-an-id'])).toThrow(
      /installation id/
    );
    const runner = () => {
      throw new Error('runner must not be called during dry-run');
    };
    expect(runPreviewProvision({ dryRun: true, installationId: '123' }, runner)).toMatchObject({
      dryRun: true,
      repository: PREVIEW_CONTRACT.repository,
    });
  });
});
