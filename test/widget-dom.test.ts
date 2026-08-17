import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCustomization, DEFAULT_COPY, readCustomization } from '../src/widget/config';
import { renderBoard } from '../src/widget/dom';
import { injectTheme } from '../src/widget/theme';
import type { BoardState, BoardWidgetCustomization, BoardWidgetLayout } from '../src/widget/types';

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
      'Tell us what you want to see next.'
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

    expect(button?.textContent).toBe('Upvoted 3 votes');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.getAttribute('aria-label')).toBe('Remove upvote from Add dark mode. 3 upvotes.');
  });

  it('renders board items in kanban status lanes when configured', () => {
    const root = render(
      state({
        loading: false,
        items: [
          {
            id: 'item_1',
            title: 'Add invite cohorts',
            description: 'Segment beta testers by rollout stage.',
            status: 'open',
            upvoteCount: 12,
          },
          {
            id: 'item_2',
            title: 'Release health dashboard',
            description: 'Track feedback after launch.',
            status: 'in_progress',
            upvoteCount: 8,
          },
          {
            id: 'item_3',
            title: 'Public changelog',
            description: 'Show shipped requests.',
            status: 'shipped',
            upvoteCount: 3,
          },
        ],
      }),
      {},
      DEFAULT_COPY,
      { layout: 'kanban' }
    );

    const lanes = root.querySelectorAll('.bugdrop-board__lane');

    expect(lanes).toHaveLength(4);
    expect(lanes[0].querySelector('.bugdrop-board__lane-title')?.textContent).toBe('Open');
    expect(lanes[0].querySelector('.bugdrop-board__lane-count')?.textContent).toBe('1');
    expect(lanes[0].textContent).toContain('Add invite cohorts');
    expect(lanes[2].querySelector('.bugdrop-board__lane-title')?.textContent).toBe('Building');
    expect(lanes[2].textContent).toContain('Release health dashboard');
    expect(lanes[2].textContent).not.toContain('In progress');
    expect(lanes[3].querySelector('.bugdrop-board__lane-title')?.textContent).toBe('Shipped');
    expect(lanes[3].textContent).toContain('Public changelog');
    expect(lanes[0].querySelector<HTMLButtonElement>('.bugdrop-board__upvote')?.textContent).toBe(
      'Upvote 12'
    );
  });

  it('renders recognizable kanban lanes when the board has no items', () => {
    const root = render(state({ loading: false }), {}, DEFAULT_COPY, { layout: 'kanban' });

    const lanes = root.querySelectorAll('.bugdrop-board__lane');

    expect(lanes).toHaveLength(4);
    expect(
      lanes.map(lane => lane.querySelector('.bugdrop-board__lane-title')?.textContent)
    ).toEqual(['Open', 'Planned', 'Building', 'Shipped']);
    expect(
      lanes.map(lane => lane.querySelector('.bugdrop-board__lane-count')?.textContent)
    ).toEqual(['0', '0', '0', '0']);
    expect(root.querySelectorAll('.bugdrop-board__lane-empty')).toHaveLength(4);
    expect(root.querySelector('.bugdrop-board__empty')).toBeNull();
  });

  it('can collapse the composer so the board list is not pushed below a large form', () => {
    const root = render(
      state({
        loading: false,
        items: [
          {
            id: 'item_1',
            title: 'SAML role mapping',
            description: 'Admins need group-based access.',
            status: 'open',
            upvoteCount: 5,
          },
        ],
      }),
      {},
      { ...DEFAULT_COPY, submitLabel: 'Add idea' },
      { composer: 'collapsed' }
    );

    expect(root.querySelector('details')?.className).toBe('bugdrop-board__composer');
    expect(root.querySelector('summary')?.textContent).toBe('Add idea');
    expect(root.querySelector('.bugdrop-board__form')).toBeTruthy();
    expect(root.querySelector('.bugdrop-board__item')?.textContent).toContain('SAML role mapping');
  });

  it('can hide GitHub issue links and empty kanban lanes for cleaner embedded demos', () => {
    const root = render(
      state({
        loading: false,
        items: [
          {
            id: 'item_1',
            title: 'Export feedback to CSV',
            description: 'Product teams need a planning export.',
            status: 'open',
            githubIssueNumber: 42,
            githubIssueUrl: 'https://github.test/issues/42',
            upvoteCount: 1,
          },
        ],
      }),
      {},
      DEFAULT_COPY,
      { emptyLaneDisplay: 'hidden', issueLinks: 'hidden', layout: 'kanban' }
    );

    const lanes = root.querySelectorAll('.bugdrop-board__lane');

    expect(lanes).toHaveLength(1);
    expect(lanes[0].querySelector('.bugdrop-board__lane-title')?.textContent).toBe('Open');
    expect(root.querySelector('a')).toBeNull();
    expect(root.querySelector('.bugdrop-board__status')).toBeNull();
    expect(root.querySelector<HTMLButtonElement>('.bugdrop-board__upvote')?.textContent).toBe(
      'Upvote 1'
    );
  });

  it('injects conservative CSS custom-property hooks with data-color as the default accent', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    injectTheme(shadow);
    applyCustomization(host, customization({ theme: { accent: '#1f883d' } }));

    const css = shadow.querySelector('style')?.textContent ?? '';
    expect(host.style.getPropertyValue('--bugdrop-board-accent')).toBe('#1f883d');
    expect(css).toContain('var(--bugdrop-board-accent)');
    expect(css).toContain('var(--bugdrop-board-surface)');
    expect(css).toContain('var(--bugdrop-board-danger)');
    expect(css).toContain(':host([data-bugdrop-board-layout="panel"])');
    expect(css).toContain(':host([data-bugdrop-board-layout="kanban"])');
    expect(css).toContain(
      ':host([data-bugdrop-board-layout="kanban"]) .bugdrop-board {\n      --bugdrop-board-max-width: 1120px;\n      background: var(--bugdrop-board-background);'
    );
    expect(css).toContain('data-bugdrop-board-empty-lane-display="hidden"');
    expect(css).toContain('.bugdrop-board__composer-summary');
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('min-height: 30px');
    expect(css).toContain('.bugdrop-board__description');
    expect(css).toContain('background: var(--bugdrop-board-surface)');
    expect(css).toContain('.bugdrop-board__upvote[aria-pressed="true"]');
    expect(css).toContain('box-shadow: 0 0 0 2px var(--bugdrop-board-accent-soft)');
  });

  it('renders configurable copy while preserving accessible upvote labels', () => {
    const root = render(
      state({
        loading: false,
        items: [
          {
            id: 'item_1',
            title: 'Export roadmap',
            description: 'CSV export would help planning.',
            status: 'open',
            githubIssueNumber: 42,
            githubIssueUrl: 'https://github.test/issues/42',
            upvoteCount: 1,
            viewerHasUpvoted: false,
          },
        ],
      }),
      {},
      {
        ...DEFAULT_COPY,
        heading: 'Roadmap requests',
        titleLabel: 'Request',
        titlePlaceholder: 'Short request',
        descriptionLabel: 'Why it matters',
        descriptionPlaceholder: 'Add context',
        submitLabel: 'Send request',
        issuePrefix: 'GH-',
        upvoteLabel: 'Boost',
        upvotedLabel: 'Boosted',
        description: 'Vote on the ideas that should move next.',
      }
    );

    expect(root.querySelector('h2')?.textContent).toBe('Roadmap requests');
    expect(root.querySelector('.bugdrop-board__description')?.textContent).toBe(
      'Vote on the ideas that should move next.'
    );
    expect(root.querySelector('label')?.textContent).toContain('Request');
    expect(root.querySelector<HTMLInputElement>('input')?.placeholder).toBe('Short request');
    expect(root.querySelector<HTMLTextAreaElement>('textarea')?.placeholder).toBe('Add context');
    expect(root.querySelector('a')?.textContent).toBe('GH-42');
    expect(root.querySelector<HTMLButtonElement>('.bugdrop-board__upvote')?.textContent).toBe(
      'Boost 1 vote'
    );
    expect(
      root.querySelector<HTMLButtonElement>('.bugdrop-board__upvote')?.getAttribute('aria-label')
    ).toBe('Boost Export roadmap. 1 upvote.');
  });

  it('reads JSON customization from a selected config element with data-color compatibility', () => {
    const config = readCustomization(
      {
        dataset: {
          color: '#1f883d',
          configSelector: '#bugdrop-board-config',
          density: 'compact',
        },
      } as unknown as HTMLScriptElement,
      {
        querySelector: selector => {
          expect(selector).toBe('#bugdrop-board-config');
          const element = new MiniElement('script');
          element.textContent = JSON.stringify({
            layout: 'kanban',
            composer: 'collapsed',
            density: 'spacious',
            emptyLaneDisplay: 'hidden',
            issueLinks: 'hidden',
            copy: { heading: 'Ideas', submitLabel: 'Add idea' },
            theme: {
              accent: '#111111',
              radius: '2px',
              ignored: 'nope',
              danger: 'red; color: blue',
            },
          });
          return element as unknown as Element;
        },
      }
    );

    const host = document.createElement('div');
    applyCustomization(host, config);

    expect(config.copy.heading).toBe('Ideas');
    expect(config.copy.submitLabel).toBe('Add idea');
    expect(config.composer).toBe('collapsed');
    expect(config.layout).toBe('kanban');
    expect(config.emptyLaneDisplay).toBe('hidden');
    expect(config.issueLinks).toBe('hidden');
    expect(config.density).toBe('compact');
    expect(host.dataset.bugdropBoardComposer).toBe('collapsed');
    expect(host.dataset.bugdropBoardEmptyLaneDisplay).toBe('hidden');
    expect(host.dataset.bugdropBoardIssueLinks).toBe('hidden');
    expect(host.style.getPropertyValue('--bugdrop-board-accent')).toBe('#1f883d');
    expect(host.style.getPropertyValue('--bugdrop-board-radius')).toBe('2px');
    expect(host.style.getPropertyValue('--bugdrop-board-danger')).toBe('');
  });
});

function render(
  overrides: BoardState,
  handlers = {},
  copy = DEFAULT_COPY,
  options: BoardWidgetLayout | Parameters<typeof renderBoard>[4] = {}
) {
  const root = document.createElement('div');
  renderBoard(
    root,
    overrides,
    {
      onCreate: vi.fn(),
      onUpvote: vi.fn(),
      onRetry: vi.fn(),
      ...handlers,
    },
    copy,
    typeof options === 'string' ? { layout: options as BoardWidgetLayout } : options
  );
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

function customization(
  overrides: Partial<BoardWidgetCustomization> = {}
): BoardWidgetCustomization {
  return {
    composer: 'inline',
    copy: DEFAULT_COPY,
    density: 'comfortable',
    emptyLaneDisplay: 'visible',
    issueLinks: 'visible',
    layout: 'inline',
    theme: {},
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
  placeholder = '';
  rel = '';
  required = false;
  rows = 0;
  readonly dataset: Record<string, string> = {};
  readonly style = new MiniStyle();
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

class MiniStyle {
  private readonly values = new Map<string, string>();

  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }

  getPropertyValue(name: string) {
    return this.values.get(name) ?? '';
  }
}
