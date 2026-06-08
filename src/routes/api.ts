import { Hono, type Context } from 'hono';
import { BoardRepository } from '../lib/board-repository';
import type { IssueCreator } from '../lib/github';
import type { HostedBoardConfig } from '../lib/hosted-config-repository';
import { createId } from '../lib/ids';
import type { ThrottleAction } from '../lib/request-throttle';
import type { BoardItem, Env } from '../types';
import { createIssueCreator, issueTargetForBoard } from './api-github';
import { applyCorsHeaders, authorizeBoardRequest, parseJsonBody, parseSince } from './api-helpers';
import { enforceRequestThrottle, enforceWriteThrottle } from './write-throttle';

type ApiEnv = { Bindings: Env };

interface ApiDependencies {
  createIssueCreator(env: Env, hostedConfig?: HostedBoardConfig): IssueCreator | null;
}

const defaultDependencies: ApiDependencies = {
  createIssueCreator,
};

export function createApi(dependencies: Partial<ApiDependencies> = {}): Hono<ApiEnv> {
  const deps: ApiDependencies = { ...defaultDependencies, ...dependencies };
  const api = new Hono<ApiEnv>();

  api.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await applyCorsHeaders(c);
      return c.body(null, 204);
    }

    await next();
    await applyCorsHeaders(c);
  });

  api.post('/__e2e/reset', resetE2eBoard);

  api.get('/', c => c.redirect('https://bugdrop.dev/board-dogfood', 302));

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
    const issueTarget = issueTargetForBoard(board, authorized.hostedConfig);
    if (!issueTarget) {
      return c.json({ error: 'GitHub issue creator is not configured' }, 500);
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

    const issueCreator = deps.createIssueCreator(c.env, authorized.hostedConfig);
    if (!issueCreator) {
      return c.json({ error: 'GitHub issue creator is not configured' }, 500);
    }

    const itemId = createId('item');
    let issue;
    try {
      issue = await issueCreator.createIssue({
        owner: issueTarget.owner,
        repo: issueTarget.repo,
        title: parsedBody.value.title,
        description: parsedBody.value.description,
        boardItemId: itemId,
      });
    } catch (error) {
      console.error('GitHub issue creation failed', {
        boardId,
        repo: `${issueTarget.owner}/${issueTarget.repo}`,
        message: error instanceof Error ? error.message : String(error),
      });
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

    return c.json({ item: publicBoardItem(item) }, 201);
  });

  api.get('/boards/:boardId/items', listItems);

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
      return c.json({ item: publicBoardItem(item) });
    } catch (error) {
      if (error instanceof Error && error.message === 'Board item not found') {
        return c.json({ error: 'Board item not found' }, 404);
      }
      throw error;
    }
  });

  api.get('/boards/:boardId/events', listEvents);

  return api;
}

async function listItems(c: Context<ApiEnv>) {
  const boardId = c.req.param('boardId') as string;
  const authorized = await authorizeBoardRequest(c, boardId);
  if (!authorized.ok) {
    return authorized.response;
  }

  const repo = new BoardRepository(c.env.DB);
  const board = await repo.getBoard(boardId);
  if (!board) {
    return c.json({ error: 'Board not found' }, 404);
  }

  const throttled = await enforceApiThrottle(
    c,
    'list_items',
    boardId,
    authorized.claims.externalUserId
  );
  if (throttled) {
    return throttled;
  }

  const items = (await repo.listItemsForViewer(boardId, authorized.claims.externalUserId)).map(
    publicBoardItem
  );
  return c.json({ items });
}

async function listEvents(c: Context<ApiEnv>) {
  const boardId = c.req.param('boardId') as string;
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

  const throttled = await enforceApiThrottle(
    c,
    'list_events',
    boardId,
    authorized.claims.externalUserId
  );
  if (throttled) {
    return throttled;
  }

  const events = await repo.listEvents(boardId, since.value);
  return c.json({ cursor: events.at(-1)?.id ?? since.value, events });
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

function enforceApiThrottle(
  c: Context<ApiEnv>,
  action: ThrottleAction,
  boardId: string,
  externalUserId: string
) {
  return enforceRequestThrottle(c, action, boardId, externalUserId);
}

function publicBoardItem(item: BoardItem & { viewerHasUpvoted?: boolean }) {
  return {
    id: item.id,
    boardId: item.boardId,
    title: item.title,
    description: item.description,
    status: item.status,
    githubIssueNumber: item.githubIssueNumber,
    githubIssueUrl: item.githubIssueUrl,
    upvoteCount: item.upvoteCount,
    viewerHasUpvoted: item.viewerHasUpvoted,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

const api = createApi();

export default api;
