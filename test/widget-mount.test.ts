import { describe, expect, it } from 'vitest';
import { appendWidgetHost } from '../src/widget/mount';

describe('widget mount placement', () => {
  it('appends the widget host into a matching data-mount-selector target', () => {
    const document = new MiniDocument();
    const target = document.createElement('section');
    target.setAttribute('id', 'feedback-board');
    const script = document.createElement('script');
    const host = document.createElement('div');
    document.body.append(target, script);

    appendWidgetHost(host, { document, script, mountSelector: '#feedback-board' });

    expect(target.children).toEqual([host]);
    expect(document.body.children).toEqual([target, script]);
  });

  it('inserts the widget host immediately after the script tag by default', () => {
    const document = new MiniDocument();
    const before = document.createElement('main');
    const script = document.createElement('script');
    const after = document.createElement('footer');
    const host = document.createElement('div');
    document.body.append(before, script, after);

    appendWidgetHost(host, { document, script });

    expect(document.body.children).toEqual([before, script, host, after]);
  });

  it('falls back to the body when the script tag is outside body content', () => {
    const document = new MiniDocument();
    const script = document.createElement('script');
    const host = document.createElement('div');
    document.head.append(script);

    appendWidgetHost(host, { document, script });

    expect(document.head.children).toEqual([script]);
    expect(document.body.children).toEqual([host]);
  });

  it('throws a clear error when data-mount-selector does not match an element', () => {
    const document = new MiniDocument();
    const script = document.createElement('script');
    const host = document.createElement('div');
    document.body.append(script);

    expect(() =>
      appendWidgetHost(host, { document, script, mountSelector: '#missing-board' })
    ).toThrow('BugDrop Board mount target not found for data-mount-selector "#missing-board"');
  });
});

class MiniDocument {
  readonly body = new MiniElement('body');
  readonly head = new MiniElement('head');

  createElement(tagName: string) {
    return new MiniElement(tagName);
  }

  querySelector(selector: string) {
    return this.body.querySelector(selector) ?? this.head.querySelector(selector);
  }
}

class MiniElement {
  parentNode: MiniElement | null = null;
  readonly children: MiniElement[] = [];
  private readonly attributes = new Map<string, string>();

  constructor(readonly tagName: string) {}

  get nextSibling(): MiniElement | null {
    if (!this.parentNode) {
      return null;
    }
    const index = this.parentNode.children.indexOf(this);
    return index === -1 ? null : (this.parentNode.children[index + 1] ?? null);
  }

  append(...children: MiniElement[]) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  appendChild(child: MiniElement) {
    child.parentNode = this;
    this.children.push(child);
  }

  insertBefore(child: MiniElement, reference: MiniElement | null) {
    child.parentNode = this;
    if (!reference) {
      this.children.push(child);
      return;
    }
    const index = this.children.indexOf(reference);
    if (index === -1) {
      this.children.push(child);
      return;
    }
    this.children.splice(index, 0, child);
  }

  contains(candidate: MiniElement): boolean {
    return this === candidate || this.children.some(child => child.contains(candidate));
  }

  querySelector(selector: string): MiniElement | null {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child;
      }
      const nested = child.querySelector(selector);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  private matches(selector: string): boolean {
    if (selector.startsWith('#')) {
      return this.attributes.get('id') === selector.slice(1);
    }
    return this.tagName === selector;
  }
}
