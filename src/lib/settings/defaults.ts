import { defaultLabel } from '$lib/time/zones';
import type { Settings, ZoneSetting } from './types';

export const DEFAULT_ZONE_IDS = [
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

const DEFAULT_LABELS: Record<string, string> = {
  'America/Los_Angeles': 'San Francisco',
  'Asia/Kolkata': 'Delhi',
};

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
