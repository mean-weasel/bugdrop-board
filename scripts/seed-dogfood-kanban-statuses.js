#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const DEFAULT_BOARD_ID = 'board_mean_weasel_bugdrop_board_production_dogfood';
const DEMO_ITEMS = [
  {
    issueNumber: 11,
    status: 'open',
    title: 'Let teams pin the top request',
    description:
      'Admins want one high-priority idea to stay visible while the rest of the board moves.',
  },
  {
    issueNumber: 10,
    status: 'open',
    title: 'Add email alerts for new ideas',
    description:
      'Product leads want a lightweight notification when a customer submits a fresh request.',
  },
  {
    issueNumber: 9,
    status: 'planned',
    title: 'Export board ideas to CSV',
    description: 'Ops teams want a quick way to review requests in spreadsheets during planning.',
  },
  {
    issueNumber: 8,
    status: 'planned',
    title: 'Let users filter by status',
    description: 'Visitors want to focus on open requests, planned work, or shipped improvements.',
  },
  {
    issueNumber: 7,
    status: 'in_progress',
    title: 'Theme presets for embedded boards',
    description: 'Installers want polished starting themes that still inherit their app aesthetic.',
  },
  {
    issueNumber: 6,
    status: 'in_progress',
    title: 'Mobile-first voting layout',
    description: 'Customers using narrow app panels need voting controls that stay easy to tap.',
  },
  {
    issueNumber: 5,
    status: 'shipped',
    title: 'Hide GitHub issue links from users',
    description: 'Public boards can now keep implementation details out of the customer-facing UI.',
  },
  {
    issueNumber: 4,
    status: 'shipped',
    title: 'Collapse the idea composer by default',
    description:
      'The board now starts with requests first while still making idea creation obvious.',
  },
  {
    issueNumber: 3,
    status: 'open',
    title: 'Support custom empty-state copy',
    description: 'Teams want empty boards to sound like their own product, not a generic widget.',
  },
  {
    issueNumber: 2,
    status: 'open',
    title: 'Show vote counts in compact cards',
    description: 'Visitors need to understand demand at a glance before adding another request.',
  },
  {
    issueNumber: 1,
    status: 'open',
    title: 'Add keyboard shortcuts for review',
    description: 'Power users want faster navigation when triaging a busy feature board.',
  },
];

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

  const issueNumbers = DEMO_ITEMS.map(item => item.issueNumber);
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
  const statusCases = buildCase('status');
  const titleCases = buildCase('title');
  const descriptionCases = buildCase('description');
  const issueList = issueNumbers.join(', ');
  const escapedBoardId = escapeSql(boardId);

  return `
SELECT 'before' AS phase, status, COUNT(*) AS count
FROM board_items
WHERE board_id = '${escapedBoardId}'
GROUP BY status
ORDER BY status;

UPDATE board_items
SET status = CASE github_issue_number ${statusCases} ELSE status END,
    title = CASE github_issue_number ${titleCases} ELSE title END,
    description = CASE github_issue_number ${descriptionCases} ELSE description END,
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

SELECT github_issue_number, title, status, description
FROM board_items
WHERE board_id = '${escapedBoardId}'
  AND github_issue_number IN (${issueList})
ORDER BY github_issue_number DESC;
`.trim();
}

function buildCase(field) {
  return DEMO_ITEMS.map(
    item => `WHEN ${item.issueNumber} THEN '${escapeSql(String(item[field]))}'`
  ).join(' ');
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
