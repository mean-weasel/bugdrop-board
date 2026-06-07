# Custom UX Examples

These examples are marketing-ready proof that BugDrop Board can adapt to several host-app
aesthetics without forking the widget. Each screenshot is captured from the real embedded widget,
using the same JSON customization contract documented in the README.

The examples are deliberately varied:

- compact SaaS admin;
- creator/community space;
- developer portal;
- high-contrast accessibility board;
- dark launch-planning room.

Regenerate the screenshots after widget styling changes:

```sh
npm run capture:marketing-examples
```

## Compact SaaS

![Compact SaaS BugDrop Board](assets/compact-saas.png)

```json
{
  "layout": "panel",
  "density": "compact",
  "copy": {
    "heading": "Roadmap queue",
    "submitLabel": "Add request",
    "upvoteLabel": "Prioritize",
    "upvotedLabel": "Prioritized"
  },
  "theme": {
    "accent": "#0f766e",
    "accentSoft": "#ccfbf1",
    "border": "#cbd5e1",
    "buttonRadius": "4px",
    "fieldRadius": "4px",
    "fontSize": "13px",
    "itemRadius": "4px",
    "maxWidth": "640px"
  }
}
```

## Creator Community

![Creator community BugDrop Board](assets/creator-community.png)

```json
{
  "layout": "panel",
  "density": "comfortable",
  "copy": {
    "heading": "Community ideas",
    "submitLabel": "Share idea",
    "issuePrefix": "Tracked as #",
    "upvoteLabel": "Cheer",
    "upvotedLabel": "Cheered"
  },
  "theme": {
    "accent": "#9f1239",
    "accentSoft": "#ffe4e6",
    "background": "#fffaf5",
    "buttonRadius": "999px",
    "fontFamily": "Georgia, \"Times New Roman\", serif",
    "itemRadius": "16px",
    "shadow": "0 18px 50px rgba(79, 46, 19, 0.12)"
  }
}
```

## Developer Portal

![Developer portal BugDrop Board](assets/developer-portal.png)

```json
{
  "layout": "inline",
  "density": "compact",
  "copy": {
    "heading": "API feedback",
    "submitLabel": "Send feedback",
    "issuePrefix": "Spec #",
    "upvoteLabel": "Ship",
    "upvotedLabel": "Queued"
  },
  "theme": {
    "accent": "#2563eb",
    "accentSoft": "#dbeafe",
    "background": "transparent",
    "border": "#bfdbfe",
    "fontFamily": "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "fontSize": "13px",
    "itemRadius": "6px",
    "maxWidth": "700px",
    "surfaceAlt": "#eff6ff"
  }
}
```

## High Contrast

![High contrast BugDrop Board](assets/high-contrast.png)

```json
{
  "layout": "panel",
  "density": "spacious",
  "copy": {
    "heading": "Accessibility requests",
    "submitLabel": "Submit access request",
    "retryLabel": "Try loading again",
    "upvoteLabel": "Support",
    "upvotedLabel": "Supported"
  },
  "theme": {
    "accent": "#ffd400",
    "accentText": "#000000",
    "background": "#000000",
    "border": "#ffffff",
    "borderWidth": "2px",
    "fieldBackground": "#000000",
    "fieldText": "#ffffff",
    "focus": "#00ffff",
    "surface": "#000000",
    "text": "#ffffff"
  }
}
```

## Launch Dark

![Launch dark BugDrop Board](assets/launch-dark.png)

```json
{
  "layout": "panel",
  "density": "comfortable",
  "copy": {
    "heading": "Launch bets",
    "submitLabel": "Add bet",
    "issuePrefix": "Experiment #",
    "upvoteLabel": "Back",
    "upvotedLabel": "Backed"
  },
  "theme": {
    "accent": "#a3e635",
    "accentSoft": "#1a2e05",
    "accentText": "#111827",
    "background": "#09090b",
    "border": "#3f3f46",
    "fieldBackground": "#18181b",
    "fieldText": "#f4f4f5",
    "itemShadow": "0 18px 45px rgba(0, 0, 0, 0.32)",
    "surface": "#18181b",
    "surfaceAlt": "#27272a",
    "text": "#f4f4f5"
  }
}
```

## Claim Boundary

These examples prove configurable breadth across common visual directions. They do not claim
pixel-perfect adaptation to every possible app shell. A host that needs full DOM-level control should
treat that as a future customization requirement rather than a closed-beta guarantee.
