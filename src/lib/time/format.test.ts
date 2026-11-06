import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDayMarker,
  formatDuration,
  formatHourLabel,
  formatOffset,
  formatRelative,
  formatTime,
  formatUtcOffset,
} from './format';

const normalize = (value: string) => value.replace(/\u202f/g, ' ');

describe('time and date', () => {
  it('formats 24-hour and 12-hour times', () => {
    const midnight = Date.parse('2026-11-05T00:00:00Z');
    expect(formatTime(midnight, 'UTC', '24h')).toBe('00:00');
    expect(normalize(formatTime(midnight, 'UTC', '12h', { locale: 'en-US' }))).toBe('12:00am');
    expect(
      normalize(formatTime(Date.parse('2026-11-05T12:00:00Z'), 'UTC', '12h', { locale: 'en-US' })),
    ).toBe('12:00pm');
  });

  it('formats compact ruler labels', () => {
    expect(formatHourLabel(0, '24h')).toBe('0');
    expect(formatHourLabel(13, '24h')).toBe('13');
    expect(formatHourLabel(0, '12h')).toBe('am');
    expect(formatHourLabel(12, '12h')).toBe('pm');
    expect(formatHourLabel(13, '12h')).toBe('1');
  });

  it('formats dates in the requested zone and locale', () => {
    expect(
      formatDate(Date.parse('2026-11-05T23:30:00Z'), 'Europe/Madrid', {
        style: 'short',
        locale: 'en-US',
      }),
    ).toBe('Fri, Nov 6');
    expect(formatDayMarker(Date.parse('2026-11-05T05:00:00Z'), 'America/New_York', 'en-US')).toBe(
      'Nov 5',
    );
  });
});

describe('offsets', () => {
  it('formats relative offsets', () => {
    expect(formatOffset(-540)).toBe('−9h');
    expect(formatOffset(-330)).toBe('−5:30');
    expect(formatOffset(345)).toBe('+5:45');
    expect(formatOffset(0)).toBe('0');
  });

  it('formats exact UTC offsets', () => {
    expect(formatUtcOffset(-420)).toBe('UTC−07:00');
    expect(formatUtcOffset(345)).toBe('UTC+05:45');
  });
});

describe('durations', () => {
  it('formats elapsed durations', () => {
    expect(formatDuration(0)).toBe('<1m');
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000 + 15 * 60_000)).toBe('2d 3h 15m');
  });

  it('formats relative deltas', () => {
    expect(formatRelative(0)).toBe('now');
    expect(formatRelative(3 * 3_600_000 + 20 * 60_000)).toBe('in 3h 20m');
    expect(formatRelative(-(2 * 3_600_000 + 10 * 60_000))).toBe('2h 10m ago');
    expect(formatRelative(86_400_000)).toBe('in 1d');
  });
});
