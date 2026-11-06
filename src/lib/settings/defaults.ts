import { defaultLabel } from '$lib/time/zones';
import type { Settings, ZoneSetting } from './types';

export const DEFAULT_ZONE_IDS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/New_York',
  'UTC',
  'Europe/Madrid',
  'Europe/Moscow',
  'Asia/Kolkata',
] as const;

const DEFAULT_LABELS: Record<string, string> = {
  'America/Los_Angeles': 'San Francisco',
  'Asia/Kolkata': 'Delhi',
};

const LEGACY_DEFAULT_ZONE_IDS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/New_York',
  'UTC',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Asia/Kolkata',
  'America/Chicago',
] as const;

const RETIRED_DEFAULT_ZONE_IDS = new Set(['Europe/London', 'America/Chicago']);

function defaultZoneLabel(timeZone: string): string {
  return DEFAULT_LABELS[timeZone] ?? defaultLabel(timeZone);
}

export function retireLegacyDefaultZones(settings: Settings): Settings {
  if (RETIRED_DEFAULT_ZONE_IDS.has(settings.homeZone)) return settings;

  const legacy = new Set<string>(LEGACY_DEFAULT_ZONE_IDS);
  const ids = new Set(settings.zones.map((zone) => zone.timeZone));
  if (!LEGACY_DEFAULT_ZONE_IDS.every((id) => ids.has(id))) return settings;

  const extra = settings.zones.filter((zone) => !legacy.has(zone.timeZone));
  if (extra.length > 1 || (extra[0] && extra[0].timeZone !== settings.homeZone)) return settings;
  if (!settings.zones.every((zone) => zone.label === defaultZoneLabel(zone.timeZone))) {
    return settings;
  }

  return {
    ...settings,
    zones: settings.zones.filter((zone) => !RETIRED_DEFAULT_ZONE_IDS.has(zone.timeZone)),
  };
}

export function seedZones(homeZone: string): ZoneSetting[] {
  const ids: string[] = [...DEFAULT_ZONE_IDS];
  if (!ids.includes(homeZone)) ids.unshift(homeZone);
  return ids.map((timeZone) => ({
    timeZone,
    label: DEFAULT_LABELS[timeZone] ?? defaultLabel(timeZone),
  }));
}

export function createDefaultSettings(
  browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Settings {
  return {
    theme: 'system',
    accent: 'blue',
    timeFormat: '24h',
    showIana: false,
    showAbbreviation: true,
    showUtcOffset: true,
    showDst: true,
    showDateLabels: true,
    showWorkingHours: true,
    workStart: '09:00',
    workEnd: '17:00',
    stepMinutes: 15,
    homeZone: browserZone,
    zones: seedZones(browserZone),
  };
}
