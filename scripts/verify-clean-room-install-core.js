export const DEFAULT_HOST_CONFIG = {
  boardId: 'board_mean_weasel_demo',
  scriptPath: '/vendor/bugdrop-board.js',
  apiUrl: '/api',
  tokenEndpoint: '/api/bugdrop-board-token',
  mountSelector: '#feedback-board',
  pollIntervalMs: 600000,
  color: '#1f883d',
  configSelector: '#bugdrop-board-config',
  customization: {
    copy: {
      heading: 'Clean-room board',
      issuePrefix: 'Ticket #',
      submitLabel: 'Add proof',
      upvoteLabel: 'Vote',
      upvotedLabel: 'Voted',
    },
    density: 'compact',
    layout: 'panel',
    theme: {
      accent: '#1f883d',
      border: '#b7d8c2',
      buttonRadius: '4px',
      maxWidth: '640px',
      radius: '6px',
    },
  },
};

export function parseArgs(
  argv,
  defaults = {
    packageName: '@mean-weasel/bugdrop-board',
    version: process.env.PACKAGE_VERSION ?? '0.1.2',
  }
) {
  const options = {
    packageName: defaults.packageName,
    version: defaults.version,
    retries: 3,
    retryDelayMs: 5000,
    keep: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--package') {
      options.packageName = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--version') {
      options.version = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--retries') {
      options.retries = parseInteger(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--retry-delay-ms') {
      options.retryDelayMs = parseInteger(arg, next);
      index += 1;
      continue;
    }
    if (arg === '--keep') {
      options.keep = true;
      continue;
    }
    if (arg === '--help') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseInteger(flag, value) {
  const parsed = Number.parseInt(requireValue(flag, value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

export function buildHostHtml(config = {}) {
  const merged = { ...DEFAULT_HOST_CONFIG, ...config };
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>BugDrop Board Clean-Room Host</title>
  </head>
  <body>
    <main>
      <h1>Host App</h1>
      <section id="feedback-board"></section>
      <script type="application/json" id="${escapeAttribute(
        merged.configSelector.replace(/^#/, '')
      )}">${escapeScriptJson(merged.customization)}</script>
      <script
        src="${escapeAttribute(merged.scriptSrc ?? merged.scriptPath)}"
        data-board-id="${escapeAttribute(merged.boardId)}"
        data-api-url="${escapeAttribute(merged.apiUrl)}"
        data-token-endpoint="${escapeAttribute(merged.tokenEndpoint)}"
        data-mount-selector="${escapeAttribute(merged.mountSelector)}"
        data-poll-interval="${escapeAttribute(String(merged.pollIntervalMs))}"
        data-color="${escapeAttribute(merged.color)}"
        data-config-selector="${escapeAttribute(merged.configSelector)}"
      ></script>
    </main>
  </body>
</html>`;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replaceAll('</', '<\\/');
}
