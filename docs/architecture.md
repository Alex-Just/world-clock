# Architecture

World Clock is a static, client-only Svelte app. One focus instant drives every
time-zone row; a normalized range supplies duration and availability. Settings
persist in `localStorage`. There is no server, account, or sync.

## Layout

```text
App.svelte
├─ Header (brand, focus clock, inline day picker, actions)
│  └─ DayStrip (seven-day window)
├─ Board
│  ├─ Ruler (hour scale, work strip, focus/now lines, range handles)
│  └─ ZoneRow[] (local times, bands, labels, day/DST markers)
├─ RangeBar (when a range is selected)
├─ dialogs (add zone, set time, duration, settings, rename, shortcuts)
└─ Toast
```

`App.svelte` is the only component that reads stores. Other components receive
props and emit callbacks, which keeps them testable with fixtures.

## Time model

All instants are epoch milliseconds. IANA zone IDs are strings. Temporal handles
calendar math, offsets, DST gaps/overlaps, and zoned wall times.

- `src/lib/time/axis.ts` builds the home-zone day. A normal day is 24 hours; DST
  days are 23 or 25. The axis is continuous elapsed time, not fixed cells.
- `src/lib/time/rows.ts` builds each row from the axis: day 08:00–18:00,
  twilight 06:00–08:00 and 18:00–22:00, night 22:00–06:00, plus the working
  overlay, local hour labels, day rollover, and DST markers.
- `src/lib/time/range.ts` normalizes ranges, measures elapsed and wall-clock
  duration, and evaluates availability.
- `src/lib/time/format.ts` formats times, dates, offsets, durations, and relative
  deltas.
- `src/lib/time/zones.ts` lists zones, derives labels, resolves abbreviations,
  offsets, DST status, and search.

Invariants:

- The focus instant is always inside the visible home-zone day. `viewDate` is
  derived from the focus; it is not separate state.
- A new focus clears the range. Range endpoints snap to the configured step.
  The pointer-down anchor stays the focus while dragging.
- A missing wall time resolves to the first valid instant; a repeated wall time
  resolves to the earlier occurrence.
- Availability uses a local working window that may cross midnight.
- The DST badge means the current offset is above the year's minimum offset.

## State

Three runes modules:

- `clock.svelte.ts` updates `nowMs` once per second and on visibility changes.
- `settings.svelte.ts` holds the validated, persisted settings document.
- `board.svelte.ts` holds ephemeral focus, follow-now, range, and derived axis.

Only the clock store reads `Date.now()`. `searchZones` also reads it for
display-only offsets; callers can inject an instant.

First run seeds San Francisco, Denver, New York, UTC, Madrid, Moscow, and
Delhi. Untouched legacy default lists drop London and Chicago on load;
customized lists are preserved. The browser zone is home; if it is not in that list, it is
prepended.

## Persistence

Key: `world-clock`. One versioned document holds settings and ordered zones.
`settings/schema.ts` validates and repairs every field. `settings/storage.ts`
loads, saves, exports, imports, and syncs across tabs. Storage failures do not
block startup; the UI shows a persistence warning.

Import replaces the current document only after confirmation. Export includes
`version` and `exportedAt`.

## UI and accessibility

- The ruler is the scrub surface. Tap sets focus; drag sets a range; handles
  move endpoints. Board rows also drag to create a range. Touch rows pan.
- Native `<dialog>` elements use the `modal` action for `showModal`, focus
  restore, and Escape. Set Time traps focus manually.
- Zone menus open in a manual popover, positioned from the trigger rectangle
  and flipped or clamped to stay inside the viewport.
- Focus/now lines and range fills render in the ruler and every row. A hover
  overlay follows the cursor without changing selection.
- On narrow screens the row header wraps the time block below the zone name;
  timeline labels stay legible instead of shrinking.
- Display settings control abbreviation, exact offset, DST badge, IANA name,
  date labels, and work bands.
- Keyboard shortcuts are global except in text fields or open dialogs.
- Tailwind `dark:` variants are bound to `data-theme='dark'` so the explicit
  theme works when the OS theme differs. Status, warning, danger, and accent
  text use semantic tokens defined in `src/app.css`.
- Typography, input sizing, and target sizes follow
  [`docs/typography.md`](typography.md).
- Colors meet WCAG AA contrast; status is never color-only; reduced motion is
  respected.

## Testing

- Vitest covers pure time math, stores, settings, and component behavior.
- Playwright covers desktop flows, mobile range selection, axe scans, and the
  WebKit Temporal polyfill path.
- Time tests include New York DST, Dublin, Lord Howe, Kathmandu, Chatham, and
  Santiago.

## Build and deploy

Vite emits static files with a relative base. CI runs format check, lint, type
check, unit/component tests, build, and Chromium E2E. The deploy workflow
publishes `dist/` to GitHub Pages from `main`.
