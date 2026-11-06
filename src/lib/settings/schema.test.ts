import { describe, expect, it } from 'vitest';
import { createDefaultSettings, seedZones } from './defaults';
import { parsePersisted } from './schema';

const browserZone = 'Europe/Madrid';

describe('defaults', () => {
  it('seeds the requested default zones in order', () => {
    const settings = createDefaultSettings(browserZone);
    expect(settings.homeZone).toBe('Europe/Madrid');
    expect(settings.zones).toEqual([
      { timeZone: 'America/Los_Angeles', label: 'San Francisco' },
      { timeZone: 'America/Denver', label: 'Denver' },
      { timeZone: 'America/New_York', label: 'New York' },
      { timeZone: 'UTC', label: 'UTC' },
      { timeZone: 'Europe/London', label: 'London' },
      { timeZone: 'Europe/Madrid', label: 'Madrid' },
      { timeZone: 'Europe/Moscow', label: 'Moscow' },
      { timeZone: 'Asia/Kolkata', label: 'Delhi' },
      { timeZone: 'America/Chicago', label: 'Chicago' },
    ]);
  });

  it('does not duplicate a home zone that is already in the list', () => {
    const zones = seedZones('America/New_York');
    expect(zones.map((zone) => zone.timeZone)).toEqual([
      'America/Los_Angeles',
      'America/Denver',
      'America/New_York',
      'UTC',
      'Europe/London',
      'Europe/Madrid',
      'Europe/Moscow',
      'Asia/Kolkata',
      'America/Chicago',
    ]);
  });

  it('prepends an unfamiliar browser home zone', () => {
    const zones = seedZones('Europe/Berlin');
    expect(zones).toHaveLength(10);
    expect(zones[0]).toEqual({ timeZone: 'Europe/Berlin', label: 'Berlin' });
  });
});

describe('parsePersisted', () => {
  it('accepts a valid document unchanged', () => {
    const settings = createDefaultSettings(browserZone);
    expect(parsePersisted({ version: 1, settings }, browserZone)).toEqual({
      settings,
      changed: false,
    });
  });

  it('drops unknown fields and invalid values', () => {
    const settings = {
      ...createDefaultSettings(browserZone),
      theme: 'neon',
      stepMinutes: 7,
      extra: true,
    };
    const parsed = parsePersisted({ version: 1, settings, extra: true }, browserZone);
    expect(parsed.settings.theme).toBe('system');
    expect(parsed.settings.stepMinutes).toBe(15);
    expect('extra' in parsed.settings).toBe(false);
    expect(parsed.changed).toBe(true);
  });

  it('repairs the home zone and zone list', () => {
    const settings = {
      ...createDefaultSettings(browserZone),
      homeZone: 'Not/AZone',
      zones: [
        { timeZone: 'Europe/Madrid', label: 'Madrid' },
        { timeZone: 'Europe/Madrid', label: 'Duplicate' },
        { timeZone: 'Nope/Nope', label: 'Bad' },
      ],
    };
    const parsed = parsePersisted({ version: 1, settings }, browserZone);
    expect(parsed.settings.homeZone).toBe(browserZone);
    expect(parsed.settings.zones).toEqual([{ timeZone: 'Europe/Madrid', label: 'Madrid' }]);
  });

  it('rejects equal working hours and permissive values', () => {
    const settings = {
      ...createDefaultSettings(browserZone),
      workStart: '09:00',
      workEnd: '09:00',
    };
    const parsed = parsePersisted({ version: 1, settings }, browserZone);
    expect(parsed.settings.workStart).toBe('09:00');
    expect(parsed.settings.workEnd).toBe('17:00');
  });

  it('falls back to defaults for malformed input', () => {
    for (const raw of [null, 'nope', [], {}, { version: 99 }]) {
      const parsed = parsePersisted(raw, browserZone);
      expect(parsed.settings.homeZone).toBe(browserZone);
      expect(parsed.changed).toBe(true);
    }
  });
});
