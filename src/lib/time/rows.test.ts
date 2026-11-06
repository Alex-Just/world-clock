import { describe, expect, it } from 'vitest';
import { buildAxis } from './axis';
import {
  buildDayMarkers,
  buildDstMarkers,
  buildHourLabels,
  buildRowBands,
  buildZoneRow,
} from './rows';

const at = (iso: string) => Date.parse(iso);
const madridAxis = buildAxis('Europe/Madrid', '2026-11-05', '24h');

describe('bands', () => {
  it('covers the day exactly once with fixed day/night bands', () => {
    const { base } = buildRowBands('Europe/Madrid', madridAxis, '09:00', '17:00');
    expect(base[0]?.start).toBe(0);
    expect(base.at(-1)?.end).toBe(1);
    expect(base.map((band) => band.kind)).toEqual([
      'night',
      'twilight',
      'day',
      'twilight',
      'night',
    ]);
    expect(base[1]?.start).toBeCloseTo(6 / 24);
    expect(base[2]?.start).toBeCloseTo(8 / 24);
    expect(base[3]?.start).toBeCloseTo(18 / 24);
    expect(base[4]?.start).toBeCloseTo(22 / 24);
    for (let i = 1; i < base.length; i += 1) {
      expect(base[i - 1]!.end).toBeLessThanOrEqual(base[i]!.start);
    }
  });

  it('places the working overlay at local 09:00-17:00', () => {
    const { work } = buildRowBands('Europe/Madrid', madridAxis, '09:00', '17:00');
    expect(work).toHaveLength(1);
    expect(work[0]!.start).toBeCloseTo(9 / 24);
    expect(work[0]!.end).toBeCloseTo(17 / 24);
  });

  it('wraps cross-midnight working hours', () => {
    const { work } = buildRowBands('Europe/Madrid', madridAxis, '20:00', '04:00');
    expect(work).toHaveLength(2);
    expect(work[0]).toMatchObject({ start: 0 });
    expect(work[0]!.end).toBeCloseTo(4 / 24);
    expect(work[1]!.start).toBeCloseTo(20 / 24);
    expect(work[1]!.end).toBe(1);
  });
});

describe('labels and markers', () => {
  it('aligns a +5:45 zone to its own hour boundaries', () => {
    const labels = buildHourLabels('Asia/Kathmandu', madridAxis, '24h');
    expect(labels[0]?.label).toBe('05');
    expect(labels[0]?.position).toBeCloseTo(0.25 / 24);
  });

  it('handles a 30-minute DST jump', () => {
    const axis = buildAxis('Australia/Lord_Howe', '2026-10-04', '24h');
    const labels = buildHourLabels('Australia/Lord_Howe', axis, '24h');
    expect(axis.durationMs).toBe(23.5 * 3_600_000);
    expect(labels.find((label) => label.hour === 2)?.position).toBeCloseTo(2 / 23.5);
    expect(labels.find((label) => label.hour === 3)?.position).toBeCloseTo(2.5 / 23.5);
  });

  it('marks local midnight with the new date', () => {
    const markers = buildDayMarkers('America/New_York', madridAxis, 'en-US');
    expect(markers[0]?.position).toBeCloseTo(6 / 24);
    expect(markers[0]?.label).toBe('Thu 5');
  });

  it('marks DST transitions', () => {
    const axis = buildAxis('America/New_York', '2026-03-08', '24h');
    const markers = buildDstMarkers('America/New_York', axis);
    expect(markers).toEqual([
      { position: 2 / 23, label: 'Clocks go forward 1 hour', direction: 'forward' },
    ]);
  });
});

describe('row model', () => {
  it('shows the focused local time, date, status, and offsets', () => {
    const row = buildZoneRow({ timeZone: 'America/New_York', label: 'New York' }, madridAxis, {
      focusMs: at('2026-11-05T11:00:00Z'),
      workStart: '09:00',
      workEnd: '17:00',
      format: '24h',
      showDateLabels: true,
      locale: 'en-US',
    });
    expect(row.focusedTime).toBe('06:00');
    expect(row.focusedDate).toBe('Thu 5');
    expect(row.focusedStatus).toBe('night');
    expect(row.relativeOffsetMinutes).toBe(-360);
    expect(row.abbreviation).toBe('EST');
  });
});
