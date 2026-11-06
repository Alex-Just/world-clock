import { describe, expect, it } from 'vitest';
import {
  defaultLabel,
  dstInfo,
  listZones,
  relativeOffsetMinutes,
  searchZones,
  zoneAbbreviation,
  zoneOffsetMinutes,
} from './zones';

const summer = Date.parse('2026-07-01T12:00:00Z');
const winter = Date.parse('2026-01-01T12:00:00Z');

describe('labels', () => {
  it('derives readable labels from IANA ids', () => {
    expect(defaultLabel('America/New_York')).toBe('New York');
    expect(defaultLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(defaultLabel('Asia/Kolkata')).toBe('Kolkata');
    expect(defaultLabel('UTC')).toBe('UTC');
    expect(defaultLabel('Etc/GMT+5')).toBe('GMT+5');
  });

  it('includes canonical zones and UTC', () => {
    const zones = listZones();
    expect(zones).toContain('Europe/Madrid');
    expect(zones).toContain('Asia/Kathmandu');
    expect(zones).toContain('UTC');
  });
});

describe('offsets and abbreviations', () => {
  it('formats New York summer and winter abbreviations', () => {
    expect(zoneAbbreviation('America/New_York', summer, 'en-US')).toBe('EDT');
    expect(zoneAbbreviation('America/New_York', winter, 'en-US')).toBe('EST');
  });

  it('returns exact and relative offsets in minutes', () => {
    expect(zoneOffsetMinutes('Asia/Kathmandu', summer)).toBe(345);
    expect(relativeOffsetMinutes('America/New_York', 'Europe/Madrid', summer)).toBe(-360);
  });
});

describe('DST detection', () => {
  it('is active in Dublin summer and inactive in winter', () => {
    expect(dstInfo('Europe/Dublin', summer)).toEqual({ active: true, aheadMinutes: 60 });
    expect(dstInfo('Europe/Dublin', winter)).toEqual({ active: false, aheadMinutes: 0 });
  });

  it('detects 30-minute DST on Lord Howe', () => {
    expect(dstInfo('Australia/Lord_Howe', Date.parse('2026-01-15T00:00:00Z'))).toEqual({
      active: true,
      aheadMinutes: 30,
    });
  });

  it('is inactive in a no-DST zone', () => {
    expect(dstInfo('Asia/Kolkata', summer)).toEqual({ active: false, aheadMinutes: 0 });
  });
});

describe('search', () => {
  it('finds a zone by common city alias', () => {
    expect(searchZones('san fran')[0]?.timeZone).toBe('America/Los_Angeles');
  });

  it('ranks an exact label first', () => {
    expect(searchZones('new york')[0]?.timeZone).toBe('America/New_York');
  });

  it('returns results for an empty query', () => {
    expect(searchZones('').length).toBeGreaterThan(0);
  });
});
