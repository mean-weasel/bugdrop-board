import { env as workerEnv } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { BoardRepository } from '../src/lib/board-repository';
import { HostedConfigRepository } from '../src/lib/hosted-config-repository';

let sequence = 0;

describe('HostedConfigRepository', () => {
  let boards: BoardRepository;
  let hosted: HostedConfigRepository;

  beforeEach(() => {
    boards = new BoardRepository(workerEnv.DB);
    hosted = new HostedConfigRepository(workerEnv.DB);
    sequence += 1;
  });

  it('creates and reads active tenant/app/board config with active origins and jwks default', async () => {
    const board = await boards.upsertBoard({
      repoOwner: 'mean-weasel',
      repoName: `hosted_${sequence}`,
    });
    const tenant = await hosted.createTenant({
      name: 'Mean Weasel',
      slug: `mean-weasel-${sequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Dogfood',
      slug: 'dogfood',
    });
    await hosted.addOrigin({
      tenantId: tenant.id,
      appId: app.id,
      origin: 'https://board.bugdrop.dev',
    });
    await hosted.addOrigin({
      tenantId: tenant.id,
      appId: app.id,
      origin: 'https://disabled.bugdrop.dev',
      status: 'disabled',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'jwks',
      issuer: 'https://bugdrop.dev',
      audience: 'bugdrop-board',
      jwksUrl: 'https://bugdrop.dev/.well-known/jwks.json',
    });
    await hosted.configureBoard({
      tenantId: tenant.id,
      appId: app.id,
      boardId: board.id,
    });

    await expect(hosted.getBoardConfig(board.id)).resolves.toMatchObject({
      tenantId: tenant.id,
      appId: app.id,
      boardId: board.id,
      activeOrigins: ['https://board.bugdrop.dev'],
      tokenVerifier: {
        type: 'jwks',
        issuer: 'https://bugdrop.dev',
        audience: 'bugdrop-board',
        jwksUrl: 'https://bugdrop.dev/.well-known/jwks.json',
        isDefault: true,
      },
    });
  });

  it('supports uploaded public keys and explicit hmac legacy metadata without making hmac default', async () => {
    const tenant = await hosted.createTenant({
      name: 'Beta Tenant',
      slug: `beta-${sequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Beta App',
      slug: 'beta-app',
    });

    const publicKey = await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'public_key',
      issuer: 'https://app.example.com',
      audience: 'bugdrop-board',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\\nexample\\n-----END PUBLIC KEY-----',
      keyId: 'key-1',
      isDefault: true,
    });
    const legacy = await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'hmac_legacy',
      issuer: 'https://app.example.com',
      audience: 'bugdrop-board',
      secretRef: 'legacy-secret',
      isDefault: false,
    });

    expect(publicKey).toMatchObject({ type: 'public_key', isDefault: true, keyId: 'key-1' });
    expect(legacy).toMatchObject({ type: 'hmac_legacy', isDefault: false });
  });

  it('does not return inactive tenant, app, or board configs', async () => {
    const activeBoard = await boards.upsertBoard({
      repoOwner: 'mean-weasel',
      repoName: `active_${sequence}`,
    });
    const inactiveBoard = await boards.upsertBoard({
      repoOwner: 'mean-weasel',
      repoName: `inactive_${sequence}`,
    });
    const tenant = await hosted.createTenant({
      name: 'Paused Tenant',
      slug: `paused-${sequence}`,
      status: 'paused',
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Paused App',
      slug: 'paused-app',
    });
    await hosted.configureBoard({
      tenantId: tenant.id,
      appId: app.id,
      boardId: activeBoard.id,
    });

    const activeTenant = await hosted.createTenant({
      name: 'Active Tenant',
      slug: `active-${sequence}`,
    });
    const activeApp = await hosted.createApp({
      tenantId: activeTenant.id,
      name: 'Active App',
      slug: 'active-app',
    });
    await hosted.configureBoard({
      tenantId: activeTenant.id,
      appId: activeApp.id,
      boardId: inactiveBoard.id,
      status: 'disabled',
    });

    await expect(hosted.getBoardConfig(activeBoard.id)).resolves.toBeNull();
    await expect(hosted.getBoardConfig(inactiveBoard.id)).resolves.toBeNull();
  });
});
