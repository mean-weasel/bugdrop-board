import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { boardFromRepo } from './provision-board-core.js';

const ENV_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;
const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';

export function parseArgs(argv) {
  const options = { env: 'production', json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--env') {
      options.env = requireValue(argv, (index += 1), arg);
      if (!ENV_PATTERN.test(options.env)) {
        throw new Error('--env must contain only letters, numbers, underscores, and hyphens');
      }
    } else if (arg === '--host-origin') {
      options.hostOrigin = normalizeOrigin(requireValue(argv, (index += 1), arg), arg);
    } else if (arg === '--worker-url') {
      options.workerUrl = normalizeUrl(requireValue(argv, (index += 1), arg), arg);
    } else if (arg === '--token-endpoint') {
      options.tokenEndpoint = normalizeUrl(requireValue(argv, (index += 1), arg), arg);
    } else if (arg === '--board-id') {
      options.boardId = requireValue(argv, (index += 1), arg);
    } else if (arg === '--repo') {
      options.repo = requireValue(argv, (index += 1), arg);
    } else if (arg === '--check-cloudflare-auth') {
      options.checkCloudflareAuth = true;
    } else if (arg === '--check-github-token') {
      options.checkGitHubToken = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

export async function runDoctor(options, deps = {}) {
  const io = doctorDeps(deps);
  const checks = [];
  const packageJson = readJson(io, 'package.json');
  const lockJson = readJson(io, 'package-lock.json');
  const wranglerToml = io.readText('wrangler.toml');

  checks.push(checkPackageMetadata(packageJson, lockJson));
  checks.push(checkNodeVersion(io.nodeVersion));
  checks.push(
    checkCommandVersion('npm', ['npm', '--version'], version => inMajor(version, 10), io)
  );
  checks.push(
    checkCommandVersion('wrangler', ['npx', 'wrangler', '--version'], hasMajorAtLeast4, io)
  );
  checks.push(checkDeploySecretIgnore(io.readText('.gitignore')));
  checks.push(checkMigrations(io.readDir('migrations')));
  checks.push(...checkWranglerEnv(wranglerToml, options));
  checks.push(...checkRepoAndBoard(options));
  checks.push(checkSmokeInputs(options));

  if (options.checkCloudflareAuth) {
    checks.push(checkCommand('cloudflare_auth', ['npx', 'wrangler', 'whoami'], io));
  }
  if (options.checkGitHubToken) {
    checks.push(await checkGitHubToken(options, io));
  }

  const summary = summarize(checks);
  return {
    ok: summary.fail === 0,
    env: options.env,
    summary,
    checks,
    nextCommands: nextCommands(options),
  };
}

function defaultRunCommand(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function doctorDeps(deps) {
  return {
    env: deps.env ?? process.env,
    fetchImpl: deps.fetchImpl ?? fetch,
    nodeVersion: deps.nodeVersion ?? process.versions.node,
    readDir: deps.readDir ?? (path => readdirSync(path)),
    readText: deps.readText ?? (path => readFileSync(path, 'utf8')),
    runCommand: deps.runCommand ?? defaultRunCommand,
  };
}

function readJson(io, path) {
  return JSON.parse(io.readText(path));
}

function checkPackageMetadata(packageJson, lockJson) {
  const failures = [];
  if (!packageJson.packageManager?.startsWith('npm@')) {
    failures.push('packageManager must pin npm');
  }
  if (!packageJson.engines?.node || !packageJson.engines?.npm) {
    failures.push('package.json engines must include node and npm');
  }
  if (lockJson.packages?.['']?.engines?.node !== packageJson.engines?.node) {
    failures.push('package-lock root node engine must match package.json');
  }
  return check('package_metadata', failures.length === 0 ? 'pass' : 'fail', failures.join('; '));
}

function checkNodeVersion(version) {
  return check(
    'node_version',
    versionInRange(version, 22, 12, 23) ? 'pass' : 'fail',
    `detected ${version}; expected >=22.12.0 <23`
  );
}

function checkCommandVersion(id, command, predicate, io) {
  const [bin, ...args] = command;
  const result = io.runCommand(bin, args);
  const output = `${result.stdout} ${result.stderr}`.trim();
  if (result.status !== 0) {
    return check(id, 'fail', `${command.join(' ')} failed: ${output}`);
  }
  return check(id, predicate(output) ? 'pass' : 'fail', output);
}

function checkCommand(id, command, io) {
  const [bin, ...args] = command;
  const result = io.runCommand(bin, args);
  const output = `${result.stdout} ${result.stderr}`.trim();
  return check(id, result.status === 0 ? 'pass' : 'fail', output || command.join(' '));
}

function checkDeploySecretIgnore(gitignore) {
  return check(
    'deploy_secret_ignore',
    gitignore.split(/\r?\n/).includes('.deploy.secrets') ? 'pass' : 'fail',
    '.deploy.secrets should be ignored'
  );
}

function checkMigrations(entries) {
  const migrations = entries.filter(entry => /^\d+_.*\.sql$/.test(entry)).sort();
  return check(
    'd1_migrations',
    migrations.length >= 2 ? 'pass' : 'fail',
    `found ${migrations.join(', ') || 'no migrations'}`
  );
}

function checkWranglerEnv(toml, options) {
  const vars = tomlTable(toml, `[env.${options.env}.vars]`);
  const d1 = tomlArrayTable(toml, `[[env.${options.env}.d1_databases]]`);
  const checks = [];

  checks.push(
    check('wrangler_env_vars', vars ? 'pass' : 'fail', `expected [env.${options.env}.vars]`)
  );
  checks.push(
    check(
      'wrangler_d1_binding',
      d1 ? 'pass' : 'fail',
      `expected [[env.${options.env}.d1_databases]]`
    )
  );

  if (vars) {
    const environment = tomlString(vars, 'ENVIRONMENT');
    const origins = tomlString(vars, 'ALLOWED_ORIGINS');
    checks.push(
      check(
        'wrangler_environment_value',
        environment === options.env ? 'pass' : 'warn',
        `ENVIRONMENT=${environment ?? '<missing>'}; target env=${options.env}`
      )
    );
    checks.push(
      check(
        'allowed_origins_exact',
        origins && origins !== '*' ? 'pass' : 'fail',
        `ALLOWED_ORIGINS=${origins ?? '<missing>'}`
      )
    );
    if (options.hostOrigin && origins) {
      checks.push(
        check(
          'host_origin_allowed',
          origins
            .split(',')
            .map(value => value.trim())
            .includes(options.hostOrigin)
            ? 'pass'
            : 'fail',
          `${options.hostOrigin} must be listed in ALLOWED_ORIGINS`
        )
      );
    }
    checks.push(
      check(
        'board_token_context',
        tomlString(vars, 'BOARD_TOKEN_AUDIENCE') && tomlString(vars, 'BOARD_TOKEN_ISSUER')
          ? 'pass'
          : 'fail',
        'BOARD_TOKEN_AUDIENCE and BOARD_TOKEN_ISSUER must be set'
      )
    );
  }

  if (d1) {
    const binding = tomlString(d1, 'binding');
    const databaseId = tomlString(d1, 'database_id');
    checks.push(check('d1_binding_name', binding === 'DB' ? 'pass' : 'fail', `binding=${binding}`));
    checks.push(
      check(
        'd1_database_id',
        databaseId && databaseId !== PLACEHOLDER_ID ? 'pass' : 'fail',
        `database_id=${databaseId ?? '<missing>'}`
      )
    );
  }
  return checks;
}

function checkRepoAndBoard(options) {
  const checks = [];
  if (!options.repo) {
    checks.push(check('repo_shape', 'warn', 'pass --repo owner/name to verify board id shape'));
    return checks;
  }
  let board;
  try {
    board = boardFromRepo(options.repo);
    checks.push(check('repo_shape', 'pass', `${options.repo} -> ${board.id}`));
  } catch (error) {
    checks.push(check('repo_shape', 'fail', error.message));
    return checks;
  }
  if (options.boardId) {
    checks.push(
      check(
        'board_id_matches_repo',
        options.boardId === board.id ? 'pass' : 'fail',
        `expected ${board.id}; got ${options.boardId}`
      )
    );
  }
  return checks;
}

function checkSmokeInputs(options) {
  const missing = ['workerUrl', 'hostOrigin', 'boardId', 'tokenEndpoint'].filter(
    key => !options[key]
  );
  if (missing.length > 0) {
    return check(
      'deploy_smoke_inputs',
      'warn',
      `missing ${missing.join(', ')}; deploy smoke command cannot be composed yet`
    );
  }
  return check('deploy_smoke_inputs', 'pass', nextCommands(options).deploySmoke);
}

async function checkGitHubToken(options, io) {
  if (!options.repo) {
    return check('github_token_repo_access', 'fail', '--repo is required for GitHub token check');
  }
  const token = io.env.ISSUE_ACCESS_TOKEN ?? io.env.GITHUB_ISSUE_ACCESS_TOKEN;
  if (!token) {
    return check('github_token_repo_access', 'fail', 'ISSUE_ACCESS_TOKEN is not set');
  }
  const response = await io.fetchImpl(`https://api.github.com/repos/${options.repo}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'bugdrop-board-selfhost-doctor',
    },
  });
  return check(
    'github_token_repo_access',
    response.ok ? 'pass' : 'fail',
    `GET /repos/${options.repo} returned ${response.status}`
  );
}

function nextCommands(options) {
  if (!options.workerUrl || !options.hostOrigin || !options.boardId || !options.tokenEndpoint) {
    return {};
  }
  return {
    deploySmoke: [
      'npm run deploy:smoke --',
      `--url ${options.workerUrl}`,
      `--expect-environment ${options.env}`,
      `--cors-origin ${options.hostOrigin}`,
      '--cors-disallowed-origin https://evil.example',
      `--cors-board-id ${options.boardId}`,
      `--cors-token-endpoint ${options.tokenEndpoint}`,
    ].join(' '),
  };
}

function tomlTable(toml, header) {
  return tomlBlock(toml, header, line => line.startsWith('['));
}

function tomlArrayTable(toml, header) {
  return tomlBlock(toml, header, line => line.startsWith('['));
}

function tomlBlock(toml, header, isNextHeader) {
  const lines = toml.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === header);
  if (start === -1) {
    return null;
  }
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (isNextHeader(line.trim())) {
      break;
    }
    body.push(line);
  }
  return body.join('\n');
}

function tomlString(block, key) {
  const match = block.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1] ?? null;
}

function summarize(checks) {
  return {
    pass: checks.filter(item => item.status === 'pass').length,
    warn: checks.filter(item => item.status === 'warn').length,
    fail: checks.filter(item => item.status === 'fail').length,
  };
}

function check(id, status, message) {
  return { id, status, message };
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function normalizeUrl(value, flag) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${flag} must be a valid URL`);
  }
}

function normalizeOrigin(value, flag) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${flag} must be a valid origin`);
  }
}

function versionInRange(version, major, minor, nextMajor) {
  const parts = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!parts) {
    return false;
  }
  const detectedMajor = Number(parts[1]);
  const detectedMinor = Number(parts[2]);
  return detectedMajor === major && detectedMinor >= minor && detectedMajor < nextMajor;
}

function inMajor(version, major) {
  return version.trim().startsWith(`${major}.`);
}

function hasMajorAtLeast4(output) {
  const match = output.match(/(\d+)\.\d+\.\d+/);
  return match ? Number(match[1]) >= 4 : false;
}
