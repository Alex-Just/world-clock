# Architecture

World Clock is a static, client-only Svelte app. One focus instant drives every
time-zone row; a normalized range supplies duration and availability. Settings
persist in `localStorage`. There is no server, account, or sync.

## Layout

```text
App.svelte
├─ Header (brand, focus clock, inline day picker, actions)
│  └─ DayStrip (seven-day window) + DatePicker (month calendar)
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

- `src/lib/time/axis.ts` builds the visible home-zone window at a 0–18 hour
  wall-clock offset, moved in 6-hour steps. A normal window is 24 hours; DST
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

- The visible window is the home-zone day shifted in 6-hour wall-clock steps,
  limited to ±18 hours. `viewDate` is derived from the focus and remains the
  anchor day; the window may extend into adjacent days.
- Day selection, Today/Now, and changing the home zone reset the window offset
  to zero. Moving focus or a range endpoint outside the window also resets it.
- Focus and now markers render only while their instants are inside the
  visible window. Range fills, outlines, and handles hide when the range is
  entirely outside it; the selection and summary stay intact.
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
- `board.svelte.ts` holds ephemeral focus, follow-now, range, window offset,
  and the derived axis.

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
- The hint and selected-range bar share a fixed 48px slot above the board, so
  selecting a range does not reflow the board. Mobile row metrics stay stable.
- Hour labels are centered in their hour cells; a tiny tick marks each
  boundary in the ruler and every row. Row ticks paint above the white
  work-cell overlay so they remain visible during working hours.
- Focus/now lines and range fills render in the ruler and every row. The focus
  line is a 2px dashed teal stroke with a soft light halo so it reads over
  white work cells, blue bands, and the warm home row. It is hidden when the
  viewed day does not contain now; the header clock and focused-hour highlight
  retain focus context. Range fills and handles still render on any day. A
  hover overlay follows the cursor without changing selection, keeping the
  hovered zone row and hour column fully lit while the rest of the board uses
  the theme-aware `crosshair-dim` wash. Pointer state clears on Escape,
  window blur, hidden visibility, lost capture, or a move with no pressed
  buttons so hover can recover from a missed pointerup.
- On narrow screens the row header wraps the time block below the zone name;
  timeline labels stay legible instead of shrinking.
- Display settings control abbreviation, exact offset, DST badge, IANA name,
  date labels, and work bands. Offset-style abbreviations are suppressed when
  the exact UTC offset is shown; zero-minute offsets render as `UTC+3`. Metadata
  that duplicates the zone label is omitted, and zero relative offsets are
  hidden. DST badges render only while DST is active.
- Keyboard shortcuts are global except in text fields or open dialogs.
  Escape closes overlays, clears an active range, then returns the board to Now.
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
