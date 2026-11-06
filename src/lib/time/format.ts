import type { DateString, InstantMs, TimeFormat, ZoneId } from './types';

const MINUTE_MS = 60_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatHourLabel(hour: number, format: TimeFormat): string {
  if (format === '24h') return pad(hour);
  const twelve = hour % 12;
  if (twelve === 0) return hour < 12 ? '12a' : '12p';
  return String(twelve);
}

export function formatTime(
  instantMs: InstantMs,
  zone: ZoneId,
  format: TimeFormat,
  options: { seconds?: boolean; locale?: string } = {},
): string {
  const formatter = new Intl.DateTimeFormat(options.locale, {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
    ...(format === '24h' ? { hourCycle: 'h23' } : { hour12: true }),
  });
  return formatter.format(new Date(instantMs));
}

export function formatDate(
  instantMs: InstantMs,
  zone: ZoneId,
  options: { style?: 'short' | 'long'; locale?: string } = {},
): string {
  const long = options.style === 'long';
  const formatter = new Intl.DateTimeFormat(options.locale, {
    timeZone: zone,
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
    ...(long ? { year: 'numeric' } : {}),
  });
  return formatter.format(new Date(instantMs));
}

export function formatDateString(
  date: DateString,
  options: { style?: 'short' | 'long'; locale?: string } = {},
): string {
  const instant = Date.parse(`${date}T12:00:00Z`);
  return formatDate(instant, 'UTC', options);
}

export function formatDayMarker(instantMs: InstantMs, zone: ZoneId, locale?: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
  }).formatToParts(new Date(instantMs));
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${weekday} ${day}`.trim();
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) return '0';
  const sign = minutes < 0 ? '−' : '+';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  return remainder === 0 ? `${sign}${String(hours)}h` : `${sign}${String(hours)}:${pad(remainder)}`;
}

export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const absolute = Math.abs(minutes);
  return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

export function formatDuration(ms: number): string {
  const absolute = Math.abs(ms);
  if (absolute < MINUTE_MS) return '<1m';

  const totalMinutes = Math.floor(absolute / MINUTE_MS);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${String(days)}d`);
  if (hours > 0) parts.push(`${String(hours)}h`);
  if (minutes > 0) parts.push(`${String(minutes)}m`);
  return parts.length > 0 ? parts.join(' ') : '<1m';
}

export function formatRelative(deltaMs: number): string {
  const absolute = Math.abs(deltaMs);
  if (absolute < MINUTE_MS) return 'now';

  const duration = formatDuration(absolute);
  return deltaMs < 0 ? `${duration} ago` : `in ${duration}`;
}
