import type { BoardWidgetConfig } from './types';

declare const __BUGDROP_BOARD_VERSION__: string;

const script = document.currentScript as HTMLScriptElement | null;

function readConfig(): BoardWidgetConfig {
  if (!script) {
    throw new Error('BugDrop Board script tag could not be identified');
  }

  const boardId = script.dataset.boardId || script.dataset.repo;
  if (!boardId) {
    throw new Error('BugDrop Board requires data-board-id or data-repo');
  }

  const scriptUrl = new URL(script.src);
  const apiUrl = script.dataset.apiUrl || scriptUrl.origin;

  return { apiUrl, boardId };
}

function mount(config: BoardWidgetConfig): void {
  const root = document.createElement('div');
  root.setAttribute('data-bugdrop-board-root', '');
  root.textContent = `BugDrop Board ${__BUGDROP_BOARD_VERSION__}: ${config.boardId}`;
  document.body.append(root);
}

mount(readConfig());
