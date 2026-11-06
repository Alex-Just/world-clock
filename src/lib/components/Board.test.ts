import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import Board from './Board.svelte';
import { buildAxis } from '$lib/time/axis';
import { createDefaultSettings } from '$lib/settings/defaults';
import { normalizeRange } from '$lib/time/range';

const at = (iso: string) => Date.parse(iso);

it('renders a ruler, one row per zone, and focused local times', () => {
  const settings = createDefaultSettings('Europe/Madrid');
  render(Board, {
    props: {
      axis: buildAxis('Europe/Madrid', '2026-11-05', '24h'),
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-11-05T12:00:00Z'),
      nowMs: at('2026-11-05T12:00:00Z'),
      followNow: true,
      range: null,
      settings,
    },
  });
  expect(screen.getByRole('grid', { name: /world clock/i })).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(settings.zones.length + 1);
  expect(within(screen.getByTestId('row-Europe/Madrid')).getByText('13:00')).toBeInTheDocument();
  expect(within(screen.getByTestId('row-America/New_York')).getByText('07:00')).toBeInTheDocument();
  expect(screen.getAllByTestId('hour-label').length).toBeGreaterThanOrEqual(24);
});

it('draws the focus line and only draws now when it is in view', () => {
  const settings = createDefaultSettings('Europe/Madrid');
  const axis = buildAxis('Europe/Madrid', '2026-11-05', '24h');
  const { container } = render(Board, {
    props: {
      axis,
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-11-05T18:00:00Z'),
      nowMs: at('2026-11-05T12:00:00Z'),
      followNow: false,
      range: null,
      settings,
    },
  });
  expect(container.querySelector('[data-testid="focus-line"]')).toHaveStyle('--position: 79.1667%');
  expect(container.querySelector('[data-testid="now-line"]')).not.toBeNull();
});

it('highlights the selected range across every row', () => {
  const settings = createDefaultSettings('Europe/Madrid');
  const { container } = render(Board, {
    props: {
      axis: buildAxis('Europe/Madrid', '2026-11-05', '24h'),
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-11-05T12:00:00Z'),
      nowMs: at('2026-11-05T12:00:00Z'),
      followNow: false,
      range: normalizeRange(at('2026-11-05T06:00:00Z'), at('2026-11-05T12:00:00Z')),
      settings,
    },
  });
  expect(container.querySelectorAll('[data-testid="row-range-fill"]')).toHaveLength(
    settings.zones.length,
  );
  expect(container.querySelector('[data-testid="range-fill"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="range-outline"]')).not.toBeNull();
});

it('hides display fields when their settings are off', () => {
  const settings = {
    ...createDefaultSettings('Europe/Madrid'),
    showAbbreviation: false,
    showIana: true,
    showUtcOffset: false,
    showDst: false,
  };
  render(Board, {
    props: {
      axis: buildAxis('Europe/Madrid', '2026-07-01', '24h'),
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-07-01T12:00:00Z'),
      nowMs: at('2026-07-01T12:00:00Z'),
      followNow: false,
      range: null,
      settings,
    },
  });
  expect(screen.queryByText('EDT')).not.toBeInTheDocument();
  expect(screen.getByText('America/New_York')).toBeInTheDocument();
  expect(screen.queryByText('UTC−04:00')).not.toBeInTheDocument();
  expect(screen.queryByText('DST')).not.toBeInTheDocument();
});

it('shows abbreviation, exact offset, and DST when enabled', () => {
  const settings = createDefaultSettings('Europe/Madrid');
  render(Board, {
    props: {
      axis: buildAxis('Europe/Madrid', '2026-07-01', '24h'),
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-07-01T12:00:00Z'),
      nowMs: at('2026-07-01T12:00:00Z'),
      followNow: false,
      range: null,
      settings,
    },
  });
  expect(screen.getByText('EDT')).toBeInTheDocument();
  expect(screen.getByText('UTC−04:00')).toBeInTheDocument();
  expect(screen.getAllByText('DST').length).toBeGreaterThan(0);
});

it('highlights the hovered hour across all rows', async () => {
  const settings = createDefaultSettings('Europe/Madrid');
  const { container } = render(Board, {
    props: {
      axis: buildAxis('Europe/Madrid', '2026-11-05', '24h'),
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-11-05T12:00:00Z'),
      nowMs: at('2026-11-05T12:00:00Z'),
      followNow: false,
      range: null,
      settings,
    },
  });
  const timeline = container.querySelector<HTMLElement>(
    '[data-testid="row-Europe/Madrid"] [data-timeline]',
  );
  const grid = container.querySelector<HTMLElement>('[role="grid"]');
  if (!timeline || !grid) throw new Error('board markup missing');

  timeline.getBoundingClientRect = () => ({
    left: 0,
    width: 240,
    top: 0,
    height: 56,
    right: 240,
    bottom: 56,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  await fireEvent.pointerMove(timeline, { clientX: 110, pointerType: 'mouse' });
  expect(screen.getByTestId('hover-slot')).toHaveStyle('left: 45.8333%');
  expect(screen.getByTestId('hover-slot')).toHaveStyle('width: 4.1667%');

  await fireEvent.pointerLeave(grid);
  expect(screen.queryByTestId('hover-slot')).not.toBeInTheDocument();
});

it('creates a range by dragging on a zone row', async () => {
  const settings = createDefaultSettings('Europe/Madrid');
  const axis = buildAxis('Europe/Madrid', '2026-11-05', '24h');
  const onSetFocus = vi.fn();
  const onSetRange = vi.fn();
  const onRangeChange = vi.fn();
  const { container } = render(Board, {
    props: {
      axis,
      zones: settings.zones,
      homeZone: 'Europe/Madrid',
      focusMs: at('2026-11-05T12:00:00Z'),
      nowMs: at('2026-11-05T12:00:00Z'),
      followNow: false,
      range: null,
      settings,
      onSetFocus,
      onSetRange,
      onRangeChange,
    },
  });
  const timeline = container.querySelector<HTMLElement>(
    '[data-testid="row-Europe/Madrid"] [data-row-timeline]',
  );
  if (!timeline) throw new Error('timeline missing');
  timeline.getBoundingClientRect = () => ({
    left: 0,
    width: 240,
    top: 0,
    height: 56,
    right: 240,
    bottom: 56,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  await fireEvent.pointerDown(timeline, {
    clientX: 60,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
  });
  await fireEvent.pointerMove(window, { clientX: 180, pointerType: 'mouse' });
  await fireEvent.pointerUp(window, {
    clientX: 180,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
  });

  expect(onSetFocus).toHaveBeenCalledWith(axis.startMs + 6 * 3_600_000);
  expect(onRangeChange).toHaveBeenCalled();
  expect(onSetRange).toHaveBeenCalledWith(
    axis.startMs + 6 * 3_600_000,
    axis.startMs + 18 * 3_600_000,
  );
});
