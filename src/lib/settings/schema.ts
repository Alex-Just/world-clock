import { defaultLabel } from '$lib/time/zones';
import type { TimeFormat } from '$lib/time/types';
import { createDefaultSettings, seedZones } from './defaults';
import type { Accent, Settings, StepMinutes, Theme, ZoneSetting } from './types';

const THEMES = ['system', 'light', 'dark'] as const satisfies readonly Theme[];
const ACCENTS = [
  'blue',
  'teal',
  'violet',
  'amber',
  'rose',
  'green',
] as const satisfies readonly Accent[];
const FORMATS = ['24h', '12h'] as const satisfies readonly TimeFormat[];
const STEPS = [5, 15, 30, 60] as const satisfies readonly StepMinutes[];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const zoneValidity = new Map<string, boolean>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const cached = zoneValidity.get(value);
  if (cached !== undefined) return cached;

  let valid = true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
  } catch {
    valid = false;
  }
  zoneValidity.set(value, valid);
  return valid;
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function pickEnum<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  markChanged: () => void,
): T {
  if ((allowed as readonly unknown[]).includes(value)) {
    return value as T;
  }
  markChanged();
  return fallback;
}

function pickBoolean(value: unknown, fallback: boolean, markChanged: () => void): boolean {
  if (typeof value === 'boolean') return value;
  markChanged();
  return fallback;
}

function pickZone(value: unknown, fallback: string, markChanged: () => void): string {
  if (isValidZone(value)) return value;
  markChanged();
  return fallback;
}

export function parsePersisted(
  raw: unknown,
  browserZone: string,
): { settings: Settings; changed: boolean } {
  const fallbackZone = isValidZone(browserZone) ? browserZone : 'UTC';
  const defaults = createDefaultSettings(fallbackZone);

  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.settings)) {
    return { settings: defaults, changed: true };
  }

  let changed = false;
  const markChanged = () => {
    changed = true;
  };
  const source = raw.settings;

  if (Object.keys(raw).some((key) => key !== 'version' && key !== 'settings')) {
    markChanged();
  }
  if (Object.keys(source).some((key) => !(key in defaults))) {
    markChanged();
  }

  const theme = pickEnum(source.theme, THEMES, defaults.theme, markChanged);
  const accent = pickEnum(source.accent, ACCENTS, defaults.accent, markChanged);
  const timeFormat = pickEnum(source.timeFormat, FORMATS, defaults.timeFormat, markChanged);
  const stepMinutes = pickEnum(source.stepMinutes, STEPS, defaults.stepMinutes, markChanged);

  let workStart = isValidTime(source.workStart) ? source.workStart : defaults.workStart;
  let workEnd = isValidTime(source.workEnd) ? source.workEnd : defaults.workEnd;
  if (workStart === workEnd) {
    workStart = defaults.workStart;
    workEnd = defaults.workEnd;
    markChanged();
  }
  if (!isValidTime(source.workStart) || !isValidTime(source.workEnd)) {
    markChanged();
  }

  const homeZone = pickZone(source.homeZone, fallbackZone, markChanged);
  const zones: ZoneSetting[] = [];
  const seen = new Set<string>();

  if (Array.isArray(source.zones)) {
    for (const entry of source.zones) {
      if (!isRecord(entry) || !isValidZone(entry.timeZone)) {
        markChanged();
        continue;
      }
      if (seen.has(entry.timeZone)) {
        markChanged();
        continue;
      }
      seen.add(entry.timeZone);

      const rawLabel = typeof entry.label === 'string' ? entry.label.trim().slice(0, 40) : '';
      const label = rawLabel || defaultLabel(entry.timeZone);
      if (!rawLabel) markChanged();
      if (entry.label !== label) markChanged();
      zones.push({ timeZone: entry.timeZone, label });
    }
  } else {
    markChanged();
  }

  if (zones.length === 0) {
    zones.push(...seedZones(homeZone));
    markChanged();
  }
  if (!zones.some((zone) => zone.timeZone === homeZone)) {
    zones.unshift({ timeZone: homeZone, label: defaultLabel(homeZone) });
    markChanged();
  }

  return {
    settings: {
      theme,
      accent,
      timeFormat,
      showIana: pickBoolean(source.showIana, defaults.showIana, markChanged),
      showAbbreviation: pickBoolean(
        source.showAbbreviation,
        defaults.showAbbreviation,
        markChanged,
      ),
      showUtcOffset: pickBoolean(source.showUtcOffset, defaults.showUtcOffset, markChanged),
      showDst: pickBoolean(source.showDst, defaults.showDst, markChanged),
      showDateLabels: pickBoolean(source.showDateLabels, defaults.showDateLabels, markChanged),
      showWorkingHours: pickBoolean(
        source.showWorkingHours,
        defaults.showWorkingHours,
        markChanged,
      ),
      workStart,
      workEnd,
      stepMinutes,
      homeZone,
      zones,
    },
    changed,
  };
}
