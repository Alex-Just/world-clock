import {
  addDays,
  buildAxis,
  clampWindowOffsetHours,
  dateInZone,
  instantFromWallTime,
  snapInstant,
  wallTimeInZone,
} from '$lib/time/axis';
import { normalizeRange } from '$lib/time/range';
import type { DateString, InstantMs, NormalizedRange, TimeAxis, ZoneId } from '$lib/time/types';
import { clockStore } from './clock.svelte';
import { settingsStore, type SettingsStore } from './settings.svelte';

export interface BoardStore {
  readonly focusMs: InstantMs;
  readonly followNow: boolean;
  readonly range: NormalizedRange | null;
  readonly viewDate: DateString;
  readonly windowOffsetHours: number;
  readonly axis: TimeAxis;
  setFocus(instantMs: InstantMs): void;
  nudge(minutes: number): void;
  goToDay(date: DateString): void;
  shiftDay(days: number): void;
  shiftWindow(hours: number): void;
  now(): void;
  setRange(startMs: InstantMs, endMs: InstantMs, options?: { focus?: 'start' | 'keep' }): void;
  extendRange(minutes: number): void;
  clearRange(): void;
  setHomeZone(zone: ZoneId): void;
}

export function createBoardStore(deps: {
  settings: SettingsStore;
  clock: { readonly nowMs: number };
}): BoardStore {
  let selectedMs = $state(deps.clock.nowMs);
  let followNow = $state(true);
  let range = $state<NormalizedRange | null>(null);
  let windowOffsetHours = $state(0);

  const focusMs = $derived(followNow ? deps.clock.nowMs : selectedMs);
  const viewDate = $derived(dateInZone(focusMs, deps.settings.value.homeZone));
  const axis = $derived(
    buildAxis(
      deps.settings.value.homeZone,
      viewDate,
      deps.settings.value.timeFormat,
      windowOffsetHours,
    ),
  );

  const resetWindowIfNeeded = (instantMs: InstantMs) => {
    if (
      dateInZone(instantMs, deps.settings.value.homeZone) !== viewDate ||
      instantMs < axis.startMs ||
      instantMs >= axis.endMs
    ) {
      windowOffsetHours = 0;
    }
  };

  const setFocus = (instantMs: InstantMs) => {
    const snapped = snapInstant(
      deps.settings.value.homeZone,
      instantMs,
      deps.settings.value.stepMinutes,
    );
    resetWindowIfNeeded(snapped);
    selectedMs = snapped;
    followNow = false;
    range = null;
  };

  return {
    get focusMs() {
      return focusMs;
    },
    get followNow() {
      return followNow;
    },
    get range() {
      return range;
    },
    get viewDate() {
      return viewDate;
    },
    get windowOffsetHours() {
      return windowOffsetHours;
    },
    get axis() {
      return axis;
    },
    setFocus,
    nudge(minutes) {
      setFocus(focusMs + minutes * 60_000);
    },
    goToDay(date) {
      const wallTime = wallTimeInZone(focusMs, deps.settings.value.homeZone);
      selectedMs = instantFromWallTime(deps.settings.value.homeZone, date, wallTime);
      followNow = false;
      range = null;
      windowOffsetHours = 0;
    },
    shiftDay(days) {
      const next = addDays(viewDate, days);
      const wallTime = wallTimeInZone(focusMs, deps.settings.value.homeZone);
      selectedMs = instantFromWallTime(deps.settings.value.homeZone, next, wallTime);
      followNow = false;
      range = null;
      windowOffsetHours = 0;
    },
    shiftWindow(hours) {
      windowOffsetHours = clampWindowOffsetHours(windowOffsetHours + hours);
    },
    now() {
      followNow = true;
      range = null;
      windowOffsetHours = 0;
    },
    setRange(startMs, endMs, options) {
      const snappedStart = snapInstant(
        deps.settings.value.homeZone,
        startMs,
        deps.settings.value.stepMinutes,
      );
      const snappedEnd = snapInstant(
        deps.settings.value.homeZone,
        endMs,
        deps.settings.value.stepMinutes,
      );
      resetWindowIfNeeded(snappedStart);
      const normalized = normalizeRange(snappedStart, snappedEnd);
      if (options?.focus !== 'keep') selectedMs = snappedStart;
      followNow = false;
      range = normalized;
    },
    extendRange(minutes) {
      const anchor = range?.startMs ?? focusMs;
      const end = (range?.endMs ?? focusMs) + minutes * 60_000;
      const normalized = normalizeRange(
        anchor,
        snapInstant(deps.settings.value.homeZone, end, deps.settings.value.stepMinutes),
      );
      selectedMs = anchor;
      followNow = false;
      range = normalized;
    },
    clearRange() {
      range = null;
    },
    setHomeZone(zone) {
      deps.settings.update({ homeZone: zone });
      range = null;
      windowOffsetHours = 0;
    },
  };
}

export const boardStore = createBoardStore({
  settings: settingsStore,
  clock: clockStore,
});
