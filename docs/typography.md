# Typography and interaction scale

## Standards used

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA: text resizes to 200%,
  contrast is at least 4.5:1 for normal text, and pointer targets are at least
  24×24 CSS pixels.
- [USWDS typography](https://designsystem.digital.gov/components/typography/):
  body text at least 16px, line-height 1.5 for running text, and 45–90
  characters per line.
- [Material Design 3 type scale](https://m3.material.io/styles/typography/type-scale-tokens):
  body large is 16px and label small is 11px. Web UI uses 12px as the floor for
  metadata because browser rendering and zoom differ from native apps.
- [Apple HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography):
  native minimum text is 11pt; body text is larger. The web equivalent is a
  16px base with 12px compact labels.
- [iOS Safari form zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/):
  form controls below 16px trigger auto-zoom, so mobile inputs use 16px.

## Scale

| Role           | Tailwind          | Effective size | Line height | Use                                |
| -------------- | ----------------- | -------------- | ----------- | ---------------------------------- |
| Display clock  | `text-[2.125rem]` | 34px           | 1           | Header clock                       |
| Display number | `text-2xl`        | 24px           | 1.1         | Duration                           |
| Body large     | `text-base`       | 16px           | 1.5         | Controls, labels, inputs, row data |
| Body           | `text-sm`         | 14px           | 1.5         | Dialog copy, dense values          |
| Label / meta   | `text-xs`         | 12px           | 1.33        | Dates, helpers; 14–16px on desktop |

Rules:

- No user-facing text below 12px. Arbitrary `text-[10px]` and `text-[11px]`
  classes are not used.
- Menus, dialogs, settings, and form controls share the 16px base size rather
  than defining their own compact scale.
- Every size is a Tailwind `rem` token so browser zoom and text settings work.
- Clock and duration numbers use `tabular-nums`; times are not letter-spaced.
- Uppercase text is limited to short labels with `tracking-wide`.
- Running text keeps a 1.5 line-height. Single-line labels and numeric displays
  may use tighter leading.
- Long-form copy stays within the dialog width; no fixed pixel line length.
- All buttons, labels, legends, inputs, selects, and textareas use the
  16px control size. Inputs and selects have a 44px minimum height at every
  viewport; the global rules live in `src/app.css`.
- Primary pointer targets are at least 32px; WCAG AA requires 24px. The board
  menu trigger, header actions, day controls, and range actions meet this.
- Status, warning, danger, and accent text use semantic color tokens from
  `src/app.css`; contrast is tested with axe in both themes.

## Tests

`e2e/world-clock.spec.ts` checks:

- visible text is at least 12px;
- ruler hours, row hours, and day markers are at least 12px;
- mobile form controls are at least 16px and 44px tall;
- header, day, and zone-menu targets are at least 24×24;
- axe scans in light, dark, explicit-dark, and OS/app mismatch states.

## Palette

The light theme follows Material Blue:

| Token        | Value                 | Use                           |
| ------------ | --------------------- | ----------------------------- |
| Page         | `#f5f5f5`             | Outside the app surface       |
| Surface      | `#ffffff`             | Header, board, controls       |
| Text         | `#212121`             | Primary labels and numbers    |
| Muted        | `#757575`             | Zone metadata and helpers     |
| Accent       | `#1976d2`             | Primary actions and selection |
| Focus        | `#26a69a`             | Focus line and range handles  |
| Day band     | `#fafdff`             | Daylight hours                |
| Night band   | `#bbdefb`             | Night hours                   |
| Work marking | `#b45309` / `#fbbf24` | Work-hours strip and tint     |

Status text uses the semantic warning and danger tokens. Dark mode keeps the
same hierarchy with a dark surface, lighter blue accents, and yellow work-hour
markings.
