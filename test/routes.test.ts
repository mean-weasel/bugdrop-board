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

async function boardToken(boardId: string, overrides: Partial<{ boardId: string }> = {}) {
  return createBoardToken(
    {
      boardId: overrides.boardId ?? boardId,
      externalUserId: 'user_1',
      displayName: 'Ada',
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
});
