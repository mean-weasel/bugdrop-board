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
  customization?: CustomizationVariantConfig;
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
  variant?: CustomizationVariant;
}

export type CustomizationVariant = 'compact-saas' | 'soft-community' | 'high-contrast';

interface CustomizationVariantConfig {
  bodyBackground: string;
  bodyColor: string;
  config: {
    copy: Record<string, string>;
    density: string;
    layout: string;
    theme: Record<string, string>;
  };
  heading: string;
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
    customization: options.variant ? customizationVariant(options.variant) : undefined,
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
  const customization = config.customization;
  const bodyBackground = customization?.bodyBackground ?? '#f6f8fa';
  const bodyColor = customization?.bodyColor ?? '#172026';
  const heading = customization?.heading ?? 'Dummy App';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BugDrop Board Host</title>
    <style>
      body {
        background: ${bodyBackground};
        color: ${bodyColor};
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
      <h1>${escapeHtml(heading)}</h1>
      ${
        config.inlineMount
          ? '<section id="feedback-board" data-testid="inline-feedback-slot"></section>'
          : ''
      }
    </main>
    ${
      customization
        ? `<script type="application/json" id="bugdrop-board-config">${escapeScriptJson(
            customization.config
          )}</script>`
        : ''
    }
    <script
      src="${escapeAttribute(config.scriptSrc)}"
      data-board-id="${escapeAttribute(config.boardId)}"
      data-api-url="${escapeAttribute(config.workerOrigin)}"
      data-token-endpoint="/token?viewer=${viewer}"
      data-poll-interval="${escapeAttribute(config.pollInterval)}"
      data-color="#1f883d"
      ${customization ? 'data-config-selector="#bugdrop-board-config"' : ''}
      ${config.mountSelector ? `data-mount-selector="${escapeAttribute(config.mountSelector)}"` : ''}
    ></script>
  </body>
</html>`;
}

function customizationVariant(variant: CustomizationVariant): CustomizationVariantConfig {
  if (variant === 'compact-saas') {
    return {
      bodyBackground: '#f8fafc',
      bodyColor: '#0f172a',
      heading: 'Acme Admin',
      config: {
        density: 'compact',
        layout: 'panel',
        copy: {
          heading: 'Roadmap queue',
          titleLabel: 'Request',
          titlePlaceholder: 'Short operational request',
          descriptionLabel: 'Business context',
          descriptionPlaceholder: 'Who needs this and why?',
          submitLabel: 'Add request',
          emptyLabel: 'No requests yet.',
          upvoteLabel: 'Prioritize',
          upvotedLabel: 'Prioritized',
        },
        theme: {
          accent: '#0f766e',
          accentSoft: '#ccfbf1',
          background: '#ffffff',
          border: '#cbd5e1',
          buttonRadius: '4px',
          fieldRadius: '4px',
          fontSize: '13px',
          headingSize: '18px',
          itemRadius: '4px',
          maxWidth: '640px',
          muted: '#475569',
          radius: '4px',
          shadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
          surfaceAlt: '#f8fafc',
          text: '#0f172a',
        },
      },
    };
  }

  if (variant === 'high-contrast') {
    return {
      bodyBackground: '#000000',
      bodyColor: '#ffffff',
      heading: 'Access Lab',
      config: {
        density: 'spacious',
        layout: 'panel',
        copy: {
          heading: 'Accessibility requests',
          titleLabel: 'Barrier or request',
          titlePlaceholder: 'Describe the access need',
          descriptionLabel: 'Impact',
          descriptionPlaceholder: 'What task is blocked?',
          submitLabel: 'Submit access request',
          emptyLabel: 'No access requests yet.',
          retryLabel: 'Try loading again',
          upvoteLabel: 'Support',
          upvotedLabel: 'Supported',
        },
        theme: {
          accent: '#ffd400',
          accentSoft: '#1f1f00',
          accentText: '#000000',
          background: '#000000',
          border: '#ffffff',
          borderWidth: '2px',
          buttonRadius: '0',
          danger: '#ff7b72',
          fieldBackground: '#000000',
          fieldRadius: '0',
          fieldText: '#ffffff',
          focus: '#00ffff',
          fontSize: '16px',
          headingSize: '24px',
          itemRadius: '0',
          maxWidth: '780px',
          muted: '#f5f5f5',
          radius: '0',
          surface: '#000000',
          surfaceAlt: '#111111',
          text: '#ffffff',
          upvoteBackground: '#000000',
          upvoteBorder: '#ffd400',
          upvoteText: '#ffd400',
        },
      },
    };
  }

  return {
    bodyBackground: '#f3efe7',
    bodyColor: '#2f2a24',
    heading: 'Community Hub',
    config: {
      density: 'comfortable',
      layout: 'panel',
      copy: {
        heading: 'Community ideas',
        titleLabel: 'Idea',
        titlePlaceholder: 'What should we improve?',
        descriptionLabel: 'Tell us more',
        descriptionPlaceholder: 'Add a little color or context',
        submitLabel: 'Share idea',
        emptyLabel: 'No ideas yet. Start the conversation.',
        issuePrefix: 'Tracked as #',
        upvoteLabel: 'Cheer',
        upvotedLabel: 'Cheered',
      },
      theme: {
        accent: '#9f1239',
        accentSoft: '#ffe4e6',
        background: '#fffaf5',
        border: '#e7d7c6',
        buttonRadius: '999px',
        fieldRadius: '12px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        headingSize: '23px',
        itemRadius: '16px',
        itemShadow: '0 10px 30px rgba(79, 46, 19, 0.08)',
        maxWidth: '720px',
        muted: '#7c6f64',
        radius: '18px',
        shadow: '0 18px 50px rgba(79, 46, 19, 0.12)',
        surface: '#fffdf8',
        surfaceAlt: '#fff7ed',
        text: '#2f2a24',
      },
    },
  };
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtml(value: string): string {
  return escapeAttribute(value);
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('</', '<\\/');
}
