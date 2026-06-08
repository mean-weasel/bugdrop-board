export function injectTheme(root: ShadowRoot): void {
  const style = document.createElement('style');
  style.textContent = [
    themeDefaultsCss(),
    shellCss(),
    formCss(),
    itemCss(),
    stateCss(),
    upvoteCss(),
  ].join('\n');
  root.append(style);
}

function themeDefaultsCss(): string {
  return `
    :host {
      --bugdrop-board-accent: #2563eb;
      --bugdrop-board-accent-text: #ffffff;
      --bugdrop-board-accent-soft: #eff6ff;
      --bugdrop-board-background: transparent;
      --bugdrop-board-danger: #b42318;
      --bugdrop-board-muted: #57606a;
      --bugdrop-board-surface: #ffffff;
      --bugdrop-board-surface-alt: #f6f8fa;
      --bugdrop-board-text: #172026;
      --bugdrop-board-border: #d0d7de;
      --bugdrop-board-focus: #0969da;
      --bugdrop-board-font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --bugdrop-board-font-size: 14px;
      --bugdrop-board-heading-size: 20px;
      --bugdrop-board-line-height: 1.4;
      --bugdrop-board-max-width: 760px;
      --bugdrop-board-radius: 8px;
      --bugdrop-board-item-radius: var(--bugdrop-board-radius);
      --bugdrop-board-field-radius: 6px;
      --bugdrop-board-button-radius: 6px;
      --bugdrop-board-border-width: 1px;
      --bugdrop-board-gap: 10px;
      --bugdrop-board-padding: 0;
      --bugdrop-board-item-padding: 12px;
      --bugdrop-board-field-padding: 8px 10px;
      --bugdrop-board-button-padding: 8px 10px;
      --bugdrop-board-shadow: none;
      --bugdrop-board-item-shadow: none;
      --bugdrop-board-button-background: var(--bugdrop-board-accent);
      --bugdrop-board-button-text: var(--bugdrop-board-accent-text);
      --bugdrop-board-button-border: transparent;
      --bugdrop-board-upvote-background: var(--bugdrop-board-accent);
      --bugdrop-board-upvote-text: var(--bugdrop-board-accent-text);
      --bugdrop-board-upvote-border: transparent;
      --bugdrop-board-field-background: var(--bugdrop-board-surface);
      --bugdrop-board-field-text: var(--bugdrop-board-text);
      color-scheme: light;
    }
    :host([data-bugdrop-board-density="compact"]) {
      --bugdrop-board-font-size: 13px; --bugdrop-board-heading-size: 18px;
      --bugdrop-board-gap: 8px; --bugdrop-board-item-padding: 9px;
      --bugdrop-board-field-padding: 6px 8px; --bugdrop-board-button-padding: 6px 8px;
    }
    :host([data-bugdrop-board-density="spacious"]) {
      --bugdrop-board-font-size: 15px; --bugdrop-board-heading-size: 24px;
      --bugdrop-board-gap: 14px; --bugdrop-board-item-padding: 16px;
      --bugdrop-board-field-padding: 10px 12px; --bugdrop-board-button-padding: 10px 14px;
    }
  `;
}

function shellCss(): string {
  return `
    .bugdrop-board {
      background: var(--bugdrop-board-background);
      border-radius: var(--bugdrop-board-radius);
      box-shadow: var(--bugdrop-board-shadow);
      color: var(--bugdrop-board-text);
      font-family: var(--bugdrop-board-font-family);
      font-size: var(--bugdrop-board-font-size);
      line-height: var(--bugdrop-board-line-height);
      max-width: var(--bugdrop-board-max-width);
      padding: var(--bugdrop-board-padding);
    }
    :host([data-bugdrop-board-layout="panel"]) .bugdrop-board {
      background: var(--bugdrop-board-surface);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      padding: var(--bugdrop-board-item-padding);
    }
    :host([data-bugdrop-board-layout="kanban"]) .bugdrop-board {
      --bugdrop-board-max-width: 1120px;
      background: var(--bugdrop-board-surface);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      padding: var(--bugdrop-board-item-padding);
    }
    .bugdrop-board__header h2 {
      font-size: var(--bugdrop-board-heading-size);
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 6px;
    }
    .bugdrop-board__description {
      color: var(--bugdrop-board-muted); font-size: 14px; line-height: 1.45;
      margin: 0 0 14px;
    }
    .bugdrop-board__list {
      display: grid;
      gap: var(--bugdrop-board-gap);
    }
    .bugdrop-board__kanban {
      align-items: start;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
      overflow-x: auto;
    }
    :host([data-bugdrop-board-empty-lane-display="hidden"]) .bugdrop-board__kanban {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .bugdrop-board__lane {
      background: var(--bugdrop-board-surface-alt);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      border-radius: var(--bugdrop-board-item-radius);
      display: grid;
      gap: var(--bugdrop-board-gap);
      min-width: 180px;
      padding: var(--bugdrop-board-item-padding);
    }
    .bugdrop-board__lane--compact-empty {
      align-content: start; min-height: 0;
    }
    .bugdrop-board__lane-header {
      align-items: center; border-bottom: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      display: flex;
      justify-content: space-between;
      padding: 0 2px 9px;
    }
    .bugdrop-board__lane-title {
      font-size: 14px; font-weight: 750;
      margin: 0;
    }
    .bugdrop-board__lane-count {
      background: var(--bugdrop-board-surface);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      border-radius: 999px; color: var(--bugdrop-board-muted); font-size: 12px;
      font-weight: 750; min-width: 24px; padding: 2px 7px; text-align: center;
    }
  `;
}

