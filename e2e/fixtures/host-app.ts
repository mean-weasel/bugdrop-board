import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createBoardToken } from '../../src/lib/board-token';

export const BOARD_ID = 'board_mean_weasel_demo';
export const HOST_ORIGIN = 'http://127.0.0.1:5177';
const WORKER_ORIGIN = 'http://127.0.0.1:8788';
const TOKEN_SECRET = 'e2e-secret';
const TOKEN_AUDIENCE = 'bugdrop-board';
const TOKEN_ISSUER = 'dummy-host';

interface HostApp {
  server: Server;
  url: string;
  close(): Promise<void>;
}

export async function startHostApp(): Promise<HostApp> {
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
        res.end(JSON.stringify({ token: await createToken(url.searchParams.get('viewer')) }));
        return;
      }
      if (url.pathname === '/viewer-a' || url.pathname === '/viewer-b') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderHostPage(url.pathname.endsWith('a') ? 'a' : 'b'));
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

export async function resetBoard(): Promise<void> {
  const res = await fetch(`${WORKER_ORIGIN}/__e2e/reset`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Board reset failed with ${res.status}: ${await res.text()}`);
  }
}

async function createToken(viewer: string | null): Promise<string> {
  const suffix = viewer === 'b' ? 'b' : 'a';
  return createBoardToken(
    {
      boardId: BOARD_ID,
      externalUserId: `user_e2e_${suffix}`,
      displayName: suffix === 'b' ? 'Grace' : 'Ada',
      exp: Math.floor(Date.now() / 1000) + 300,
      aud: TOKEN_AUDIENCE,
      iss: TOKEN_ISSUER,
    },
    TOKEN_SECRET
  );
}

function renderHostPage(viewer: 'a' | 'b'): string {
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
    </main>
    <script
      src="/board.js"
      data-board-id="${BOARD_ID}"
      data-api-url="${WORKER_ORIGIN}"
      data-token-endpoint="/token?viewer=${viewer}"
      data-poll-interval="750"
      data-color="#1f883d"
    ></script>
  </body>
</html>`;
}
