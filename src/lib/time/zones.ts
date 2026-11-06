import { CITY_ALIASES } from '$lib/data/cityAliases';
import type { DstInfo, InstantMs, ZoneId, ZoneSearchResult } from './types';

const MINUTE_NS = 60_000_000_000;
const ALIASES = new Map<ZoneId, string[]>();

// Normalize legacy Intl spellings to one modern id per place.
const CANONICAL_IDS: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Godthab': 'America/Nuuk',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
  'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
};

for (const entry of CITY_ALIASES) {
  ALIASES.set(
    entry.timeZone,
    entry.aliases.map((alias) => alias.toLowerCase()),
  );
}

let cachedZones: ZoneId[] | undefined;
const dstCache = new Map<string, number>();

function supportedTimeZones(): ZoneId[] {
  return Intl.supportedValuesOf('timeZone');
}

function titleWord(word: string): string {
  if (/^[A-Z]{2,}[+-]?\d*$/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function listZones(): ZoneId[] {
  if (!cachedZones) {
    const zones = new Set(supportedTimeZones().map((zone) => CANONICAL_IDS[zone] ?? zone));
    zones.add('UTC');
    cachedZones = [...zones].sort((a, b) => a.localeCompare(b));
  }
  return cachedZones;
}

export function defaultLabel(zone: ZoneId): string {
  const segment = zone.split('/').at(-1) ?? zone;
  if (segment === 'UTC' || segment.startsWith('GMT')) return segment;
  return segment.replaceAll('_', ' ').split(' ').map(titleWord).join(' ');
}

export function zoneOffsetMinutes(zone: ZoneId, instantMs: InstantMs): number {
  const zoned = Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(zone);
  return Math.round(zoned.offsetNanoseconds / MINUTE_NS);
}

export function relativeOffsetMinutes(
  zone: ZoneId,
  homeZone: ZoneId,
  instantMs: InstantMs,
): number {
  return zoneOffsetMinutes(zone, instantMs) - zoneOffsetMinutes(homeZone, instantMs);
}

export function zoneAbbreviation(zone: ZoneId, instantMs: InstantMs, locale = 'en-US'): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    timeZoneName: 'short',
  }).formatToParts(new Date(instantMs));
  const name = parts.find((part) => part.type === 'timeZoneName')?.value;
  if (name) return name;

  const offset = zoneOffsetMinutes(zone, instantMs);
  const sign = offset < 0 ? '−' : '+';
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

function minimumOffsetForYear(zone: ZoneId, year: number): number {
  const key = `${zone}:${String(year)}`;
  const cached = dstCache.get(key);
  if (cached !== undefined) return cached;

  let minimum = Number.POSITIVE_INFINITY;
  for (let month = 1; month <= 12; month += 1) {
    for (const day of [1, 15]) {
      const zoned = Temporal.ZonedDateTime.from({
        timeZone: zone,
        year,
        month,
        day,
        hour: 12,
      });
      minimum = Math.min(minimum, Math.round(zoned.offsetNanoseconds / MINUTE_NS));
    }
  }

  dstCache.set(key, minimum);
  return minimum;
}

export function dstInfo(zone: ZoneId, instantMs: InstantMs): DstInfo {
  const zoned = Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(zone);
  const current = Math.round(zoned.offsetNanoseconds / MINUTE_NS);
  const minimum = minimumOffsetForYear(zone, zoned.year);
  return { active: current > minimum, aheadMinutes: current - minimum };
}

export function searchZones(
  query: string,
  locale = 'en-US',
  instantMs: InstantMs = Date.now(),
): ZoneSearchResult[] {
  const normalized = query.trim().toLowerCase();
  const results = listZones().map((timeZone) => {
    const label = defaultLabel(timeZone);
    const lowerLabel = label.toLowerCase();
    const aliases = ALIASES.get(timeZone) ?? [];
    let score = 0;

    if (normalized) {
      if (lowerLabel === normalized) score = Math.max(score, 100);
      if (lowerLabel.startsWith(normalized)) score = Math.max(score, 80);
      if (lowerLabel.includes(normalized)) score = Math.max(score, 60);

      for (const alias of aliases) {
        if (alias === normalized) score = Math.max(score, 70);
        else if (alias.includes(normalized)) score = Math.max(score, 50);
      }

      if (timeZone.toLowerCase().includes(normalized)) score = Math.max(score, 40);
    }

    return {
      timeZone,
      label,
      offsetMinutes: zoneOffsetMinutes(timeZone, instantMs),
      abbreviation: zoneAbbreviation(timeZone, instantMs, locale),
      score,
    };
  });

  return results
    .filter((result) => !normalized || result.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
