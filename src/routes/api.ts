import { Hono, type Context } from 'hono';
import { BoardRepository } from '../lib/board-repository';
import { verifyBoardToken } from '../lib/board-token';
import { createGitHubIssueCreator, type IssueCreator } from '../lib/github';
import { createId } from '../lib/ids';
import { parseCreateItemInput } from '../lib/validation';
import type { Env } from '../types';

type ApiEnv = { Bindings: Env };
type BoardTokenClaims = Awaited<ReturnType<typeof verifyBoardToken>>;
type AuthorizedRequest = { ok: true; claims: BoardTokenClaims } | { ok: false; response: Response };

interface ApiDependencies {
  createIssueCreator(env: Env): IssueCreator | null;
}

const defaultDependencies: ApiDependencies = {
  createIssueCreator(env) {
    if (!env.GITHUB_ISSUE_ACCESS_TOKEN) {
      return null;
    }
    return createGitHubIssueCreator(env.GITHUB_ISSUE_ACCESS_TOKEN);
  },
};

export function createApi(dependencies: Partial<ApiDependencies> = {}): Hono<ApiEnv> {
  const deps: ApiDependencies = { ...defaultDependencies, ...dependencies };
  const api = new Hono<ApiEnv>();

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

async function authorizeBoardRequest(
  c: Context<ApiEnv>,
  boardId: string
): Promise<AuthorizedRequest> {
  const token = parseBearerToken(c.req.header('Authorization'));
  if (!token) {
    return { ok: false, response: c.json({ error: 'Missing bearer token' }, 401) };
  }
  if (!c.env.BOARD_TOKEN_SECRET) {
    return { ok: false, response: c.json({ error: 'Board token secret is not configured' }, 500) };
  }

  const claims = await verifyToken(token, c.env, boardId);
  if (!claims) {
    return { ok: false, response: c.json({ error: 'Invalid board token' }, 401) };
  }

  return { ok: true, claims };
}

function parseBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function parseSince(value: string | undefined) {
  if (typeof value === 'undefined') {
    return { ok: true as const, value: 0 };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false as const, error: 'Since cursor must be a nonnegative integer' };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false as const, error: 'Since cursor must be a safe integer' };
  }

  return { ok: true as const, value: parsed };
}

async function verifyToken(token: string, env: Env, boardId: string) {
  try {
    return await verifyBoardToken(token, {
      secret: env.BOARD_TOKEN_SECRET,
      expectedBoardId: boardId,
      expectedAudience: env.BOARD_TOKEN_AUDIENCE,
      expectedIssuer: env.BOARD_TOKEN_ISSUER,
    });
  } catch {
    return null;
  }
}

async function parseJsonBody(request: Request) {
  try {
    return { ok: true as const, value: parseCreateItemInput(await request.json()) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Invalid JSON body',
    };
  }
}

const api = createApi();

export default api;
