import { env as workerEnv } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRepository } from '../src/lib/board-repository';
import { createBoardToken } from '../src/lib/board-token';
import type { IssueCreator } from '../src/lib/github';
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
  overrides: Partial<{ boardId: string; externalUserId: string; displayName: string }> = {}
) {
  return createBoardToken(
    {
      boardId: overrides.boardId ?? boardId,
      externalUserId: overrides.externalUserId ?? 'user_1',
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
  let repoName: string;

  beforeEach(() => {
    repo = new BoardRepository(workerEnv.DB);
    testSequence += 1;
    repoName = `demo_${testSequence}`;
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
});
