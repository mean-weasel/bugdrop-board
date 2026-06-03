import { Hono, type Context } from 'hono';
import { BoardRepository } from '../lib/board-repository';
import { createGitHubIssueCreator, type IssueCreator } from '../lib/github';
import { createId } from '../lib/ids';
import type { Env } from '../types';
import { applyCorsHeaders, authorizeBoardRequest, parseJsonBody, parseSince } from './api-helpers';
import { enforceWriteThrottle } from './write-throttle';

type ApiEnv = { Bindings: Env };

interface ApiDependencies {
  createIssueCreator(env: Env): IssueCreator | null;
}

const defaultDependencies: ApiDependencies = {
  createIssueCreator(env) {
    if (env.ENVIRONMENT === 'e2e') {
      return {
        createIssue(input) {
          return Promise.resolve({
            number: 1001,
            htmlUrl: `https://github.local/mean-weasel/demo/issues/${input.boardItemId}`,
          });
        },
      };
    }
    if (!env.GITHUB_ISSUE_ACCESS_TOKEN) {
      return null;
    }
    return createGitHubIssueCreator(env.GITHUB_ISSUE_ACCESS_TOKEN);
  },
};

export function createApi(dependencies: Partial<ApiDependencies> = {}): Hono<ApiEnv> {
  const deps: ApiDependencies = { ...defaultDependencies, ...dependencies };
  const api = new Hono<ApiEnv>();

  api.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      applyCorsHeaders(c);
      return c.body(null, 204);
    }

    await next();
    applyCorsHeaders(c);
  });

  api.post('/__e2e/reset', resetE2eBoard);

  api.get('/health', c => {
    return c.json({
      status: 'ok',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
    });
  });

  api.post('/boards/:boardId/items', async c => {
    const boardId = c.req.param('boardId');
    const authorized = await authorizeBoardRequest(c, boardId);
    if (!authorized.ok) {
      return authorized.response;
    }

    const parsedBody = await parseJsonBody(c.req.raw);
    if (!parsedBody.ok) {
      return c.json({ error: parsedBody.error }, 400);
    }

    const repo = new BoardRepository(c.env.DB);
    const board = await repo.getBoard(boardId);
    if (!board) {
      return c.json({ error: 'Board not found' }, 404);
    }

    const throttled = await enforceWriteThrottle(
      c,
      'create_item',
      boardId,
      authorized.claims.externalUserId
    );
    if (throttled) {
      return throttled;
    }

    const issueCreator = deps.createIssueCreator(c.env);
    if (!issueCreator) {
      return c.json({ error: 'GitHub issue creator is not configured' }, 500);
    }

    const itemId = createId('item');
    let issue;
    try {
      issue = await issueCreator.createIssue({
        owner: board.repoOwner,
        repo: board.repoName,
        title: parsedBody.value.title,
        description: parsedBody.value.description,
        boardItemId: itemId,
      });
    } catch {
      return c.json({ error: 'Failed to create GitHub issue' }, 502);
    }

    const item = await repo.createItem({
      id: itemId,
      boardId,
      title: parsedBody.value.title,
      description: parsedBody.value.description,
      externalUserId: authorized.claims.externalUserId,
      displayName: authorized.claims.displayName,
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.htmlUrl,
    });

    return c.json({ item }, 201);
  });

  api.get('/boards/:boardId/items', async c => {
    const boardId = c.req.param('boardId');
    const authorized = await authorizeBoardRequest(c, boardId);
    if (!authorized.ok) {
      return authorized.response;
    }

    const repo = new BoardRepository(c.env.DB);
    const board = await repo.getBoard(boardId);
    if (!board) {
      return c.json({ error: 'Board not found' }, 404);
    }

    const items = await repo.listItemsForViewer(boardId, authorized.claims.externalUserId);
    return c.json({ items });
  });

  api.post('/boards/:boardId/items/:itemId/upvote', async c => {
    const boardId = c.req.param('boardId');
    const authorized = await authorizeBoardRequest(c, boardId);
    if (!authorized.ok) {
      return authorized.response;
    }

    const repo = new BoardRepository(c.env.DB);
    const board = await repo.getBoard(boardId);
    if (!board) {
      return c.json({ error: 'Board not found' }, 404);
    }

    const throttled = await enforceWriteThrottle(
      c,
      'toggle_upvote',
      boardId,
      authorized.claims.externalUserId
    );
    if (throttled) {
      return throttled;
    }

    try {
      const item = await repo.toggleUpvote(
        boardId,
        c.req.param('itemId'),
        authorized.claims.externalUserId
      );
      return c.json({ item });
    } catch (error) {
      if (error instanceof Error && error.message === 'Board item not found') {
        return c.json({ error: 'Board item not found' }, 404);
      }
      throw error;
    }
  });

  api.get('/boards/:boardId/events', async c => {
    const boardId = c.req.param('boardId');
    const authorized = await authorizeBoardRequest(c, boardId);
    if (!authorized.ok) {
      return authorized.response;
    }

    const since = parseSince(c.req.query('since'));
    if (!since.ok) {
      return c.json({ error: since.error }, 400);
    }

    const repo = new BoardRepository(c.env.DB);
    const board = await repo.getBoard(boardId);
    if (!board) {
      return c.json({ error: 'Board not found' }, 404);
    }

    const events = await repo.listEvents(boardId, since.value);
    return c.json({ cursor: events.at(-1)?.id ?? since.value, events });
  });

  return api;
}

async function resetE2eBoard(c: Context<ApiEnv>) {
  if (c.env.ENVIRONMENT !== 'e2e') {
    return c.json({ error: 'Not found' }, 404);
  }

  const repo = new BoardRepository(c.env.DB);
  const boardId = 'board_mean_weasel_demo';
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM board_votes WHERE board_id = ?').bind(boardId),
    c.env.DB.prepare('DELETE FROM board_events WHERE board_id = ?').bind(boardId),
    c.env.DB.prepare('DELETE FROM board_items WHERE board_id = ?').bind(boardId),
    c.env.DB.prepare('DELETE FROM boards WHERE id = ?').bind(boardId),
  ]);
  const board = await repo.upsertBoard({
    repoOwner: 'mean-weasel',
    repoName: 'demo',
    name: 'Demo Board',
  });

  return c.json({ board });
}
const api = createApi();

export default api;
