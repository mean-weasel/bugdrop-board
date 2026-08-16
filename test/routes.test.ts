import { env as workerEnv } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRepository } from '../src/lib/board-repository';
import { createBoardToken } from '../src/lib/board-token';
import type { IssueCreator } from '../src/lib/github';
import { HostedConfigRepository } from '../src/lib/hosted-config-repository';
import { createApi } from '../src/routes/api';
import type { Env } from '../src/types';

const TOKEN_SECRET = 'test-secret';
const TOKEN_AUDIENCE = 'bugdrop-board';
const TOKEN_ISSUER = 'test-host';
let testSequence = 0;

function env(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: '*',
    ASSETS: {} as Fetcher,
    DB: workerEnv.DB,
    BOARD_TOKEN_SECRET: TOKEN_SECRET,
    BOARD_TOKEN_AUDIENCE: TOKEN_AUDIENCE,
    BOARD_TOKEN_ISSUER: TOKEN_ISSUER,
    ...overrides,
  };
}

async function boardToken(
  boardId: string,
  overrides: Partial<{
    boardId: string;
    externalUserId: string;
    displayName: string;
    tenantId: string;
    appId: string;
  }> = {}
) {
  return createBoardToken(
    {
      boardId: overrides.boardId ?? boardId,
      externalUserId: overrides.externalUserId ?? 'user_1',
      tenantId: overrides.tenantId,
      appId: overrides.appId,
      displayName: overrides.displayName ?? 'Ada',
      exp: Math.floor(Date.now() / 1000) + 60,
      aud: TOKEN_AUDIENCE,
      iss: TOKEN_ISSUER,
    },
    TOKEN_SECRET
  );
}

function createIssueCreator(
  createIssue = vi
    .fn()
    .mockResolvedValue({ number: 7, htmlUrl: 'https://github.com/mean-weasel/demo/issues/7' })
): IssueCreator {
  return { createIssue };
}

