import type {
  BoardWidgetCopy,
  BoardWidgetCustomization,
  BoardWidgetDensity,
  BoardWidgetLayout,
  BoardWidgetTheme,
} from './types';

const DENSITIES = new Set<BoardWidgetDensity>(['compact', 'comfortable', 'spacious']);
const LAYOUTS = new Set<BoardWidgetLayout>(['inline', 'panel']);

const THEME_TOKEN_TO_CSS_PROPERTY = {
  accent: '--bugdrop-board-accent',
  accentText: '--bugdrop-board-accent-text',
  accentSoft: '--bugdrop-board-accent-soft',
  background: '--bugdrop-board-background',
  surface: '--bugdrop-board-surface',
  surfaceAlt: '--bugdrop-board-surface-alt',
  text: '--bugdrop-board-text',
  muted: '--bugdrop-board-muted',
  border: '--bugdrop-board-border',
  danger: '--bugdrop-board-danger',
  focus: '--bugdrop-board-focus',
  fontFamily: '--bugdrop-board-font-family',
  fontSize: '--bugdrop-board-font-size',
  headingSize: '--bugdrop-board-heading-size',
  lineHeight: '--bugdrop-board-line-height',
  maxWidth: '--bugdrop-board-max-width',
  radius: '--bugdrop-board-radius',
  itemRadius: '--bugdrop-board-item-radius',
  fieldRadius: '--bugdrop-board-field-radius',
  buttonRadius: '--bugdrop-board-button-radius',
  borderWidth: '--bugdrop-board-border-width',
  gap: '--bugdrop-board-gap',
  padding: '--bugdrop-board-padding',
  itemPadding: '--bugdrop-board-item-padding',
  fieldPadding: '--bugdrop-board-field-padding',
  buttonPadding: '--bugdrop-board-button-padding',
  shadow: '--bugdrop-board-shadow',
  itemShadow: '--bugdrop-board-item-shadow',
  buttonBackground: '--bugdrop-board-button-background',
  buttonText: '--bugdrop-board-button-text',
  buttonBorder: '--bugdrop-board-button-border',
  upvoteBackground: '--bugdrop-board-upvote-background',
  upvoteText: '--bugdrop-board-upvote-text',
  upvoteBorder: '--bugdrop-board-upvote-border',
  fieldBackground: '--bugdrop-board-field-background',
  fieldText: '--bugdrop-board-field-text',
} satisfies Record<keyof BoardWidgetTheme, string>;

export const DEFAULT_COPY: BoardWidgetCopy = {
  heading: 'Feedback',
  titleLabel: 'Idea title',
  titlePlaceholder: '',
  descriptionLabel: 'Context',
  descriptionPlaceholder: '',
  submitLabel: 'Submit',
  submittingLabel: 'Working...',
  loadingLabel: 'Loading feedback...',
  emptyLabel: 'No feedback yet. Share the first idea to help prioritize what comes next.',
  errorTitle: "We couldn't load feedback.",
  retryLabel: 'Retry',
  issuePrefix: 'Issue #',
  upvoteLabel: 'Upvote',
  upvotedLabel: 'Upvoted',
};

export function readCustomization(
  script: HTMLScriptElement,
  doc: Pick<Document, 'querySelector'> = document
): BoardWidgetCustomization {
  const fromJson = readJsonCustomization(script, doc);
  const density = parseDensity(script.dataset.density ?? fromJson.density);
  const layout = parseLayout(script.dataset.layout ?? fromJson.layout);
  const copy = { ...DEFAULT_COPY, ...pickStringMap(fromJson.copy, Object.keys(DEFAULT_COPY)) };
  const theme = pickStringMap(fromJson.theme, Object.keys(THEME_TOKEN_TO_CSS_PROPERTY));

  if (script.dataset.color) {
    theme.accent = script.dataset.color;
  }

  return { copy, density, layout, theme };
}

export function applyCustomization(
  host: HTMLElement,
  customization: BoardWidgetCustomization
): void {
  host.dataset.bugdropBoardLayout = customization.layout;
  host.dataset.bugdropBoardDensity = customization.density;

  for (const [token, property] of Object.entries(THEME_TOKEN_TO_CSS_PROPERTY)) {
    const value = customization.theme[token as keyof BoardWidgetTheme];
    if (typeof value === 'string' && isSafeCssValue(value)) {
      host.style.setProperty(property, value);
    }
  }
}

function readJsonCustomization(
  script: HTMLScriptElement,
  doc: Pick<Document, 'querySelector'>
): {
  copy?: unknown;
  density?: unknown;
  layout?: unknown;
  theme?: unknown;
} {
  const selector = script.dataset.configSelector?.trim();
  if (!selector) {
    return {};
  }

  const element = doc.querySelector(selector);
  if (!element) {
    throw new Error(`BugDrop Board config target not found for data-config-selector "${selector}"`);
  }

  const raw = element.textContent?.trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    throw new Error(`BugDrop Board config target contains invalid JSON: ${selector}`);
  }
}

function parseDensity(value: unknown): BoardWidgetDensity {
  return typeof value === 'string' && DENSITIES.has(value as BoardWidgetDensity)
    ? (value as BoardWidgetDensity)
    : 'comfortable';
}

function parseLayout(value: unknown): BoardWidgetLayout {
  return typeof value === 'string' && LAYOUTS.has(value as BoardWidgetLayout)
    ? (value as BoardWidgetLayout)
    : 'inline';
}

function pickStringMap<T extends string>(
  value: unknown,
  allowedKeys: string[]
): Partial<Record<T, string>> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  const allowed = new Set(allowedKeys);
  const output: Partial<Record<T, string>> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (allowed.has(key) && typeof entryValue === 'string') {
      output[key as T] = entryValue;
    }
  }
  return output;
}

function isSafeCssValue(value: string): boolean {
  return value.length <= 240 && !/[;{}<>]/.test(value);
}
