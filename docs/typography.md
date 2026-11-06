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

| Role           | Tailwind    | Effective size | Line height | Use                                   |
| -------------- | ----------- | -------------- | ----------- | ------------------------------------- |
| Display clock  | `text-3xl`  | 30px           | 1           | Header clock                          |
| Display number | `text-2xl`  | 24px           | 1.1         | Duration                              |
| Section value  | `text-lg`   | 18px           | 1.1         | Desktop row time                      |
| Body large     | `text-base` | 16px           | 1.5         | Row time, form controls on mobile     |
| Body           | `text-sm`   | 14px           | 1.5         | Dialog copy, dense values             |
| Label / meta   | `text-xs`   | 12px           | 1.33        | Hour labels, dates, metadata, helpers |

Rules:

- No user-facing text below 12px. Arbitrary `text-[10px]` and `text-[11px]`
  classes are not used.
- Every size is a Tailwind `rem` token so browser zoom and text settings work.
- Clock and duration numbers use `tabular-nums`; times are not letter-spaced.
- Uppercase text is limited to short labels with `tracking-wide`.
- Running text keeps a 1.5 line-height. Single-line labels and numeric displays
  may use tighter leading.
- Long-form copy stays within the dialog width; no fixed pixel line length.
- Inputs and selects use 16px and a 44px minimum height below 640px.
- Primary pointer targets are at least 32px; WCAG AA requires 24px. The board
  menu trigger, header actions, day controls, and range actions meet this.
- Status, warning, danger, and accent text use semantic color tokens from
  `src/app.css`; contrast is tested with axe in both themes.

## Tests

`e2e/world-clock.spec.ts` checks:

- visible text is at least 12px;
- ruler hours and day markers are at least 12px;
- mobile form controls are at least 16px and 44px tall;
- header, day, and zone-menu targets are at least 24×24;
- axe scans in light, dark, explicit-dark, and OS/app mismatch states.
