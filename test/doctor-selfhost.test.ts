import { describe, expect, it, vi } from 'vitest';
import { parseArgs, runDoctor } from '../scripts/doctor-selfhost-core.js';

describe('self-host doctor', () => {
  it('passes static setup checks and composes the deploy smoke command', async () => {
    const result = await runDoctor(
      parseArgs([
        '--env',
        'production',
        '--host-origin',
        'https://bugdrop.dev',
        '--repo',
        'mean-weasel/bugdrop-board-production-dogfood',
        '--board-id',
        'board_mean_weasel_bugdrop_board_production_dogfood',
        '--worker-url',
        'https://board.bugdrop.dev',
        '--token-endpoint',
        'https://bugdrop.dev/api/bugdrop-board-token?viewer=a',
      ]),
      fakeDeps()
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ fail: 0 });
    expect(check(result, 'host_origin_allowed')).toMatchObject({ status: 'pass' });
    expect(check(result, 'board_id_matches_repo')).toMatchObject({ status: 'pass' });
    expect(result.nextCommands.deploySmoke).toContain(
      '--cors-disallowed-origin https://evil.example'
    );
  });

  it('fails for unsafe production config and mismatched board id', async () => {
    const result = await runDoctor(
      parseArgs([
        '--host-origin',
        'https://app.example.com',
        '--repo',
        'mean-weasel/demo',
        '--board-id',
        'board_other',
      ]),
      fakeDeps({
        'wrangler.toml': productionWrangler({
          allowedOrigins: '*',
          databaseId: '00000000-0000-0000-0000-000000000000',
        }),
      })
    );

    expect(result.ok).toBe(false);
    expect(check(result, 'allowed_origins_exact')).toMatchObject({ status: 'fail' });
    expect(check(result, 'd1_database_id')).toMatchObject({ status: 'fail' });
    expect(check(result, 'board_id_matches_repo')).toMatchObject({ status: 'fail' });
  });

  it('warns when optional smoke inputs are incomplete', async () => {
    const result = await runDoctor(parseArgs(['--repo', 'mean-weasel/demo']), fakeDeps());

    expect(result.ok).toBe(true);
    expect(check(result, 'deploy_smoke_inputs')).toMatchObject({ status: 'warn' });
  });

  it('keeps Cloudflare and GitHub live checks behind explicit flags', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const result = await runDoctor(
      parseArgs(['--repo', 'mean-weasel/demo', '--check-cloudflare-auth', '--check-github-token']),
      fakeDeps({
        env: { ISSUE_ACCESS_TOKEN: 'token' },
        fetchImpl,
        commandResults: {
          'npx wrangler whoami': { status: 0, stdout: 'you@example.com', stderr: '' },
        },
      })
    );

    expect(check(result, 'cloudflare_auth')).toMatchObject({ status: 'pass' });
    expect(check(result, 'github_token_repo_access')).toMatchObject({ status: 'pass' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.github.com/repos/mean-weasel/demo',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer token' }),
      })
    );
  });

  it('rejects invalid CLI inputs', () => {
    expect(() => parseArgs(['--env', '../prod'])).toThrow('--env must contain');
    expect(() => parseArgs(['--host-origin', 'not a url'])).toThrow('--host-origin must be');
    expect(() => parseArgs(['--unknown'])).toThrow('Unknown argument');
  });
});

function check(result: Awaited<ReturnType<typeof runDoctor>>, id: string) {
  const found = result.checks.find(item => item.id === id);
  if (!found) {
    throw new Error(`Missing check ${id}`);
  }
  return found;
}

function fakeDeps(overrides: Record<string, unknown> = {}) {
  const files = {
    'package.json': JSON.stringify({
      packageManager: 'npm@10.9.8',
      engines: { node: '>=22.12.0 <23', npm: '>=10 <11' },
    }),
    'package-lock.json': JSON.stringify({
      packages: { '': { engines: { node: '>=22.12.0 <23', npm: '>=10 <11' } } },
    }),
    '.gitignore': '.deploy.secrets\n',
    'wrangler.toml': productionWrangler(),
    ...(overrides.files as Record<string, string> | undefined),
  };
  if (typeof overrides['wrangler.toml'] === 'string') {
    files['wrangler.toml'] = overrides['wrangler.toml'] as string;
  }
  const commandResults = {
    'npm --version': { status: 0, stdout: '10.9.8', stderr: '' },
    'npx wrangler --version': { status: 0, stdout: '4.97.0', stderr: '' },
    ...((overrides.commandResults as Record<string, CommandResult>) ?? {}),
  };
  return {
    env: (overrides.env as Record<string, string>) ?? {},
    fetchImpl: overrides.fetchImpl as typeof fetch | undefined,
    nodeVersion: '22.22.3',
    readDir(path: string) {
      if (path === 'migrations') {
        return ['0001_initial.sql', '0002_request_throttle.sql'];
      }
      return [];
    },
    readText(path: string) {
      const text = files[path];
      if (typeof text !== 'string') {
        throw new Error(`Unexpected read ${path}`);
      }
      return text;
    },
    runCommand(command: string, args: string[]) {
      const key = [command, ...args].join(' ');
      return commandResults[key] ?? { status: 1, stdout: '', stderr: `unexpected ${key}` };
    },
  };
}

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

function productionWrangler({
  allowedOrigins = 'https://bugdrop.dev,https://board.bugdrop.dev',
  databaseId = '6f463f05-eb50-4de9-836d-0eed35f7305c',
} = {}) {
  return `
[env.production.vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "${allowedOrigins}"
BOARD_TOKEN_AUDIENCE = "bugdrop-board"
BOARD_TOKEN_ISSUER = "bugdrop-board-production-host"

[[env.production.d1_databases]]
binding = "DB"
database_name = "bugdrop-board-production"
database_id = "${databaseId}"
`;
}
