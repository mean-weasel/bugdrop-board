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
    REQUEST_THROTTLE_WINDOW_SECONDS: '60',
    ITEM_CREATE_RATE_LIMIT: '2',
    UPVOTE_RATE_LIMIT: '2',
    ITEM_READ_RATE_LIMIT: '2',
    EVENTS_POLL_RATE_LIMIT: '2',
    ...overrides,
  };
}

async function boardToken(boardId: string, externalUserId = 'user_1') {
  return createBoardToken(
    {
      boardId,
      externalUserId,
      displayName: externalUserId,
      exp: Math.floor(Date.now() / 1000) + 60,
      aud: TOKEN_AUDIENCE,
      iss: TOKEN_ISSUER,
    },
    TOKEN_SECRET
  );
}

function issueCreator(createIssue = vi.fn().mockResolvedValue(issueResponse())): IssueCreator {
  return { createIssue };
}

describe('request throttling', () => {
  let repo: BoardRepository;
  let repoName: string;

  beforeEach(() => {
    repo = new BoardRepository(workerEnv.DB);
    testSequence += 1;
    repoName = `throttle_${testSequence}`;
  });

  it('throttles item creation before creating a GitHub issue', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const createIssue = vi.fn().mockResolvedValue(issueResponse());
    const api = createApi({ createIssueCreator: () => issueCreator(createIssue) });
    const headers = { Authorization: `Bearer ${await boardToken(board.id)}` };

    await expect(createItem(api, board.id, headers, 'First request')).resolves.toBe(201);
    await expect(createItem(api, board.id, headers, 'Second request')).resolves.toBe(201);

    const limited = await requestCreateItem(api, board.id, headers, 'Third request');

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    await expect(limited.json()).resolves.toMatchObject({
      error: 'Rate limit exceeded',
      limit: 2,
      windowSeconds: 60,
    });
    expect(createIssue).toHaveBeenCalledTimes(2);
    await expect(repo.listItems(board.id)).resolves.toHaveLength(2);
  });

  it('keeps item creation limits isolated by user and board', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_a` });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_b` });
    const api = createApi({ createIssueCreator: () => issueCreator() });
    const userOneA = { Authorization: `Bearer ${await boardToken(boardA.id, 'user_1')}` };
    const userTwoA = { Authorization: `Bearer ${await boardToken(boardA.id, 'user_2')}` };
    const userOneB = { Authorization: `Bearer ${await boardToken(boardB.id, 'user_1')}` };

    await createItem(api, boardA.id, userOneA, 'First user one request');
    await createItem(api, boardA.id, userOneA, 'Second user one request');

    await expect(createItem(api, boardA.id, userTwoA, 'User two request')).resolves.toBe(201);
    await expect(createItem(api, boardB.id, userOneB, 'Board B request')).resolves.toBe(201);
  });

  it('throttles upvote toggles while keeping users isolated', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const api = createApi();
    const userOne = { Authorization: `Bearer ${await boardToken(board.id, 'user_1')}` };
    const userTwo = { Authorization: `Bearer ${await boardToken(board.id, 'user_2')}` };

    await expect(toggleUpvote(api, board.id, item.id, userOne)).resolves.toBe(200);
    await expect(toggleUpvote(api, board.id, item.id, userOne)).resolves.toBe(200);

    const limited = await requestToggleUpvote(api, board.id, item.id, userOne);

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    await expect(limited.json()).resolves.toMatchObject({
      error: 'Rate limit exceeded',
      limit: 2,
    });
    await expect(toggleUpvote(api, board.id, item.id, userTwo)).resolves.toBe(200);
    const events = await repo.listEvents(board.id, 0);
    expect(events.map(event => event.eventType)).toEqual([
      'item_created',
      'upvote_added',
      'upvote_removed',
      'upvote_added',
    ]);
  });

  it('keeps upvote limits isolated by board', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_a` });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: `${repoName}_b` });
    const itemA = await repo.createItem({
      boardId: boardA.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const itemB = await repo.createItem({
      boardId: boardB.id,
      title: 'Add imports',
      description: 'CSV imports would help admins.',
      externalUserId: 'user_1',
    });
    const api = createApi();
    const userA = { Authorization: `Bearer ${await boardToken(boardA.id, 'user_1')}` };
    const userB = { Authorization: `Bearer ${await boardToken(boardB.id, 'user_1')}` };

    await toggleUpvote(api, boardA.id, itemA.id, userA);
    await toggleUpvote(api, boardA.id, itemA.id, userA);

    await expect(toggleUpvote(api, boardB.id, itemB.id, userB)).resolves.toBe(200);
  });

  it('throttles authenticated item reads without changing board data', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const api = createApi();
    const headers = { Authorization: `Bearer ${await boardToken(board.id, 'user_2')}` };

    await expect(listItems(api, board.id, headers)).resolves.toBe(200);
    await expect(listItems(api, board.id, headers)).resolves.toBe(200);

    const limited = await requestListItems(api, board.id, headers);

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    await expect(limited.json()).resolves.toMatchObject({
      error: 'Rate limit exceeded',
      limit: 2,
      windowSeconds: 60,
    });
    await expect(repo.listItems(board.id)).resolves.toHaveLength(1);
  });

  it('throttles event polling while keeping read limits isolated', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName });
    await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });
    const api = createApi();
    const headers = { Authorization: `Bearer ${await boardToken(board.id, 'user_2')}` };

    await expect(listEvents(api, board.id, headers)).resolves.toBe(200);
    await expect(listEvents(api, board.id, headers)).resolves.toBe(200);

    const limited = await requestListEvents(api, board.id, headers);

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    await expect(limited.json()).resolves.toMatchObject({
      error: 'Rate limit exceeded',
      limit: 2,
    });
    await expect(listItems(api, board.id, headers)).resolves.toBe(200);
  });
});

function issueResponse() {
  return { number: 7, htmlUrl: 'https://github.com/mean-weasel/demo/issues/7' };
}

async function createItem(
  api: ReturnType<typeof createApi>,
  boardId: string,
  headers: Record<string, string>,
  title: string
) {
  const res = await requestCreateItem(api, boardId, headers, title);
  return res.status;
}

function requestCreateItem(
  api: ReturnType<typeof createApi>,
  boardId: string,
  headers: Record<string, string>,
  title: string
) {
  return api.request(
    `/boards/${boardId}/items`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, description: 'A useful request.' }),
    },
    env()
  );
}

async function toggleUpvote(
  api: ReturnType<typeof createApi>,
  boardId: string,
  itemId: string,
  headers: Record<string, string>
) {
  const res = await requestToggleUpvote(api, boardId, itemId, headers);
  return res.status;
}

function requestToggleUpvote(
  api: ReturnType<typeof createApi>,
  boardId: string,
  itemId: string,
  headers: Record<string, string>
) {
  return api.request(
    `/boards/${boardId}/items/${itemId}/upvote`,
    { method: 'POST', headers },
    env()
  );
}

async function listItems(
  api: ReturnType<typeof createApi>,
  boardId: string,
  headers: Record<string, string>
) {
  const res = await requestListItems(api, boardId, headers);
  return res.status;
}

function requestListItems(
  api: ReturnType<typeof createApi>,
  boardId: string,
  headers: Record<string, string>
) {
  return api.request(`/boards/${boardId}/items`, { headers }, env());
}

async function listEvents(
  api: ReturnType<typeof createApi>,
  boardId: string,
  headers: Record<string, string>
) {
  const res = await requestListEvents(api, boardId, headers);
  return res.status;
}

function requestListEvents(
  api: ReturnType<typeof createApi>,
  boardId: string,
  headers: Record<string, string>
) {
  return api.request(`/boards/${boardId}/events?since=0`, { headers }, env());
}