function formCss(): string {
  return `
    .bugdrop-board__form {
      display: grid; gap: var(--bugdrop-board-gap);
      margin-bottom: 16px;
    }
    .bugdrop-board__composer {
      margin-bottom: 16px;
    }
    .bugdrop-board__composer-summary {
      background: var(--bugdrop-board-button-background);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-button-border);
      border-radius: var(--bugdrop-board-button-radius);
      color: var(--bugdrop-board-button-text); cursor: pointer; display: inline-flex;
      font-weight: 700; list-style: none; min-height: 36px;
      padding: var(--bugdrop-board-button-padding);
    }
    .bugdrop-board__composer-summary::-webkit-details-marker {
      display: none;
    }
    .bugdrop-board__composer[open] .bugdrop-board__composer-summary {
      margin-bottom: var(--bugdrop-board-gap);
    }
    .bugdrop-board__form label {
      display: grid; gap: 5px; font-size: 13px; font-weight: 600;
    }
    .bugdrop-board__form input,
    .bugdrop-board__form textarea {
      background: var(--bugdrop-board-field-background);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      border-radius: var(--bugdrop-board-field-radius);
      box-sizing: border-box; color: var(--bugdrop-board-field-text); font: inherit;
      padding: var(--bugdrop-board-field-padding);
      width: 100%;
    }
    .bugdrop-board__form input::placeholder,
    .bugdrop-board__form textarea::placeholder {
      color: var(--bugdrop-board-muted);
      opacity: 0.78;
    }
    .bugdrop-board__form button,
    .bugdrop-board__upvote,
    .bugdrop-board__retry {
      background: var(--bugdrop-board-button-background);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-button-border);
      border-radius: var(--bugdrop-board-button-radius);
      color: var(--bugdrop-board-button-text); cursor: pointer; font: inherit;
      font-weight: 700; min-height: 36px;
      padding: var(--bugdrop-board-button-padding);
    }
    .bugdrop-board__form button:disabled {
      cursor: wait;
      opacity: 0.72;
    }
  `;
}

function itemCss(): string {
  return `
    .bugdrop-board__item {
      align-items: start;
      background: var(--bugdrop-board-surface);
      border: var(--bugdrop-board-border-width) solid var(--bugdrop-board-border);
      border-radius: var(--bugdrop-board-item-radius);
      box-shadow: var(--bugdrop-board-item-shadow); display: grid; gap: 12px;
      grid-template-columns: auto 1fr;
      padding: var(--bugdrop-board-item-padding);
    }
    :host([data-bugdrop-board-layout="panel"]) .bugdrop-board__item {
      background: var(--bugdrop-board-surface-alt);
    }
    :host([data-bugdrop-board-layout="kanban"]) .bugdrop-board__item {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    :host([data-bugdrop-board-layout="kanban"]) .bugdrop-board__item-content {
      min-width: 0; order: 1;
    }
    :host([data-bugdrop-board-layout="kanban"]) .bugdrop-board__upvote {
      align-self: start; justify-self: end; order: 2;
    }
    .bugdrop-board__item h3 {
      font-size: 16px; line-height: 1.25;
      margin: 0 0 6px;
    }
    .bugdrop-board__item p {
      font-size: 14px; line-height: 1.4;
      margin: 8px 0 0;
      overflow-wrap: anywhere;
    }
    :host([data-bugdrop-board-layout="kanban"]) .bugdrop-board__item p {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    .bugdrop-board__meta {
      align-items: center; display: flex; flex-wrap: wrap;
      gap: 8px;
    }
    .bugdrop-board__meta a,
    .bugdrop-board__status {
      color: var(--bugdrop-board-muted); font-size: 12px;
    }
    .bugdrop-board__status {
      text-transform: uppercase;
    }
  `;
}

function stateCss(): string {
  return `
    .bugdrop-board__form button:focus-visible,
    .bugdrop-board__composer-summary:focus-visible,
    .bugdrop-board__upvote:focus-visible,
    .bugdrop-board__retry:focus-visible,
    .bugdrop-board__form input:focus-visible,
    .bugdrop-board__form textarea:focus-visible,
    .bugdrop-board__meta a:focus-visible {
      outline: 2px solid var(--bugdrop-board-focus); outline-offset: 2px;
    }
    .bugdrop-board__empty,
    .bugdrop-board__loading,
    .bugdrop-board__error {
      font-size: 14px;
      margin: 0;
    }
    .bugdrop-board__error {
      align-items: start; color: var(--bugdrop-board-danger); display: grid; gap: 6px;
      margin-bottom: 12px;
    }
    .bugdrop-board__error-title {
      font-weight: 700;
    }
    .bugdrop-board__retry {
      justify-self: start;
    }
    .bugdrop-board__lane-empty {
      color: var(--bugdrop-board-muted); font-size: 13px; margin: 0;
    }
  `;
}

function upvoteCss(): string {
  return `
    .bugdrop-board__upvote {
      background: var(--bugdrop-board-upvote-background);
      border-color: var(--bugdrop-board-upvote-border); color: var(--bugdrop-board-upvote-text);
      white-space: nowrap;
    }
    .bugdrop-board__upvote[aria-pressed="true"] {
      background: var(--bugdrop-board-accent-soft); border-color: var(--bugdrop-board-accent);
      color: var(--bugdrop-board-accent);
    }
    :host([data-bugdrop-board-layout="kanban"]) .bugdrop-board__upvote {
      border-radius: 999px; font-size: 12px; min-height: 30px; padding: 5px 9px;
    }
  `;
}
