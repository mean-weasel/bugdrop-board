export const PREVIEW_CANARY_PROFILE = Object.freeze({
  id: 'preview',
  repo: 'mean-weasel/bugdrop-board-widget-test',
  repositoryId: 'R_kgDOT5iiFg',
  venueOrigin: 'https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app',
  workerOrigin: 'https://bugdrop-board-preview.neonwatty.workers.dev',
  boardId: 'board_preview_ci',
  titlePrefix: '[BugDrop Board CI canary]',
  markerPattern: /^bugdrop-board-ci:[0-9]+:[0-9]+:[a-f0-9]{40}$/,
});

export function validateCanarySelector({
  repo,
  repositoryId,
  expectedAuthor,
  marker,
  prefix,
  expectedWorkerSha,
}) {
  requireExact(repo, PREVIEW_CANARY_PROFILE.repo, 'repo');
  requireExact(repositoryId, PREVIEW_CANARY_PROFILE.repositoryId, 'repository id');
  requireGitHubLogin(expectedAuthor, 'expected author');
  if (Boolean(marker) === Boolean(prefix)) {
    throw new Error('Exactly one of marker or prefix is required');
  }
  if (marker) {
    validateMarker(marker, expectedWorkerSha);
    return { profile: PREVIEW_CANARY_PROFILE, marker, expectedAuthor };
  }
  requireExact(prefix, PREVIEW_CANARY_PROFILE.titlePrefix, 'prefix');
  return { profile: PREVIEW_CANARY_PROFILE, prefix, expectedAuthor };
}

export function validateBrowserCanaryConfig({
  repo,
  repositoryId,
  venueOrigin,
  workerOrigin,
  boardId,
  marker,
  expectedWorkerSha,
  venueCommit,
  configVersion,
}) {
  requireExact(repo, PREVIEW_CANARY_PROFILE.repo, 'repo');
  requireExact(repositoryId, PREVIEW_CANARY_PROFILE.repositoryId, 'repository id');
  requireExact(normalizeOrigin(venueOrigin), PREVIEW_CANARY_PROFILE.venueOrigin, 'venue origin');
  requireExact(normalizeOrigin(workerOrigin), PREVIEW_CANARY_PROFILE.workerOrigin, 'Worker origin');
  requireExact(boardId, PREVIEW_CANARY_PROFILE.boardId, 'board id');
  validateMarker(marker, expectedWorkerSha);
  requireSha(venueCommit, 'venue commit');
  requireNonempty(configVersion, 'config version');
  return PREVIEW_CANARY_PROFILE;
}

export function markerFromIssue(issue) {
  if (typeof issue?.title !== 'string') return null;
  const prefix = `${PREVIEW_CANARY_PROFILE.titlePrefix} `;
  if (!issue.title.startsWith(prefix)) return null;
  const marker = issue.title.slice(prefix.length);
  return PREVIEW_CANARY_PROFILE.markerPattern.test(marker) ? marker : null;
}

export function canonicalIssueUrl(value, number) {
  if (typeof value !== 'string' || !Number.isInteger(number) || number <= 0) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.origin === 'https://github.com' &&
    !url.search &&
    !url.hash &&
    url.pathname.toLowerCase() ===
      `/mean-weasel/bugdrop-board-widget-test/issues/${number}`.toLowerCase()
  );
}

function validateMarker(marker, expectedWorkerSha) {
  if (!PREVIEW_CANARY_PROFILE.markerPattern.test(marker)) {
    throw new Error('marker does not match the preview canary namespace');
  }
  if (expectedWorkerSha !== undefined) {
    requireSha(expectedWorkerSha, 'expected Worker SHA');
    if (!marker.endsWith(`:${expectedWorkerSha}`)) {
      throw new Error('marker does not end with the expected Worker SHA');
    }
  }
}

function normalizeOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('origin must be an exact HTTPS origin');
  }
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) {
    throw new Error('origin must be an exact HTTPS origin');
  }
  return value;
}

function requireSha(value, field) {
  if (!/^[a-f0-9]{40}$/.test(value ?? '')) {
    throw new Error(`${field} must be a full lowercase Git SHA`);
  }
}

function requireGitHubLogin(value, field) {
  requireNonempty(value, field);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})(?:\[bot\])?$/.test(value)) {
    throw new Error(`${field} is not a valid GitHub login`);
  }
}

function requireNonempty(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
}

function requireExact(actual, expected, field) {
  if (actual !== expected) throw new Error(`${field} must equal ${expected}`);
}
