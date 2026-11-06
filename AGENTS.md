# AGENTS.md

World Clock is a static, local-first world clock board. Read
[`docs/architecture.md`](docs/architecture.md) before changing time math, state,
or the board.

## Stack

- Svelte 5 runes, Vite 8, TypeScript 5.9 strict.
- Tailwind CSS 4, native dialog/listbox/select controls.
- Temporal via native support, with a loaded-on-demand polyfill for Safari.
- Vitest + Testing Library, Playwright, ESLint, Prettier, pnpm, Node 26.

## Commands

```bash
pnpm dev          # local app
pnpm test         # unit/component tests
pnpm test:e2e     # Playwright
pnpm verify       # format, lint, typecheck, tests, build
pnpm verify && pnpm test:e2e --project=chromium
```

## Structure

```text
src/
  App.svelte          store wiring and layout
  lib/
    actions/          pointer drag, shortcuts, modal behavior
    components/       prop-driven board and dialogs
    data/             search-only city aliases
    settings/         schema, storage, mutations, theme
    state/            clock, settings, board runes
    time/             pure temporal math and formatting
    tests/            setup
e2e/                  browser flows
docs/architecture.md  current design
```

## Non-negotiable rules

- Keep time math in `src/lib/time/`. Functions take explicit instants and zones.
- Only `clock.svelte.ts` reads `Date.now()`. `searchZones` may read it for
  display-only offsets.
- Keep the focus inside the visible home-zone day. Derive `viewDate`; never add
  independent view-date state.
- Clear the range when a focus action sets a new focus. Keep the drag anchor
  as focus during a range drag. Snap range endpoints to `stepMinutes`.
- Use the continuous instant axis. Do not reintroduce fixed 24-cell rows.
- Treat DST gaps and overlaps explicitly. A gap resolves to the first valid
  instant; an overlap resolves to the earlier occurrence.
- Availability uses local working windows and supports windows that cross
  midnight.
- Only `App.svelte` reads stores. Components receive props and callbacks.
- Prefer native browser controls. Add a dependency only when the built-in
  option cannot meet the accessibility or correctness bar.
- Do not use `any`. Use type-only imports where possible.
- Keep comments single-line, current, and only for non-obvious decisions.
- Update `README.md`, this file, or `docs/architecture.md` when behavior,
  commands, structure, or stack changes.

## Persistence

- Key: `world-clock`; schema version in the payload.
- Validate and repair through `settings/schema.ts`; never trust stored JSON.
- Storage failures must not block startup. Keep the app usable in memory.
- Import overwrites only after confirmation. Export includes `version` and
  `exportedAt`.
- Do not add a backend or sync without an explicit product decision.
- Changing seeded zones requires a migration limited to untouched legacy
  defaults; never remove zones from a customized list.

## UI and accessibility

- Ruler: tap sets focus; drag sets a range; handles move endpoints. Board rows
  pan horizontally on touch.
- Native dialogs use `use:modal`; keep Escape, focus restore, and labels intact.
- Zone menus use a manual popover with fixed positioning. Keep them out of row
  stacking contexts so the board scroller cannot clip or cover them.
- Tailwind `dark:` variants follow `data-theme='dark'`, not the OS media query.
- Use semantic color tokens for status text: `text-status-day`, `text-warning`,
  `text-danger`, and `text-accent-text`. Do not use raw palette utilities for
  text that sits on themed surfaces.
- Work-hours strip uses the amber `work-line` token; work cells use the
  white `band-work` token. Do not reuse the blue night palette for work markings.
- The home row uses the warm `home-row`/`home-row-header` tokens and
  `home-accent` edge, including its hour cells; never use blue for home emphasis.
- Keep focus/now lines, hour boundary ticks, and range fills aligned across
  the ruler and rows. Hour labels are centered in their cells; boundary ticks
  stay at the cell starts. Ticks must paint above the white work-cell overlay
  so they stay visible in daytime working hours.
- Keep the focus line a 2px dashed teal stroke with a soft light halo so it
  stays visible over white work cells, blue bands, and the warm home row.
- The visible window is the home-zone day shifted in 6-hour wall-clock steps,
  limited to ±18 hours. Day selection, Now, and home changes reset it.
- Draw the focus marker only when its date is today and it lies inside the
  visible window. Draw the now marker only when now lies inside the window.
  Off-window range visuals stay hidden while the selection and summary remain.
- Base bands are day 08:00–18:00, twilight 06:00–08:00 and 18:00–22:00, night 22:00–06:00.
- Click-drag a zone row to set a range; the duration bar above the board and row headers show the result.
- Capture the visible axis at pointer-down for clicks and drags. A focus change
  may reset the window/day, so do not remap pointer positions against the new axis.
- The focus hour is the resting hour highlight; hover moves it and pointer leave,
  focus loss, or an outside pointer-down restores it. This is visual only and
  must not set focus, change the range, or persist.
- Hide the relative-time badge when it would only read "Now", and hide the
  relative-offset chip when it is zero. The DST badge appears only while the
  zone is observing daylight saving time.
