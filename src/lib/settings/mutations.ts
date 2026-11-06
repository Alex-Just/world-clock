import { defaultLabel } from '$lib/time/zones';
import type { Settings, ZoneSetting } from './types';

export function addZone(settings: Settings, zone: ZoneSetting): Settings {
  if (settings.zones.some((entry) => entry.timeZone === zone.timeZone)) return settings;

  const label = zone.label.trim().slice(0, 40) || defaultLabel(zone.timeZone);
  return {
    ...settings,
    zones: [...settings.zones, { timeZone: zone.timeZone, label }],
  };
}

export function removeZone(settings: Settings, timeZone: string): Settings {
  if (settings.homeZone === timeZone) return settings;
  return {
    ...settings,
    zones: settings.zones.filter((zone) => zone.timeZone !== timeZone),
  };
}

export function renameZone(settings: Settings, timeZone: string, label: string): Settings {
  const trimmed = label.trim().slice(0, 40);
  if (!trimmed) return settings;

  return {
    ...settings,
    zones: settings.zones.map((zone) =>
      zone.timeZone === timeZone ? { ...zone, label: trimmed } : zone,
    ),
  };
}

export function moveZone(settings: Settings, timeZone: string, delta: -1 | 1): Settings {
  const index = settings.zones.findIndex((zone) => zone.timeZone === timeZone);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= settings.zones.length) return settings;

  const zones = [...settings.zones];
  const current = zones[index];
  const neighbour = zones[target];
  if (!current || !neighbour) return settings;
  zones[index] = neighbour;
  zones[target] = current;

  return { ...settings, zones };
}

export function setHomeZone(settings: Settings, timeZone: string): Settings {
  if (!settings.zones.some((zone) => zone.timeZone === timeZone)) return settings;
  return { ...settings, homeZone: timeZone };
}
