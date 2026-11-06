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
  options: { style?: 'short' | 'long'; locale?: string; year?: boolean } = {},
): string {
  const long = options.style === 'long';
  const formatter = new Intl.DateTimeFormat(options.locale, {
    timeZone: zone,
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
    ...(long || options.year ? { year: 'numeric' } : {}),
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
  if (minutes === 0) return 'UTC';
  const sign = minutes < 0 ? '−' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60));
  const remaining = absolute % 60;
  return remaining === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${pad(remaining)}`;
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

export interface RelativeBreakdown {
  text: string;
  hasCalendarUnits: boolean;
}

export function formatRelativeBreakdown(
  sourceMs: InstantMs,
  targetMs: InstantMs,
  zone: ZoneId,
): RelativeBreakdown {
  const absolute = Math.abs(targetMs - sourceMs);
  if (absolute < MINUTE_MS) return { text: '<1m', hasCalendarUnits: false };

  const earlier = Temporal.Instant.fromEpochMilliseconds(
    Math.min(sourceMs, targetMs),
  ).toZonedDateTimeISO(zone);
  const later = Temporal.Instant.fromEpochMilliseconds(
    Math.max(sourceMs, targetMs),
  ).toZonedDateTimeISO(zone);
  const duration = earlier.until(later, { largestUnit: 'year', smallestUnit: 'minute' });
  const parts: string[] = [];

  if (duration.years > 0) parts.push(`${String(duration.years)}y`);
  if (duration.months > 0) parts.push(`${String(duration.months)}mo`);
  if (duration.days > 0) parts.push(`${String(duration.days)}d`);
  if (duration.hours > 0) parts.push(`${String(duration.hours)}h`);
  if (duration.minutes > 0) parts.push(`${String(duration.minutes)}m`);

  return {
    text: parts.length > 0 ? parts.join(' ') : '<1m',
    hasCalendarUnits: duration.years > 0 || duration.months > 0,
  };
}

export function formatSourceStamp(
  sourceMs: InstantMs,
  nowMs: InstantMs,
  zone: ZoneId,
  format: TimeFormat,
  locale?: string,
): string {
  const source = Temporal.Instant.fromEpochMilliseconds(sourceMs).toZonedDateTimeISO(zone);
  const now = Temporal.Instant.fromEpochMilliseconds(nowMs).toZonedDateTimeISO(zone);
  const sourceDate = source.toPlainDate();
  const nowDate = now.toPlainDate();
  const time = formatTime(sourceMs, zone, format, locale === undefined ? {} : { locale });

  if (sourceDate.toString() === nowDate.toString()) return `today, ${time}`;

  const month = new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${sourceDate.toString()}T12:00:00Z`));

  if (sourceDate.year === nowDate.year && sourceDate.month === nowDate.month) {
    return `the ${String(sourceDate.day)}, ${time}`;
  }
  if (sourceDate.year === nowDate.year) {
    return `${month} ${String(sourceDate.day)}, ${time}`;
  }
  return `${month} ${String(sourceDate.day)}, ${String(sourceDate.year)}, ${time}`;
}
