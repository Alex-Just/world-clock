import { describe, expect, it, vi } from 'vitest';
import { createDefaultSettings } from '$lib/settings/defaults';
import { createBoardStore } from './board.svelte';
import { createClockStore } from './clock.svelte';
import { createSettingsStore } from './settings.svelte';

const at = (iso: string) => Date.parse(iso);

function makeSettings() {
  const settings = createDefaultSettings('Europe/Madrid');
  const persist = vi.fn();
  return { store: createSettingsStore(settings, persist), persist };
}

describe('clock store', () => {
  it('ticks on a one-second aligned interval and stops cleanly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1500);
    const clock = createClockStore();
    expect(clock.nowMs).toBe(1500);
    const stop = clock.start();
    vi.advanceTimersByTime(500);
    expect(clock.nowMs).toBe(2000);
    vi.advanceTimersByTime(1000);
    expect(clock.nowMs).toBe(3000);
    stop();
    vi.useRealTimers();
  });
});

describe('settings store', () => {
  it('updates, persists, and resets', () => {
    const { store, persist } = makeSettings();
    store.update({ theme: 'dark' });
    expect(store.value.theme).toBe('dark');
    expect(persist).toHaveBeenCalledWith(store.value);
    store.reset();
    expect(store.value.theme).toBe('system');
  });
});

describe('board store', () => {
  it('follows now until a focus is selected', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    expect(board.followNow).toBe(true);
    expect(board.focusMs).toBe(at('2026-11-05T12:00:00Z'));
    board.setFocus(at('2026-11-05T15:00:00Z'));
    expect(board.followNow).toBe(false);
    expect(board.focusMs).toBe(at('2026-11-05T15:00:00Z'));
    board.now();
    expect(board.followNow).toBe(true);
    expect(board.focusMs).toBe(at('2026-11-05T12:00:00Z'));
  });

  it('keeps the focus inside the derived view day across midnight', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T22:59:00Z') },
    });
    board.setFocus(at('2026-11-05T23:30:00Z'));
    expect(board.viewDate).toBe('2026-11-06');
    expect(board.axis.date).toBe('2026-11-06');
    expect(board.focusMs).toBe(at('2026-11-05T23:30:00Z'));
  });

  it('shifts the visible window in six-hour steps and clamps', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    expect(board.windowOffsetHours).toBe(0);

    board.shiftWindow(6);
    expect(board.windowOffsetHours).toBe(6);
    expect(board.axis.startMs).toBe(at('2026-11-05T05:00:00Z'));

    board.shiftWindow(6);
    board.shiftWindow(6);
    board.shiftWindow(6);
    expect(board.windowOffsetHours).toBe(18);
    expect(board.axis.startMs).toBe(at('2026-11-05T17:00:00Z'));

    board.shiftWindow(-6);
    expect(board.windowOffsetHours).toBe(12);

    board.shiftWindow(-36);
    expect(board.windowOffsetHours).toBe(-18);
  });

  it('resets the shifted window on day navigation, now, and home changes', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });

    board.shiftWindow(6);
    board.goToDay('2026-11-06');
    expect(board.windowOffsetHours).toBe(0);

    board.shiftWindow(6);
    board.now();
    expect(board.windowOffsetHours).toBe(0);

    board.shiftWindow(6);
    board.setHomeZone('America/New_York');
    expect(board.windowOffsetHours).toBe(0);
  });

  it('keeps a shifted window while focus stays inside it', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });

    board.shiftWindow(6);
    board.setFocus(at('2026-11-05T17:00:00Z'));
    expect(board.windowOffsetHours).toBe(6);
    expect(board.focusMs).toBe(at('2026-11-05T17:00:00Z'));

    board.shiftWindow(12);
    board.setFocus(at('2026-11-06T10:00:00Z'));
    expect(board.windowOffsetHours).toBe(0);
  });

  it('snaps range endpoints and keeps the drag anchor as focus', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    board.setRange(at('2026-11-05T16:07:00Z'), at('2026-11-05T14:07:00Z'));
    expect(board.range).toEqual({
      startMs: at('2026-11-05T14:00:00Z'),
      endMs: at('2026-11-05T16:00:00Z'),
      durationMs: 2 * 3_600_000,
    });
    expect(board.focusMs).toBe(at('2026-11-05T16:00:00Z'));
  });

  it('can update a range without moving focus', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    board.setFocus(at('2026-11-05T12:00:00Z'));
    board.setRange(at('2026-11-05T14:07:00Z'), at('2026-11-05T16:07:00Z'), {
      focus: 'keep',
    });
    expect(board.focusMs).toBe(at('2026-11-05T12:00:00Z'));
    expect(board.range?.startMs).toBe(at('2026-11-05T14:00:00Z'));
    expect(board.range?.endMs).toBe(at('2026-11-05T16:00:00Z'));
  });

  it('clears the range when the focus changes and sets focus at the anchor', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    board.setRange(at('2026-11-05T14:00:00Z'), at('2026-11-05T16:00:00Z'));
    expect(board.range?.startMs).toBe(at('2026-11-05T14:00:00Z'));
    expect(board.focusMs).toBe(at('2026-11-05T14:00:00Z'));
    expect(board.followNow).toBe(false);
    board.nudge(15);
    expect(board.range).toBeNull();
    expect(board.focusMs).toBe(at('2026-11-05T14:15:00Z'));
  });

  it('preserves focus and clears range on home change', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    board.setFocus(at('2026-11-05T12:00:00Z'));
    board.setRange(at('2026-11-05T12:00:00Z'), at('2026-11-05T13:00:00Z'));
    board.setHomeZone('America/New_York');
    expect(settings.value.homeZone).toBe('America/New_York');
    expect(board.focusMs).toBe(at('2026-11-05T12:00:00Z'));
    expect(board.range).toBeNull();
  });

  it('keeps wall time on day navigation and stops following', () => {
    const { store: settings } = makeSettings();
    const board = createBoardStore({
      settings,
      clock: { nowMs: at('2026-11-05T12:00:00Z') },
    });
    board.goToDay('2026-11-06');
    expect(board.viewDate).toBe('2026-11-06');
    expect(board.followNow).toBe(false);
    expect(board.focusMs).toBe(at('2026-11-06T12:00:00Z'));
  });
});
