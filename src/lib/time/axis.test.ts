import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildAxis,
  dateInZone,
  instantFromWallTime,
  moveByDays,
  positionForInstant,
  snapInstant,
  startOfDayInstant,
  zoneTransitions,
} from './axis';

const at = (iso: string) => Date.parse(iso);
const madrid = 'Europe/Madrid';
const newYork = 'America/New_York';

describe('axis construction', () => {
  it('spans a normal Madrid day with 24 hourly ticks', () => {
    const axis = buildAxis(madrid, '2026-11-05', '24h');
    expect(axis.startMs).toBe(at('2026-11-04T23:00:00Z'));
    expect(axis.endMs).toBe(at('2026-11-05T23:00:00Z'));
    expect(axis.durationMs).toBe(24 * 3_600_000);
    expect(axis.ticks).toHaveLength(24);
    expect(axis.ticks[0]).toMatchObject({ position: 0, label: '00', hour: 0 });
    expect(axis.ticks[23]?.position).toBeCloseTo(23 / 24);
  });

  it('spans 23 hours on New York spring forward and skips 02:00', () => {
    const axis = buildAxis(newYork, '2026-03-08', '24h');
    expect(axis.durationMs).toBe(23 * 3_600_000);
    expect(axis.ticks).toHaveLength(23);
    expect(axis.ticks.map((tick) => tick.hour)).toEqual([
      0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ]);
  });

  it('spans 25 hours on New York fall back and repeats 01:00', () => {
    const axis = buildAxis(newYork, '2026-11-01', '24h');
    expect(axis.durationMs).toBe(25 * 3_600_000);
    expect(axis.ticks).toHaveLength(25);
    expect(axis.ticks.filter((tick) => tick.hour === 1)).toHaveLength(2);
  });

  it('shifts the visible window in six-hour steps', () => {
    const forward = buildAxis(madrid, '2026-11-05', '24h', 6);
    expect(forward.startMs).toBe(at('2026-11-05T05:00:00Z'));
    expect(forward.endMs).toBe(at('2026-11-06T05:00:00Z'));
    expect(forward.ticks).toHaveLength(24);
    expect(forward.ticks[0]).toMatchObject({ position: 0, label: '06', hour: 6 });
    expect(forward.ticks.at(-1)?.label).toBe('05');

    const backward = buildAxis(madrid, '2026-11-05', '24h', -6);
    expect(backward.startMs).toBe(at('2026-11-04T17:00:00Z'));
    expect(backward.ticks).toHaveLength(24);
    expect(backward.ticks[0]).toMatchObject({ position: 0, label: '18', hour: 18 });
    expect(backward.ticks.at(-1)?.label).toBe('17');
  });

  it('keeps wall-clock start and DST length when the window is shifted', () => {
    const forward = buildAxis(newYork, '2026-03-08', '24h', 6);
    expect(forward.durationMs).toBe(24 * 3_600_000);
    expect(forward.ticks[0]?.hour).toBe(6);

    const backward = buildAxis(newYork, '2026-03-08', '24h', -6);
    expect(backward.durationMs).toBe(23 * 3_600_000);
    expect(backward.ticks[0]?.hour).toBe(18);
    expect(backward.ticks.some((tick) => tick.hour === 2)).toBe(false);
  });
});

describe('positions', () => {
  it('maps instants to positions and clamps', () => {
    const axis = buildAxis(madrid, '2026-11-05', '24h');
    expect(positionForInstant(axis, axis.startMs)).toBe(0);
    expect(positionForInstant(axis, axis.endMs)).toBe(1);
    expect(positionForInstant(axis, axis.startMs + 12 * 3_600_000)).toBeCloseTo(0.5);
    expect(positionForInstant(axis, axis.startMs - 1)).toBe(0);
    expect(positionForInstant(axis, axis.endMs + 1)).toBe(1);
  });
});

describe('wall time resolution', () => {
  it('resolves a normal wall time', () => {
    expect(instantFromWallTime(madrid, '2026-11-05', '14:30')).toBe(at('2026-11-05T13:30:00Z'));
  });

  it('resolves a skipped wall time to the first valid instant', () => {
    expect(instantFromWallTime(newYork, '2026-03-08', '02:30')).toBe(at('2026-03-08T07:00:00Z'));
  });

  it('resolves an ambiguous wall time to the earlier occurrence', () => {
    expect(instantFromWallTime(newYork, '2026-11-01', '01:30')).toBe(at('2026-11-01T05:30:00Z'));
  });

  it('preserves wall time across day navigation and handles gaps', () => {
    expect(moveByDays(newYork, at('2026-03-07T07:30:00Z'), 1)).toBe(at('2026-03-08T07:00:00Z'));
  });
});

describe('snapping and helpers', () => {
  it('snaps to the nearest step in the home zone', () => {
    expect(snapInstant(madrid, at('2026-11-05T13:08:00Z'), 15)).toBe(at('2026-11-05T13:15:00Z'));
    expect(snapInstant(madrid, at('2026-11-05T13:07:00Z'), 15)).toBe(at('2026-11-05T13:00:00Z'));
  });

  it('derives dates and day starts', () => {
    expect(dateInZone(at('2026-11-05T23:30:00Z'), madrid)).toBe('2026-11-06');
    expect(startOfDayInstant(madrid, '2026-11-05')).toBe(at('2026-11-04T23:00:00Z'));
    expect(addDays('2026-11-05', 1)).toBe('2026-11-06');
  });

  it('reports DST transitions within a range', () => {
    const transitions = zoneTransitions(
      newYork,
      at('2026-03-08T00:00:00Z'),
      at('2026-03-09T00:00:00Z'),
    );
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({
      instantMs: at('2026-03-08T07:00:00Z'),
      beforeOffsetMinutes: -300,
      afterOffsetMinutes: -240,
    });
  });
});
