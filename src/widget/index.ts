import { BoardApi } from './api';
import { renderBoard } from './dom';
import { appendWidgetHost } from './mount';
import { injectTheme } from './theme';
import type { BoardItemView, BoardState, BoardWidgetConfig } from './types';

const script = document.currentScript as HTMLScriptElement | null;

function readConfig(): BoardWidgetConfig {
  if (!script) {
    throw new Error('BugDrop Board script tag could not be identified');
  }

  const boardId = script.dataset.boardId || script.dataset.repo;
  if (!boardId) {
    throw new Error('BugDrop Board requires data-board-id or data-repo');
  }

  const tokenEndpoint = script.dataset.tokenEndpoint;
  if (!tokenEndpoint) {
    throw new Error('BugDrop Board requires data-token-endpoint');
  }

  return {
    apiUrl: script.dataset.apiUrl || new URL(script.src).origin,
    boardId,
    tokenEndpoint,
    accentColor: script.dataset.color || '#2563eb',
    mountSelector: script.dataset.mountSelector,
    pollIntervalMs: parsePollInterval(script.dataset.pollInterval),
  };
}

function parsePollInterval(value: string | undefined): number {
  if (!value) {
    return 3000 + Math.floor(Math.random() * 750);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 500 ? parsed : 3000;
}

async function getToken(config: BoardWidgetConfig): Promise<string> {
  const res = await fetch(config.tokenEndpoint, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Token request failed with ${res.status}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Error('Token request did not return a token');
  }
  return data.token;
}

function upsertItem(items: BoardItemView[], item: BoardItemView): BoardItemView[] {
  const exists = items.some(existing => existing.id === item.id);
  if (!exists) {
    return [item, ...items];
  }
  return items.map(existing => (existing.id === item.id ? item : existing));
}

function replaceItems(items: BoardItemView[], nextItems: BoardItemView[]): BoardItemView[] {
  const byId = new Map(nextItems.map(item => [item.id, item]));
  const merged = items.map(item => byId.get(item.id) ?? item);
  for (const item of nextItems) {
    if (!items.some(existing => existing.id === item.id)) {
      merged.unshift(item);
    }
  }
  return merged;
}

function mount(config: BoardWidgetConfig): void {
  if (!script) {
    throw new Error('BugDrop Board script tag could not be identified');
  }

  const host = document.createElement('div');
  host.setAttribute('data-bugdrop-board-root', '');
  const shadow = host.attachShadow({ mode: 'open' });
  const root = document.createElement('div');
  injectTheme(shadow, config.accentColor);
  shadow.append(root);
  appendWidgetHost(host, { document, script, mountSelector: config.mountSelector });

  const api = new BoardApi(config.apiUrl, config.boardId, () => getToken(config));
  let state: BoardState = { items: [], cursor: 0, loading: true };

  const refreshItems = async () => {
    const items = await api.listItems();
    state = { ...state, items: replaceItems(state.items, items), loading: false, error: undefined };
    rerender();
  };

  const retryRefresh = async () => {
    state = { ...state, loading: true, error: undefined };
    rerender();
    try {
      await refreshItems();
    } catch (error) {
      state = {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Load failed',
      };
      rerender();
    }
  };

  const rerender = () =>
    renderBoard(root, state, {
      onCreate: async input => {
        state = { ...state, submitting: true, error: undefined };
        rerender();
        try {
          const item = await api.createItem(input);
          state = { ...state, items: upsertItem(state.items, item), submitting: false };
          rerender();
        } catch (error) {
          state = {
            ...state,
            submitting: false,
            error: error instanceof Error ? error.message : 'Create failed',
          };
          rerender();
        }
      },
      onUpvote: async itemId => {
        try {
          const item = await api.toggleUpvote(itemId);
          state = { ...state, items: upsertItem(state.items, item), error: undefined };
          rerender();
        } catch (error) {
          state = {
            ...state,
            error: error instanceof Error ? error.message : 'Upvote failed',
          };
          rerender();
        }
      },
      onRetry: retryRefresh,
    });

  rerender();
  refreshItems().catch(error => {
    state = {
      ...state,
      loading: false,
      error: error instanceof Error ? error.message : 'Load failed',
    };
    rerender();
  });

  window.setInterval(() => {
    if (document.hidden) {
      return;
    }
    api
      .events(state.cursor)
      .then(async update => {
        if (update.cursor === state.cursor && update.events.length === 0) {
          return;
        }
        state = { ...state, cursor: update.cursor };
        await refreshItems();
      })
      .catch(error => {
        state = {
          ...state,
          error: error instanceof Error ? error.message : 'Polling failed',
        };
        rerender();
      });
  }, config.pollIntervalMs);
}

mount(readConfig());