- The relative badge is hidden below `sm`; at `sm` and above reserve its
  footprint and announce meaningful relative values through a separate polite
  live region. For long ranges show the calendar breakdown (`y`/`mo`/`d`/
  `h`/`m`), the total duration, and the source “now” date and time in the home
  zone. Omit year/month when they match the current year/month.
- The focus readout date omits the year unless the target year differs from the
  current home-zone year. Show that year inline; at 1440–1535px the centered
  day strip nudges right just enough to clear the wider readout.
- The home row keeps a subtle tint and left accent. Hovering a board cell
  keeps its whole zone row and hour column fully lit, adds restrained 1px
  accent outlines, and dims the rest with `crosshair-dim`; never dim touch
  interactions.
- Recover from a lost pointerup: cancel board and handle drags on window blur,
  hidden visibility, Escape, lost pointer capture, or a move with no pressed
  buttons, then resume hover tracking.
- The range hint and selected-range bar share a fixed 48px slot above the board.
  Selecting a range must not move the board or change desktop/mobile row height.
- Hour labels in the active column are semibold in both the ruler and rows.
- Display toggles must change the rendered row, not only stored state.
- Keep keyboard shortcuts working outside inputs and open dialogs.
  Left/Right shift the visible window by 6 hours; Alt+Left/Right nudge focus
  by an hour, Shift+Left/Right extend the range, and the focus slider uses
  Left/Right for selection-step nudging.
- Escape closes overlays first, then clears the range, then returns focus to Now
  and the initial board state. Pointer hover tracking is global to the board.
- Test with axe; do not introduce color-only status.
- Keep every user-facing font size at 12px or larger; use the scale in
  [`docs/typography.md`](docs/typography.md). Do not add arbitrary px sizes.
- UI controls use a 16px base via the global rules in `src/app.css`. Do not
  shrink buttons, labels, inputs, or menu items with `text-xs`.
- The header theme button toggles between explicit light and dark modes.
  System mode remains available in Settings. Duration remains reachable from
  the selected-range Details action.
- The day picker lives in the header on wide screens and wraps below the
  controls on narrow screens. Keep it centered with `mx-auto`/absolute
  positioning; do not restore a separate full-width strip. The calendar
  trigger sits outside the scrollable seven-day row and selects through the
  same day-navigation path as the date buttons. Its jump field accepts
  `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` (separators optional for compact digits).
  Below 1440px the day strip gets its own centered row. From 1440px upward it
  sits inline with the header actions; between 1440 and 1599px it gets a small
  right offset (larger for 12-hour or cross-year readouts) to clear the wider
  focus details. At 1600px and above it is fully centered.
- Weekend dates in the seven-day strip use a blue-gray underline; today uses
  the dark-yellow home accent underline. Do not use background tints that
  could be mistaken for the selected-date state.
- Hide `GMT…`/`UTC…` abbreviations when the UTC offset is already visible.
  Format zero-minute offsets as `UTC+3`/`UTC−8`; zero is `UTC`.
- Do not repeat metadata that equals the zone label. The UTC zone omits its
  redundant UTC offset and IANA lines.
- Mobile inputs and selects are 16px and at least 44px tall to avoid iOS zoom.
- Keep primary pointer targets at least 24×24; aim for 32px or more.
- Give every clickable control a visible hover state. Secondary controls use
  `hover:bg-surface`; `surface-raised` is invisible on the white header.
  Primary accent buttons use `hover:bg-accent/90`. Keep color transitions
  consistent.
- Actionable buttons, links, menu items, and option rows use a hand cursor;
  disabled controls keep the default cursor. Zone-menu items use
  `hover:bg-accent/10`; Remove uses `hover:bg-danger/10`.
- Respect `prefers-reduced-motion`.

## Testing

- Write the failing test first. Watch it fail, then implement.
- Add time tests for DST gaps, overlaps, fractional offsets, and date rollover.
- Add a store test for every state invariant. Add a component test for every
  display or interaction change.
- Run `pnpm verify` before pushing. The pre-push hook also runs Qlty and
  CodeRabbit when installed.
- Run the Chromium E2E suite for layout, touch, and axe changes.

## Git, CI, and deploy

- Never push automatically. Push only after an explicit request in the current
  turn; a previous push is not standing permission.
- Use feature branches. Do not push directly to `main`.
- `pnpm install` enables `.githooks`; bypass once with `git push --no-verify`.
- CodeRabbit reviews committed changes against `origin/main` or `main` at gate
  `major`. Qlty runs its configured plugins. Missing tools are skipped.
- CI runs format check, lint, type check, tests, build, and Chromium E2E.
- Deployment publishes `dist/` to GitHub Pages from `main`.
- `origin` is `Alex-Just/world-clock`; `main` tracks it. Push only when the owner asks.
- Pages builds from GitHub Actions. Live URL: [alex-just.github.io/world-clock](https://alex-just.github.io/world-clock/).
