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
- Keep focus/now lines and range fills aligned across the ruler and rows.
- Base bands are day 08:00–18:00, twilight 06:00–08:00 and 18:00–22:00, night 22:00–06:00.
- Click-drag a zone row to set a range; the duration bar above the board and row headers show the result.
- The focus hour is the resting hour highlight; hover moves it and pointer leave or
  board focus loss restores it. This is visual only and must not set focus, change
  the range, or persist.
- The home row keeps a subtle tint and left accent. Hovering a row dims the other
  rows; do not dim touch interactions.
- Hour labels in the active column are semibold.
- Display toggles must change the rendered row, not only stored state.
- Keep keyboard shortcuts working outside inputs and open dialogs.
- Test with axe; do not introduce color-only status.
- Keep every user-facing font size at 12px or larger; use the scale in
  [`docs/typography.md`](docs/typography.md). Do not add arbitrary px sizes.
- The day picker lives in the header on wide screens and wraps below the
  controls on narrow screens. Keep it centered with `mx-auto`/absolute
  positioning; do not restore a separate full-width strip.
- Hide `GMT…`/`UTC…` abbreviations when the UTC offset is already visible.
  Format zero-minute offsets as `UTC+3`/`UTC−8`; zero is `UTC`.
- Mobile inputs and selects are 16px and at least 44px tall to avoid iOS zoom.
- Keep primary pointer targets at least 24×24; aim for 32px or more.
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

- Use feature branches. Do not push directly to `main`.
- `pnpm install` enables `.githooks`; bypass once with `git push --no-verify`.
- CodeRabbit reviews committed changes against `origin/main` or `main` at gate
  `major`. Qlty runs its configured plugins. Missing tools are skipped.
- CI runs format check, lint, type check, tests, build, and Chromium E2E.
- Deployment publishes `dist/` to GitHub Pages from `main`.
- `origin` is `Alex-Just/world-clock`; `main` tracks it. Push only when the owner asks.
- Pages builds from GitHub Actions. Live URL: [alex-just.github.io/world-clock](https://alex-just.github.io/world-clock/).
