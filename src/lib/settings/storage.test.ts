import { beforeEach, expect, it, vi } from 'vitest';
import { createDefaultSettings } from './defaults';
import {
  STORAGE_KEY,
  clearSettings,
  exportSettings,
  importSettings,
  loadSettings,
  saveSettings,
  storageAvailable,
  subscribeToStorage,
} from './storage';

const browserZone = 'Europe/Madrid';
beforeEach(() => {
  localStorage.clear();
});

it('uses a stable key and round-trips', () => {
  const settings = createDefaultSettings(browserZone);
  saveSettings(settings);
  expect(STORAGE_KEY).toBe('world-clock');
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { version?: number };
  expect(stored.version).toBe(1);
  expect(loadSettings(browserZone)).toEqual({ settings, source: 'stored' });
});

it('recovers from corrupt storage', () => {
  localStorage.setItem(STORAGE_KEY, '{not json');
  const result = loadSettings(browserZone);
  expect(result.source).toBe('recovered');
  expect(result.settings).toEqual(createDefaultSettings(browserZone));
});

it('exports and imports a valid document', () => {
  const settings = createDefaultSettings(browserZone);
  const parsed = importSettings(exportSettings(settings), browserZone);
  expect(parsed).toEqual({ ok: true, settings });
});

it('rejects oversized and invalid imports', () => {
  expect(importSettings('x'.repeat(100_001), browserZone).ok).toBe(false);
  expect(importSettings('{"version":1,"settings":{}}', browserZone).ok).toBe(false);
});

it('applies valid cross-tab updates and ignores invalid ones', () => {
  const listener = vi.fn();
  const stop = subscribeToStorage(listener);
  const settings = { ...createDefaultSettings(browserZone), theme: 'dark' as const };
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify({ version: 1, settings }),
    }),
  );
  expect(listener).toHaveBeenCalledWith(settings);

  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{bad' }));
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  clearSettings();
});

it('survives blocked localStorage reads', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const result = loadSettings(browserZone);
  expect(result.source).toBe('recovered');
  expect(result.settings.homeZone).toBe(browserZone);
  get.mockRestore();
});

it('swallows blocked writes and reports storage unavailable', () => {
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(() => {
    saveSettings(createDefaultSettings(browserZone));
  }).not.toThrow();
  expect(storageAvailable()).toBe(false);
  set.mockRestore();
});

it('retires London and Chicago from untouched legacy defaults', () => {
  const settings = createDefaultSettings(browserZone);
  settings.zones = [
    { timeZone: 'America/Los_Angeles', label: 'San Francisco' },
    { timeZone: 'America/Denver', label: 'Denver' },
    { timeZone: 'America/New_York', label: 'New York' },
    { timeZone: 'UTC', label: 'UTC' },
    { timeZone: 'Europe/London', label: 'London' },
    { timeZone: 'Europe/Madrid', label: 'Madrid' },
    { timeZone: 'Europe/Moscow', label: 'Moscow' },
    { timeZone: 'Asia/Kolkata', label: 'Delhi' },
    { timeZone: 'America/Chicago', label: 'Chicago' },
  ];
  saveSettings(settings);
  const result = loadSettings(browserZone);
  expect(result.source).toBe('recovered');
  expect(result.settings.zones.map((zone) => zone.timeZone)).toEqual([
    'America/Los_Angeles',
    'America/Denver',
    'America/New_York',
    'UTC',
    'Europe/Madrid',
    'Europe/Moscow',
    'Asia/Kolkata',
  ]);
});

it('keeps legacy defaults when they were customized', () => {
  const settings = createDefaultSettings(browserZone);
  settings.zones = [
    { timeZone: 'America/Los_Angeles', label: 'San Francisco' },
    { timeZone: 'America/Denver', label: 'Denver' },
    { timeZone: 'America/New_York', label: 'New York' },
    { timeZone: 'UTC', label: 'UTC' },
    { timeZone: 'Europe/London', label: 'London' },
    { timeZone: 'Europe/Madrid', label: 'Madrid' },
    { timeZone: 'Europe/Moscow', label: 'Moscow' },
    { timeZone: 'Asia/Kolkata', label: 'Delhi' },
    { timeZone: 'America/Chicago', label: 'Chicago HQ' },
  ];
  saveSettings(settings);
  const result = loadSettings(browserZone);
  expect(result.settings.zones).toHaveLength(9);
});