describe('api routes', () => {
  let repo: BoardRepository;
  let hosted: HostedConfigRepository;
  let repoName: string;

  beforeEach(() => {
    repo = new BoardRepository(workerEnv.DB);
    hosted = new HostedConfigRepository(workerEnv.DB);
    testSequence += 1;
    repoName = `demo_${testSequence}`;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns health status', async () => {
    const api = createApi();
    const res = await api.request('/health', {}, env());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: 'ok',
      environment: 'test',
    });
  });

  it('redirects the worker root to the live dogfood board host page', async () => {
    const api = createApi();
    const res = await api.request('/', {}, env());

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://bugdrop.dev/board-dogfood');
  });

  it('rejects item creation without a bearer token', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const issueCreator = createIssueCreator();
    const api = createApi({ createIssueCreator: () => issueCreator });

    const res = await api.request(
      `/boards/${board.id}/items`,
      { method: 'POST', body: JSON.stringify({ title: 'Add SSO' }) },
      env()
    );

    expect(res.status).toBe(401);
    expect(issueCreator.createIssue).not.toHaveBeenCalled();
  });

  it('rejects item creation with a token scoped to another board', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const token = await boardToken(board.id, { boardId: 'board_other_repo' });
    const issueCreator = createIssueCreator();
    const api = createApi({ createIssueCreator: () => issueCreator });

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Add SSO' }),
      },
      env()
    );

    expect(res.status).toBe(401);
    expect(issueCreator.createIssue).not.toHaveBeenCalled();
  });

  it('rejects invalid item input before creating a GitHub issue', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const token = await boardToken(board.id);
    const issueCreator = createIssueCreator();
    const api = createApi({ createIssueCreator: () => issueCreator });

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'no' }),
      },
      env()
    );

    expect(res.status).toBe(400);
    expect(issueCreator.createIssue).not.toHaveBeenCalled();
  });

  it('creates one GitHub issue and stores its metadata on the board item', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const token = await boardToken(board.id);
    const createIssue = vi.fn().mockResolvedValue({
      number: 7,
      htmlUrl: 'https://github.com/mean-weasel/demo/issues/7',
    });
    const api = createApi({ createIssueCreator: () => createIssueCreator(createIssue) });

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: '  Add SSO  ',
          description: '  Enterprise users need SSO.  ',
          externalUserId: 'browser_supplied_user',
        }),
      },
      env()
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      item: { id: string; githubIssueNumber: number; githubIssueUrl: string };
    };
    expect(createIssue).toHaveBeenCalledOnce();
    expect(createIssue).toHaveBeenCalledWith({
      owner: 'mean-weasel',
      repo: repoName,
      title: 'Add SSO',
      description: 'Enterprise users need SSO.',
      boardItemId: body.item.id,
    });
    expect(body.item).toMatchObject({
      githubIssueNumber: 7,
      githubIssueUrl: 'https://github.com/mean-weasel/demo/issues/7',
    });
    expect(JSON.stringify(body)).not.toContain('createdByExternalUserId');
    expect(JSON.stringify(body)).not.toContain('user_1');

    await expect(repo.getItem(board.id, body.item.id)).resolves.toMatchObject({
      title: 'Add SSO',
      description: 'Enterprise users need SSO.',
      githubIssueNumber: 7,
      githubIssueUrl: 'https://github.com/mean-weasel/demo/issues/7',
      createdByExternalUserId: 'user_1',
      createdByDisplayName: 'Ada',
    });
    const events = await repo.listEvents(board.id, 0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'item_created', itemId: body.item.id });
  });

  it('does not persist a board item when GitHub issue creation fails', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const token = await boardToken(board.id);
    const issueCreator = createIssueCreator(vi.fn().mockRejectedValue(new Error('GitHub failed')));
    const api = createApi({ createIssueCreator: () => issueCreator });

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Add SSO', description: 'Enterprise users need SSO.' }),
      },
      env()
    );

    expect(res.status).toBe(502);
    expect(issueCreator.createIssue).toHaveBeenCalledOnce();
    await expect(repo.listItems(board.id)).resolves.toHaveLength(0);
    await expect(repo.listEvents(board.id, 0)).resolves.toHaveLength(0);
  });

  it('rejects unknown boards before creating a GitHub issue', async () => {
    const token = await boardToken('board_missing');
    const issueCreator = createIssueCreator();
    const api = createApi({ createIssueCreator: () => issueCreator });

    const res = await api.request(
      '/boards/board_missing/items',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Add SSO' }),
      },
      env()
    );

    expect(res.status).toBe(404);
    expect(issueCreator.createIssue).not.toHaveBeenCalled();
  });

  it('returns board items with viewer-specific upvote state', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
      githubIssueNumber: 7,
      githubIssueUrl: 'https://github.com/mean-weasel/demo/issues/7',
    });
    await repo.toggleUpvote(board.id, item.id, 'user_2');
    const api = createApi();

    const viewerTwo = await api.request(
      `/boards/${board.id}/items`,
      {
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, { externalUserId: 'user_2' })}`,
        },
      },
      env()
    );
    const viewerThree = await api.request(
      `/boards/${board.id}/items`,
      {
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, { externalUserId: 'user_3' })}`,
        },
      },
      env()
    );

    expect(viewerTwo.status).toBe(200);
    const viewerTwoBody = await viewerTwo.json();
    expect(viewerTwoBody).toMatchObject({
      items: [
        {
          id: item.id,
          status: 'open',
          githubIssueNumber: 7,
          githubIssueUrl: 'https://github.com/mean-weasel/demo/issues/7',
          upvoteCount: 1,
          viewerHasUpvoted: true,
        },
      ],
    });
    expect(JSON.stringify(viewerTwoBody)).not.toContain('createdByExternalUserId');
    expect(JSON.stringify(viewerTwoBody)).not.toContain('user_1');
    expect(viewerThree.status).toBe(200);
    await expect(viewerThree.json()).resolves.toMatchObject({
      items: [{ id: item.id, upvoteCount: 1, viewerHasUpvoted: false }],
    });
  });

  it('toggles upvotes for the signed app user', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const token = await boardToken(board.id, { externalUserId: 'user_2' });
    const api = createApi();

    const upvoted = await api.request(
      `/boards/${board.id}/items/${item.id}/upvote`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ externalUserId: 'browser_supplied_user' }),
      },
      env()
    );
    const removed = await api.request(
      `/boards/${board.id}/items/${item.id}/upvote`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ externalUserId: 'browser_supplied_user' }),
      },
      env()
    );

    expect(upvoted.status).toBe(200);
    const upvotedBody = await upvoted.json();
    expect(upvotedBody).toMatchObject({
      item: {
        id: item.id,
        upvoteCount: 1,
        viewerHasUpvoted: true,
      },
    });
    expect(JSON.stringify(upvotedBody)).not.toContain('createdByExternalUserId');
    expect(JSON.stringify(upvotedBody)).not.toContain('user_1');
    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toMatchObject({
      item: {
        id: item.id,
        upvoteCount: 0,
        viewerHasUpvoted: false,
      },
    });
    await expect(repo.getItem(board.id, item.id)).resolves.toMatchObject({ upvoteCount: 0 });
    const events = await repo.listEvents(board.id, 0);
    expect(events.map(event => event.eventType)).toEqual([
      'item_created',
      'upvote_added',
      'upvote_removed',
    ]);
    expect(events[1]).toMatchObject({ payload: { itemId: item.id } });
    expect(JSON.stringify(events)).not.toContain('user_2');
  });

  it('returns ordered events after the since cursor', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const [created] = await repo.listEvents(board.id, 0);
    const api = createApi();
    await api.request(
      `/boards/${board.id}/items/${item.id}/upvote`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, { externalUserId: 'user_2' })}`,
        },
      },
      env()
    );

    const res = await api.request(
      `/boards/${board.id}/events?since=${created.id}`,
      {
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, { externalUserId: 'user_3' })}`,
        },
      },
      env()
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      cursor: number;
      events: Array<{ id: number; eventType: string; itemId: string }>;
    };
    expect(body.cursor).toBeGreaterThan(created.id);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      eventType: 'upvote_added',
      itemId: item.id,
    });
  });

  it('rejects invalid event cursors', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const api = createApi();

    const res = await api.request(
      `/boards/${board.id}/events?since=-1`,
      { headers: { Authorization: `Bearer ${await boardToken(board.id)}` } },
      env()
    );

    expect(res.status).toBe(400);
  });

  it('rejects wrong-scope event polling without exposing another board event log', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_a` });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_b` });
    const item = await repo.createItem({
      boardId: boardA.id,
      title: 'Private roadmap item',
      description: 'Only board A viewers should poll this.',
      externalUserId: 'user_1',
    });
    const boardAToken = await boardToken(boardA.id);
    const api = createApi();

    const res = await api.request(
      `/boards/${boardB.id}/events?since=0`,
      { headers: { Authorization: `Bearer ${boardAToken}` } },
      env()
    );

    expect(res.status).toBe(401);
    const body = await res.text();
    expect(body).not.toContain(item.id);
    expect(body).not.toContain('item_created');
    expect(body).not.toContain('Private roadmap item');
    await expect(repo.listEvents(boardA.id, 0)).resolves.toMatchObject([
      { eventType: 'item_created', itemId: item.id },
    ]);
    await expect(repo.listEvents(boardB.id, 0)).resolves.toHaveLength(0);
  });

  it('rejects wrong-scope board reads and upvotes', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_a` });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_b` });
    const item = await repo.createItem({
      boardId: boardA.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const boardAToken = await boardToken(boardA.id);
    const api = createApi();

    const read = await api.request(
      `/boards/${boardB.id}/items`,
      { headers: { Authorization: `Bearer ${boardAToken}` } },
      env()
    );
    const upvote = await api.request(
      `/boards/${boardB.id}/items/${item.id}/upvote`,
      { method: 'POST', headers: { Authorization: `Bearer ${boardAToken}` } },
      env()
    );

    expect(read.status).toBe(401);
    expect(upvote.status).toBe(401);
    await expect(repo.getItem(boardA.id, item.id)).resolves.toMatchObject({ upvoteCount: 0 });
    await expect(repo.listItems(boardB.id)).resolves.toHaveLength(0);
  });

  it('uses hosted app origins for board route CORS when hosted config exists', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const tenant = await hosted.createTenant({
      name: 'Mean Weasel',
      slug: `tenant-${testSequence}`,
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
    await hosted.configureBoard({ tenantId: tenant.id, appId: app.id, boardId: board.id });
    const api = createApi();

    const allowed = await api.request(
      `/boards/${board.id}/items`,
      { method: 'OPTIONS', headers: { Origin: 'https://board.bugdrop.dev' } },
      env({ ALLOWED_ORIGINS: 'https://global.example' })
    );
    const disallowed = await api.request(
      `/boards/${board.id}/items`,
      { method: 'OPTIONS', headers: { Origin: 'https://global.example' } },
      env({ ALLOWED_ORIGINS: 'https://global.example' })
    );

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://board.bugdrop.dev');
    expect(disallowed.status).toBe(204);
    expect(disallowed.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('keeps self-host global CORS behavior when no hosted board config exists', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const api = createApi();

    const res = await api.request(
      `/boards/${board.id}/items`,
      { method: 'OPTIONS', headers: { Origin: 'https://selfhost.example' } },
      env({ ALLOWED_ORIGINS: 'https://selfhost.example' })
    );

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://selfhost.example');
  });

  it('authenticates hosted jwks verifier tokens for board reads', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const keyPair = await generateKeyPair();
    const tenant = await hosted.createTenant({
      name: 'Hosted Tenant',
      slug: `jwks-${testSequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Hosted App',
      slug: 'hosted-app',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'jwks',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      jwksUrl: 'https://app.example.com/.well-known/jwks.json',
      keyId: 'route-kid',
    });
    await hosted.configureBoard({ tenantId: tenant.id, appId: app.id, boardId: board.id });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ keys: [await publicJwk(keyPair, 'route-kid')] }))
    );
    const api = createApi();
    const token = await signHostedJwt(
      {
        iss: TOKEN_ISSUER,
        aud: TOKEN_AUDIENCE,
        boardId: board.id,
        tenantId: tenant.id,
        appId: app.id,
        externalUserId: 'hosted_user',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      keyPair.privateKey,
      { kid: 'route-kid' }
    );

    const res = await api.request(
      `/boards/${board.id}/items`,
      { headers: { Authorization: `Bearer ${token}` } },
      env()
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ items: [] });
  });

  it('fails closed for hosted jwks tokens with wrong tenant claims', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const keyPair = await generateKeyPair();
    const tenant = await hosted.createTenant({
      name: 'Hosted Tenant',
      slug: `wrong-jwks-${testSequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Hosted App',
      slug: 'hosted-app',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'jwks',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      jwksUrl: 'https://app.example.com/.well-known/jwks.json',
      keyId: 'route-kid',
    });
    await hosted.configureBoard({ tenantId: tenant.id, appId: app.id, boardId: board.id });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ keys: [await publicJwk(keyPair, 'route-kid')] }))
    );
    const api = createApi();
    const token = await signHostedJwt(
      {
        iss: TOKEN_ISSUER,
        aud: TOKEN_AUDIENCE,
        boardId: board.id,
        tenantId: 'tenant_other',
        appId: app.id,
        externalUserId: 'hosted_user',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      keyPair.privateKey,
      { kid: 'route-kid' }
    );

    const res = await api.request(
      `/boards/${board.id}/items`,
      { headers: { Authorization: `Bearer ${token}` } },
      env()
    );

    expect(res.status).toBe(401);
  });

  it('allows explicit hosted hmac legacy tokens with tenant and app claims', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const tenant = await hosted.createTenant({
      name: 'Legacy Tenant',
      slug: `legacy-${testSequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Legacy App',
      slug: 'legacy-app',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'hmac_legacy',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      secretRef: 'worker-secret',
    });
    await hosted.configureBoard({ tenantId: tenant.id, appId: app.id, boardId: board.id });
    const api = createApi();

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, {
            tenantId: tenant.id,
            appId: app.id,
          })}`,
        },
      },
      env()
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ items: [] });
  });

  it('keeps hosted runtime data and configuration isolated for two boards sharing one repo', async () => {
    const sharedRepo = `${repoName}_shared`;
    const demoBoard = await repo.upsertBoard({
      id: `board_${sharedRepo}_demo`,
      repoOwner: 'mean-weasel',
      repoName: sharedRepo,
      name: 'Preview Demo',
    });
    const ciBoard = await repo.upsertBoard({
      id: `board_${sharedRepo}_ci`,
      repoOwner: 'mean-weasel',
      repoName: sharedRepo,
      name: 'Preview CI',
    });
    const tenant = await hosted.createTenant({
      name: 'Preview Tenant',
      slug: `preview-${testSequence}`,
    });
    const demoApp = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Preview Demo App',
      slug: 'preview-demo',
    });
    const ciApp = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Preview CI App',
      slug: 'preview-ci',
    });
    for (const app of [demoApp, ciApp]) {
      await hosted.createTokenVerifier({
        tenantId: tenant.id,
        appId: app.id,
        type: 'hmac_legacy',
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        secretRef: 'worker-secret',
      });
    }
    await hosted.addOrigin({
      tenantId: tenant.id,
      appId: demoApp.id,
      origin: 'https://demo.example.com',
    });
    await hosted.addOrigin({
      tenantId: tenant.id,
      appId: ciApp.id,
      origin: 'https://ci.example.com',
    });
    await hosted.configureBoard({
      tenantId: tenant.id,
      appId: demoApp.id,
      boardId: demoBoard.id,
    });
    await hosted.configureBoard({
      tenantId: tenant.id,
      appId: ciApp.id,
      boardId: ciBoard.id,
    });
    await repo.createItem({
      boardId: demoBoard.id,
      title: 'Demo-only item',
      description: 'The CI board must not see this.',
      externalUserId: 'demo_user',
    });

    const api = createApi();
    const demoResponse = await api.request(
      `/boards/${demoBoard.id}/items`,
      {
        headers: {
          Authorization: `Bearer ${await boardToken(demoBoard.id, {
            tenantId: tenant.id,
            appId: demoApp.id,
          })}`,
          Origin: 'https://demo.example.com',
        },
      },
      env()
    );
    const ciResponse = await api.request(
      `/boards/${ciBoard.id}/items`,
      {
        headers: {
          Authorization: `Bearer ${await boardToken(ciBoard.id, {
            tenantId: tenant.id,
            appId: ciApp.id,
          })}`,
          Origin: 'https://ci.example.com',
        },
      },
      env()
    );

    expect(demoResponse.status).toBe(200);
    expect(ciResponse.status).toBe(200);
    await expect(demoResponse.json()).resolves.toMatchObject({
      items: [{ title: 'Demo-only item' }],
    });
    await expect(ciResponse.json()).resolves.toMatchObject({ items: [] });
    await expect(hosted.getBoardConfig(demoBoard.id)).resolves.toMatchObject({
      boardId: demoBoard.id,
      appId: demoApp.id,
      activeOrigins: ['https://demo.example.com'],
    });
    await expect(hosted.getBoardConfig(ciBoard.id)).resolves.toMatchObject({
      boardId: ciBoard.id,
      appId: ciApp.id,
      activeOrigins: ['https://ci.example.com'],
    });
  });

  it('creates hosted board items through the configured GitHub App connection repo', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const tokenKeyPair = await generateKeyPair();
    const appKeyPair = await generateKeyPair();
    const tenant = await hosted.createTenant({
      name: 'Hosted Create Tenant',
      slug: `hosted-create-${testSequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Hosted Create App',
      slug: 'hosted-create-app',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'jwks',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      jwksUrl: 'https://app.example.com/.well-known/jwks.json',
      keyId: 'route-kid',
    });
    const connection = await hosted.createGitHubConnection({
      tenantId: tenant.id,
      appId: app.id,
      installationId: '98765',
      accountLogin: 'mean-weasel',
      repoOwner: 'mean-weasel',
      repoName,
      status: 'active',
    });
    await hosted.configureBoard({
      tenantId: tenant.id,
      appId: app.id,
      boardId: board.id,
      githubConnectionId: connection.id,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ keys: [await publicJwk(tokenKeyPair, 'route-kid')] }))
      .mockResolvedValueOnce(jsonResponse({ token: 'ghs_installation_token' }))
      .mockResolvedValueOnce(
        jsonResponse({
          number: 31,
          html_url: `https://github.com/mean-weasel/${repoName}/issues/31`,
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const api = createApi();
    const token = await signHostedJwt(
      {
        iss: TOKEN_ISSUER,
        aud: TOKEN_AUDIENCE,
        boardId: board.id,
        tenantId: tenant.id,
        appId: app.id,
        externalUserId: 'hosted_user',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      tokenKeyPair.privateKey,
      { kid: 'route-kid' }
    );

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Add SSO', description: 'Enterprise users need SSO.' }),
      },
      env({
        GITHUB_APP_ID: '12345',
        GITHUB_APP_PRIVATE_KEY: await privateKeyPem(appKeyPair.privateKey),
      })
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { item: { id: string; githubIssueNumber: number } };
    expect(body.item.githubIssueNumber).toBe(31);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.github.com/app/installations/98765/access_tokens'
    );
    expect(fetchMock.mock.calls[2][0]).toBe(
      `https://api.github.com/repos/mean-weasel/${repoName}/issues`
    );
    await expect(repo.getItem(board.id, body.item.id)).resolves.toMatchObject({
      createdByExternalUserId: 'hosted_user',
      githubIssueNumber: 31,
    });
  });

  it('fails closed for hosted item creation without an active GitHub connection', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const tenant = await hosted.createTenant({
      name: 'No Connection Tenant',
      slug: `no-connection-${testSequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'No Connection App',
      slug: 'no-connection-app',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'hmac_legacy',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      secretRef: 'worker-secret',
    });
    await hosted.configureBoard({ tenantId: tenant.id, appId: app.id, boardId: board.id });
    const api = createApi();

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, {
            tenantId: tenant.id,
            appId: app.id,
          })}`,
        },
        body: JSON.stringify({ title: 'Add SSO', description: 'Enterprise users need SSO.' }),
      },
      env({
        GITHUB_APP_ID: '12345',
        GITHUB_APP_PRIVATE_KEY: await privateKeyPem((await generateKeyPair()).privateKey),
      })
    );

    expect(res.status).toBe(500);
    await expect(repo.listItems(board.id)).resolves.toHaveLength(0);
    await expect(repo.listEvents(board.id, 0)).resolves.toHaveLength(0);
  });

  it('fails closed when a hosted GitHub connection repo does not match the board repo', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const tenant = await hosted.createTenant({
      name: 'Mismatch Tenant',
      slug: `mismatch-${testSequence}`,
    });
    const app = await hosted.createApp({
      tenantId: tenant.id,
      name: 'Mismatch App',
      slug: 'mismatch-app',
    });
    await hosted.createTokenVerifier({
      tenantId: tenant.id,
      appId: app.id,
      type: 'hmac_legacy',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      secretRef: 'worker-secret',
    });
    const connection = await hosted.createGitHubConnection({
      tenantId: tenant.id,
      appId: app.id,
      installationId: '98765',
      repoOwner: 'mean-weasel',
      repoName: `${repoName}_other`,
      status: 'active',
    });
    await hosted.configureBoard({
      tenantId: tenant.id,
      appId: app.id,
      boardId: board.id,
      githubConnectionId: connection.id,
    });
    const api = createApi();

    const res = await api.request(
      `/boards/${board.id}/items`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await boardToken(board.id, {
            tenantId: tenant.id,
            appId: app.id,
          })}`,
        },
        body: JSON.stringify({ title: 'Add SSO', description: 'Enterprise users need SSO.' }),
      },
      env({
        GITHUB_APP_ID: '12345',
        GITHUB_APP_PRIVATE_KEY: await privateKeyPem((await generateKeyPair()).privateKey),
      })
    );

    expect(res.status).toBe(500);
    await expect(repo.listItems(board.id)).resolves.toHaveLength(0);
    await expect(repo.listEvents(board.id, 0)).resolves.toHaveLength(0);
  });
});

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
}

async function publicJwk(keyPair: CryptoKeyPair, kid: string): Promise<JsonWebKey> {
  return {
    ...(await crypto.subtle.exportKey('jwk', keyPair.publicKey)),
    kid,
    alg: 'RS256',
    use: 'sig',
  };
}

async function signHostedJwt(
  claims: Record<string, unknown>,
  privateKey: CryptoKey,
  headerOverrides: Partial<{ kid: string }> = {}
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT', ...headerOverrides };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64urlBytes(new Uint8Array(signature))}`;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function privateKeyPem(privateKey: CryptoKey): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey));
  const body =
    btoa(String.fromCharCode(...bytes))
      .match(/.{1,64}/g)
      ?.join('\n') ?? '';
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}

function base64url(value: string): string {
  return base64urlBytes(new TextEncoder().encode(value));
}

function base64urlBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
