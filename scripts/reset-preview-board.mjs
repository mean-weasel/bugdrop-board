#!/usr/bin/env node

import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { PREVIEW_CONTRACT, validatePreviewContract } from './validate-preview-config.mjs';

export function parsePreviewResetArgs(argv) {
  const options = { dryRun: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--board-id') options.boardId = requiredValue(argv, (index += 1), arg);
    else if (arg === '--confirm-board') {
      options.confirmBoard = requiredValue(argv, (index += 1), arg);
    } else if (arg === '--remote') options.dryRun = false;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.help) validateResetTarget(options.boardId, options.confirmBoard);
  return options;
}

export function buildPreviewResetSql(boardId) {
  const contract = validatePreviewContract(PREVIEW_CONTRACT);
  validateResetTarget(boardId, boardId);
  const before = countsSql('before', contract);
  const after = countsSql('after', contract);
  return compactSql(`${before}

DELETE FROM board_votes WHERE board_id = ${sql(contract.ciBoardId)};
DELETE FROM board_events WHERE board_id = ${sql(contract.ciBoardId)};
DELETE FROM board_items WHERE board_id = ${sql(contract.ciBoardId)};

${after}`);
}

export function assertPreviewResetProof(output) {
  const rows = flattenRows(output);
  const beforeDemo = proofRow(rows, 'before', PREVIEW_CONTRACT.demoBoardId);
  const afterDemo = proofRow(rows, 'after', PREVIEW_CONTRACT.demoBoardId);
  const afterCi = proofRow(rows, 'after', PREVIEW_CONTRACT.ciBoardId);
  for (const key of ['items', 'votes', 'events']) {
    if (numberValue(beforeDemo[key]) !== numberValue(afterDemo[key])) {
      throw new Error(`Preview reset changed demo ${key}`);
    }
    if (numberValue(afterCi[key]) !== 0) {
      throw new Error(`Preview reset left CI ${key}`);
    }
  }
  return { demoUnchanged: true, ciEmpty: true };
}

export function runPreviewReset(options, runner) {
  validateResetTarget(options.boardId, options.confirmBoard);
  const sqlText = buildPreviewResetSql(options.boardId);
  if (options.dryRun) {
    return { dryRun: true, boardId: options.boardId, sql: sqlText };
  }
  if (!runner) throw new Error('Remote preview reset requires a command runner');

  const result = runner(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      'DB',
      '--remote',
      '--env',
      'preview',
      '--json',
      '--command',
      sqlText,
    ],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Preview reset failed');
  }
  const proof = assertPreviewResetProof(JSON.parse(result.stdout));
  return { dryRun: false, boardId: options.boardId, proof };
}

function validateResetTarget(boardId, confirmation) {
  const contract = validatePreviewContract(PREVIEW_CONTRACT);
  if (boardId !== contract.ciBoardId) {
    throw new Error(`Reset is allowlisted only for ${contract.ciBoardId}`);
  }
  if (confirmation !== contract.ciBoardId) {
    throw new Error(`Reset requires --confirm-board ${contract.ciBoardId}`);
  }
}

function countsSql(phase, contract) {
  return `SELECT ${sql(phase)} AS phase, id AS board_id,
  (SELECT COUNT(*) FROM board_items WHERE board_id = boards.id) AS items,
  (SELECT COUNT(*) FROM board_votes WHERE board_id = boards.id) AS votes,
  (SELECT COUNT(*) FROM board_events WHERE board_id = boards.id) AS events
FROM boards
WHERE id IN (${sql(contract.demoBoardId)}, ${sql(contract.ciBoardId)})
ORDER BY board_id;`;
}

function flattenRows(output) {
  const entries = Array.isArray(output) ? output : [output];
  return entries.flatMap(entry => (Array.isArray(entry?.results) ? entry.results : []));
}

function proofRow(rows, phase, boardId) {
  const matches = rows.filter(row => row.phase === phase && row.board_id === boardId);
  if (matches.length !== 1) {
    throw new Error(`Reset proof requires exactly one ${phase} row for ${boardId}`);
  }
  return matches[0];
}

function numberValue(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('Reset proof contained an invalid count');
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function compactSql(value) {
  return value
    .split(';')
    .map(statement => statement.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(statement => `${statement};`)
    .join('\n');
}

function printHelp() {
  console.log(`Usage: npm run reset:preview -- --board-id board_preview_ci --confirm-board board_preview_ci [--dry-run|--remote]

Dry-run is the default. The command refuses every target except the fixed preview CI board and,
after a remote reset, proves the demo counts did not change and the CI counts are zero.`);
}

async function main() {
  const options = parsePreviewResetArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const runner = options.dryRun ? undefined : (await import('node:child_process')).spawnSync;
  console.log(JSON.stringify(runPreviewReset(options, runner), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
