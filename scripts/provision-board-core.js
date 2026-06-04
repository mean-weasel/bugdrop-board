const REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const ENV_PATTERN = /^[A-Za-z0-9_-]+$/;

export function parseArgs(argv) {
  const options = { local: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo') {
      options.repo = readValue(argv, (index += 1), '--repo');
    } else if (arg === '--name') {
      options.name = readValue(argv, (index += 1), '--name');
    } else if (arg === '--env') {
      const env = readValue(argv, (index += 1), '--env');
      if (!ENV_PATTERN.test(env)) {
        throw new Error(
          'Expected --env to contain only letters, numbers, underscores, and hyphens'
        );
      }
      options.env = env;
    } else if (arg === '--local') {
      options.local = true;
    } else if (arg === '--remote') {
      options.local = false;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

export function boardFromRepo(repo, name) {
  if (!repo || !REPO_PATTERN.test(repo)) {
    throw new Error('Expected --repo owner/name using GitHub repo characters');
  }
  const [repoOwner, repoName] = repo.split('/');
  const boardName = name?.trim() || `${repoOwner}/${repoName}`;
  if (boardName.length > 120) {
    throw new Error('--name must be 120 characters or fewer');
  }
  const id = `board_${repoOwner}_${repoName}`.replace(/[^a-zA-Z0-9_]/g, '_');
  return { id, repoOwner, repoName, name: boardName };
}

export function buildUpsertSql(board) {
  return `INSERT INTO boards (id, repo_owner, repo_name, name)
VALUES (${sqlString(board.id)}, ${sqlString(board.repoOwner)}, ${sqlString(board.repoName)}, ${sqlString(board.name)})
ON CONFLICT(repo_owner, repo_name) DO UPDATE SET
  name = excluded.name,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function readValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return value;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
