import { createDefaultSettings, retireLegacyDefaultZones } from './defaults';
import { parsePersisted } from './schema';
import type { Settings, StorageLoadSource } from './types';

export const STORAGE_KEY = 'world-clock';
const MAX_IMPORT_LENGTH = 100_000;

function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function loadSettings(fallbackZone = browserZone()): {
  settings: Settings;
  source: StorageLoadSource;
} {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { settings: createDefaultSettings(fallbackZone), source: 'recovered' };
  }

  if (raw === null) {
    return { settings: createDefaultSettings(fallbackZone), source: 'default' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { settings: createDefaultSettings(fallbackZone), source: 'recovered' };
  }

  const result = parsePersisted(parsed, fallbackZone);
  const settings = retireLegacyDefaultZones(result.settings);
  if (settings !== result.settings) {
    saveSettings(settings);
    return { settings, source: 'recovered' };
  }
  return {
    settings: result.settings,
    source: result.changed ? 'recovered' : 'stored',
  };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings }));
  } catch {
    // Blocked storage must not break the in-memory session.
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See saveSettings.
  }
}

export function storageAvailable(): boolean {
  try {
    const probe = '__world_clock_storage_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function exportSettings(settings: Settings): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
    },
    null,
    2,
  );
}

export function importSettings(
  json: string,
  fallbackZone: string,
): { ok: true; settings: Settings } | { ok: false; error: string } {
  if (json.length > MAX_IMPORT_LENGTH) {
    return { ok: false, error: 'That file is too large to be a World Clock backup.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const candidate =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? {
          version: (parsed as Record<string, unknown>).version,
          settings: (parsed as Record<string, unknown>).settings,
        }
      : parsed;

  const result = parsePersisted(candidate, fallbackZone);
  if (result.changed) {
    return { ok: false, error: 'That backup contains invalid or unrecognized settings.' };
  }

  return { ok: true, settings: result.settings };
}

export function subscribeToStorage(listener: (settings: Settings) => void): () => void {
  const handler = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY || event.newValue === null) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.newValue);
    } catch {
      return;
    }

    const result = parsePersisted(parsed, browserZone());
    if (result.changed) return;
    listener(result.settings);
  };

  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('storage', handler);
  };
}
