import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderBoard } from '../src/widget/dom';
import { injectTheme } from '../src/widget/theme';
import type { BoardState } from '../src/widget/types';

describe('widget DOM rendering', () => {
  beforeEach(() => {
    vi.stubGlobal('document', new MiniDocument());
  });

  it('renders a visible loading status with busy semantics', () => {
    const root = render(state({ loading: true }));
    const shell = root.querySelector('.bugdrop-board');
    const status = root.querySelector('[role="status"]');

    expect(shell?.getAttribute('aria-busy')).toBe('true');
    expect(status?.textContent).toBe('Loading feedback...');
    expect(root.querySelector('.bugdrop-board__list')?.getAttribute('aria-live')).toBe('polite');
  });

  it('renders first-action empty copy when the board has no items', () => {
    const root = render(state({ loading: false }));

    expect(root.querySelector('.bugdrop-board__empty')?.textContent).toBe(
      'No feedback yet. Share the first idea to help prioritize what comes next.'
    );
  });

  it('renders a retryable friendly error state', () => {
    const onRetry = vi.fn();
    const root = render(state({ loading: false, error: 'Token request failed with 500' }), {
      onRetry,
    });

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      "We couldn't load feedback."
    );
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Token request failed with 500'
    );

    root.querySelector<HTMLButtonElement>('.bugdrop-board__retry')?.click();

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders accessible upvote buttons while preserving visible vote text', () => {
    const root = render(
      state({
        loading: false,
        items: [
          {
            id: 'item_1',
            title: 'Add dark mode',
            description: 'Night readers need it.',
            status: 'open',
            upvoteCount: 3,
            viewerHasUpvoted: true,
          },
        ],
      })
    );
    const button = root.querySelector<HTMLButtonElement>('.bugdrop-board__upvote');

    expect(button?.textContent).toBe('Upvoted 3');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.getAttribute('aria-label')).toBe('Remove upvote from Add dark mode. 3 upvotes.');
  });

  it('injects conservative CSS custom-property hooks with data-color as the default accent', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    injectTheme(shadow, '#1f883d');

    const css = shadow.querySelector('style')?.textContent ?? '';
    expect(css).toContain('--bugdrop-board-accent: #1f883d');
    expect(css).toContain('var(--bugdrop-board-accent)');
    expect(css).toContain('var(--bugdrop-board-surface)');
    expect(css).toContain('var(--bugdrop-board-danger)');
  });
});

function render(overrides: BoardState, handlers = {}) {
  const root = document.createElement('div');
  renderBoard(root, overrides, {
    onCreate: vi.fn(),
    onUpvote: vi.fn(),
    onRetry: vi.fn(),
    ...handlers,
  });
  return root;
}

function state(overrides: Partial<BoardState> = {}): BoardState {
  return {
    items: [],
    cursor: 0,
    loading: false,
    ...overrides,
  };
}

class MiniDocument {
  createElement(tagName: string) {
    return new MiniElement(tagName);
  }
}

class MiniElement {
  className = '';
  disabled = false;
  href = '';
  maxLength = 0;
  name = '';
  rel = '';
  required = false;
  rows = 0;
  target = '';
  type = '';
  private readonly attributes = new Map<string, string>();
  private readonly children: MiniElement[] = [];
  private listeners: Record<string, Array<() => void>> = {};
  private ownText = '';

  constructor(readonly tagName: string) {}

  get textContent(): string {
    return `${this.ownText}${this.children.map(child => child.textContent).join('')}`;
  }

  set textContent(value: string) {
    this.ownText = value;
    this.children.length = 0;
  }

  append(...children: MiniElement[]) {
    this.children.push(...children);
  }

  appendChild(child: MiniElement) {
    this.children.push(child);
  }

  attachShadow() {
    return new MiniElement('#shadow-root');
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }

  click() {
    for (const listener of this.listeners.click ?? []) {
      listener();
    }
  }

  querySelector<T = MiniElement>(selector: string): T | null {
    return (this.querySelectorAll(selector)[0] as T | undefined) ?? null;
  }

  querySelectorAll(selector: string): MiniElement[] {
    const matches: MiniElement[] = [];
    for (const child of this.children) {
      if (child.matches(selector)) {
        matches.push(child);
      }
      matches.push(...child.querySelectorAll(selector));
    }
    return matches;
  }

  replaceChildren(...children: MiniElement[]) {
    this.ownText = '';
    this.children.length = 0;
    this.children.push(...children);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  reset() {}

  private matches(selector: string): boolean {
    if (selector.startsWith('.')) {
      return this.className.split(/\s+/).includes(selector.slice(1));
    }
    const attributeMatch = selector.match(/^\[([^=]+)="([^"]+)"\]$/);
    if (attributeMatch) {
      return this.getAttribute(attributeMatch[1]) === attributeMatch[2];
    }
    return this.tagName === selector;
  }
}
