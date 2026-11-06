import { describe, expect, it } from 'vitest';
import {
  availabilityForZone,
  localRangeForZone,
  normalizeRange,
  summarizeAvailability,
  wallClockDurationMs,
} from './range';

const at = (iso: string) => Date.parse(iso);
const newYork = 'America/New_York';

describe('normalization and duration', () => {
  it('normalizes backwards ranges', () => {
    expect(normalizeRange(20, 10)).toEqual({ startMs: 10, endMs: 20, durationMs: 10 });
  });

  it('separates elapsed and wall-clock time across DST', () => {
    const range = normalizeRange(at('2026-03-08T06:30:00Z'), at('2026-03-08T07:30:00Z'));
    expect(range.durationMs).toBe(3_600_000);
    expect(wallClockDurationMs(newYork, range)).toBe(7_200_000);
  });
});

describe('availability', () => {
  it('reports in, partial, and out', () => {
    const inRange = normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-05T11:00:00Z'));
    expect(availabilityForZone('Europe/Madrid', inRange, '09:00', '17:00')).toBe('in');

    const partial = normalizeRange(at('2026-11-05T07:00:00Z'), at('2026-11-05T09:00:00Z'));
    expect(availabilityForZone('Europe/Madrid', partial, '09:00', '17:00')).toBe('partial');

    const out = normalizeRange(at('2026-11-05T17:00:00Z'), at('2026-11-05T19:00:00Z'));
    expect(availabilityForZone('Europe/Madrid', out, '09:00', '17:00')).toBe('out');
  });

  it('supports cross-midnight working windows', () => {
    const range = normalizeRange(at('2026-11-05T22:00:00Z'), at('2026-11-06T00:00:00Z'));
    expect(availabilityForZone('Europe/Madrid', range, '20:00', '04:00')).toBe('in');
  });

  it('labels spans over 24 hours as multi-day', () => {
    const range = normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-06T10:00:00Z'));
    expect(availabilityForZone('Europe/Madrid', range, '09:00', '17:00')).toBe('multi-day');
  });

  it('summarizes counts', () => {
    const range = normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-05T11:00:00Z'));
    expect(
      summarizeAvailability(
        ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo'],
        range,
        '09:00',
        '17:00',
      ),
    ).toEqual({ in: 1, partial: 0, out: 2, multiDay: 0 });
  });
});

describe('local range display', () => {
  it('shows local start and end with date rollover', () => {
    const range = normalizeRange(at('2026-11-05T23:00:00Z'), at('2026-11-06T01:00:00Z'));
    expect(localRangeForZone('America/New_York', range, '24h', 'en-US')).toEqual({
      start: '18:00',
      end: '20:00',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
    });
  });
});
