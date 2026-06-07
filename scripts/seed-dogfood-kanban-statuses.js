#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const DEFAULT_BOARD_ID = 'board_mean_weasel_bugdrop_board_production_dogfood';
const STATUS_BY_ISSUE = new Map([
  [11, 'open'],
  [10, 'planned'],
  [9, 'planned'],
  [8, 'in_progress'],
  [7, 'in_progress'],
  [6, 'shipped'],
  [5, 'shipped'],
]);

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.env !== 'production' && !options.allowNonProduction) {
    throw new Error(
      'Refusing to seed dogfood kanban statuses outside production without --allow-non-production'
    );
  }

  const issueNumbers = [...STATUS_BY_ISSUE.keys()];
  const sql = buildSql(options.boardId, issueNumbers);
  runWrangler(['d1', 'execute', 'DB', '--remote', '--env', options.env, '--command', sql]);
}

function parseArgs(args) {
  const options = {
    allowNonProduction: false,
    boardId: DEFAULT_BOARD_ID,
    env: 'production',
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--allow-non-production') {
      options.allowNonProduction = true;
    } else if (arg === '--board-id') {
      options.boardId = requiredValue(args, (index += 1), arg);
    } else if (arg === '--env') {
      options.env = requiredValue(args, (index += 1), arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function buildSql(boardId, issueNumbers) {
  const cases = [...STATUS_BY_ISSUE.entries()]
    .map(([issueNumber, status]) => `WHEN ${issueNumber} THEN '${status}'`)
    .join(' ');
  const issueList = issueNumbers.join(', ');
  const escapedBoardId = escapeSql(boardId);

  return `
SELECT 'before' AS phase, status, COUNT(*) AS count
FROM board_items
WHERE board_id = '${escapedBoardId}'
GROUP BY status
ORDER BY status;

UPDATE board_items
SET status = CASE github_issue_number ${cases} ELSE status END,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE board_id = '${escapedBoardId}'
  AND github_issue_number IN (${issueList});

INSERT INTO board_events (board_id, event_type, item_id, payload_json)
SELECT board_id,
       'item_status_updated',
       id,
       json_object('itemId', id, 'status', status)
FROM board_items
WHERE board_id = '${escapedBoardId}'
  AND github_issue_number IN (${issueList});

SELECT 'after' AS phase, status, COUNT(*) AS count
FROM board_items
WHERE board_id = '${escapedBoardId}'
GROUP BY status
ORDER BY status;

SELECT github_issue_number, title, status
FROM board_items
WHERE board_id = '${escapedBoardId}'
  AND github_issue_number IN (${issueList})
ORDER BY github_issue_number DESC;
`.trim();
}

function escapeSql(value) {
  return value.replaceAll("'", "''");
}

function runWrangler(args) {
  const result = spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printHelp() {
  console.log(`Usage: node scripts/seed-dogfood-kanban-statuses.js [options]

Seeds the production dogfood board with a non-destructive spread of kanban statuses.

Options:
  --env <name>                 Wrangler environment. Defaults to production.
  --board-id <id>              Board id. Defaults to the production dogfood board.
  --allow-non-production       Permit non-production environments.
  --help                       Show this help.
`);
}

main();
