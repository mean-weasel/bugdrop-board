import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createBoardToken } from '../../src/lib/board-token';

export const HOST_ORIGIN = 'http://127.0.0.1:5177';
const DEFAULT_WORKER_ORIGIN = 'http://127.0.0.1:8788';
const DEFAULT_TOKEN_SECRET = 'e2e-secret';
const DEFAULT_TOKEN_AUDIENCE = 'bugdrop-board';
const DEFAULT_TOKEN_ISSUER = 'dummy-host';
const DEFAULT_POLL_INTERVAL = '750';
const execFileAsync = promisify(execFile);

interface ProvisionedBoard {
  id: string;
  repoOwner: string;
  repoName: string;
  name: string;
}

interface HostApp {
  server: Server;
  url: string;
  close(): Promise<void>;
}

interface HostConfig {
  boardId: string;
  inlineMount: boolean;
  mountSelector?: string;
  scriptSrc: string;
  workerOrigin: string;
  tokenSecret: string;
  tokenAudience: string;
  tokenIssuer: string;
  pollInterval: string;
}

export async function provisionBoard(): Promise<ProvisionedBoard> {
  const repo = `mean-weasel/demo-${Date.now()}-${process.pid}`;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['scripts/provision-board.js', '--repo', repo, '--name', 'Demo Board', '--local'],
    { cwd: process.cwd() }
  );
  const result = JSON.parse(stdout) as { board: ProvisionedBoard };
  return result.board;
}

interface HostOptions {
  inlineMount?: boolean;
}

export async function startHostApp(boardId?: string, options: HostOptions = {}): Promise<HostApp> {
  const config = hostConfig(boardId, options);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', HOST_ORIGIN);
      if (url.pathname === '/board.js') {
        const bundle = await readFile(join(process.cwd(), 'public/board.js'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(bundle);
        return;
      }
      if (url.pathname === '/token') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({ token: await createToken(config, url.searchParams.get('viewer')) })
        );
        return;
      }
      if (url.pathname === '/viewer-a' || url.pathname === '/viewer-b') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderHostPage(config, url.pathname.endsWith('a') ? 'a' : 'b'));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(error instanceof Error ? error.message : 'Host app failed');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(5177, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  return {
    server,
    url: HOST_ORIGIN,
    close: () => new Promise(resolve => server.close(() => resolve())),
  };
}

function hostConfig(boardId: string | undefined, options: HostOptions): HostConfig {
  const workerOrigin = envValue('BUGDROP_BOARD_WORKER_ORIGIN') ?? DEFAULT_WORKER_ORIGIN;
  const resolvedBoardId = boardId ?? envValue('BUGDROP_BOARD_ID');
  if (!resolvedBoardId) {
    throw new Error('BugDrop Board host requires a board id');
  }

  return {
    boardId: resolvedBoardId,
    inlineMount: options.inlineMount ?? false,
    mountSelector: options.inlineMount ? '#feedback-board' : undefined,
    scriptSrc: envValue('BUGDROP_BOARD_SCRIPT_SRC') ?? '/board.js',
    workerOrigin,
    tokenSecret: envValue('BUGDROP_BOARD_TOKEN_SECRET') ?? DEFAULT_TOKEN_SECRET,
    tokenAudience: envValue('BUGDROP_BOARD_TOKEN_AUDIENCE') ?? DEFAULT_TOKEN_AUDIENCE,
    tokenIssuer: envValue('BUGDROP_BOARD_TOKEN_ISSUER') ?? DEFAULT_TOKEN_ISSUER,
    pollInterval: envValue('BUGDROP_BOARD_POLL_INTERVAL') ?? DEFAULT_POLL_INTERVAL,
  };
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

async function createToken(config: HostConfig, viewer: string | null): Promise<string> {
  const suffix = viewer === 'b' ? 'b' : 'a';
  return createBoardToken(
    {
      boardId: config.boardId,
      externalUserId: `user_e2e_${suffix}`,
      displayName: suffix === 'b' ? 'Grace' : 'Ada',
      exp: Math.floor(Date.now() / 1000) + 300,
      aud: config.tokenAudience,
      iss: config.tokenIssuer,
    },
    config.tokenSecret
  );
}

function renderHostPage(config: HostConfig, viewer: 'a' | 'b'): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BugDrop Board Host</title>
    <style>
      body {
        background: #f6f8fa;
        color: #172026;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
      }
      main {
        margin: 0 auto;
        max-width: 860px;
        padding: 32px 20px;
      }
      h1 {
        font-size: 28px;
        line-height: 1.2;
        margin: 0 0 24px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Dummy App</h1>
      ${
        config.inlineMount
          ? '<section id="feedback-board" data-testid="inline-feedback-slot"></section>'
          : ''
      }
    </main>
    <script
      src="${escapeAttribute(config.scriptSrc)}"
      data-board-id="${escapeAttribute(config.boardId)}"
      data-api-url="${escapeAttribute(config.workerOrigin)}"
      data-token-endpoint="/token?viewer=${viewer}"
      data-poll-interval="${escapeAttribute(config.pollInterval)}"
      data-color="#1f883d"
      ${config.mountSelector ? `data-mount-selector="${escapeAttribute(config.mountSelector)}"` : ''}
    ></script>
  </body>
</html>`;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
