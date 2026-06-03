import { Hono } from 'hono';
import { BoardRepository } from '../lib/board-repository';
import { verifyBoardToken } from '../lib/board-token';
import { createGitHubIssueCreator, type IssueCreator } from '../lib/github';
import { createId } from '../lib/ids';
import { parseCreateItemInput } from '../lib/validation';
import type { Env } from '../types';

type ApiEnv = { Bindings: Env };

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
    const token = parseBearerToken(c.req.header('Authorization'));
    if (!token) {
      return c.json({ error: 'Missing bearer token' }, 401);
    }
    if (!c.env.BOARD_TOKEN_SECRET) {
      return c.json({ error: 'Board token secret is not configured' }, 500);
    }

    const claims = await verifyToken(token, c.env, boardId);
    if (!claims) {
      return c.json({ error: 'Invalid board token' }, 401);
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
      externalUserId: claims.externalUserId,
      displayName: claims.displayName,
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.htmlUrl,
    });

    return c.json({ item }, 201);
  });

  return api;
}

function parseBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
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
