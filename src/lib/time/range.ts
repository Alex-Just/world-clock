import { addDays, dateInZone, instantFromWallTime } from './axis';
import { formatTime } from './format';
import type {
  Availability,
  DateString,
  InstantMs,
  NormalizedRange,
  TimeFormat,
  TimeString,
  ZoneId,
} from './types';

export { isWorkingTime } from './rows';

const DAY_MS = 86_400_000;

function parseTime(time: TimeString): number {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

export function normalizeRange(startMs: InstantMs, endMs: InstantMs): NormalizedRange {
  const start = Math.min(startMs, endMs);
  const end = Math.max(startMs, endMs);
  return { startMs: start, endMs: end, durationMs: end - start };
}

export function wallClockDurationMs(zone: ZoneId, range: NormalizedRange): number {
  const start = Temporal.Instant.fromEpochMilliseconds(range.startMs)
    .toZonedDateTimeISO(zone)
    .toPlainDateTime();
  const end = Temporal.Instant.fromEpochMilliseconds(range.endMs)
    .toZonedDateTimeISO(zone)
    .toPlainDateTime();
  return Math.abs(end.since(start, { largestUnit: 'millisecond' }).milliseconds);
}

export function availabilityForZone(
  zone: ZoneId,
  range: NormalizedRange,
  workStart: TimeString,
  workEnd: TimeString,
): Availability {
  if (range.durationMs > DAY_MS) return 'multi-day';

  const startMinutes = parseTime(workStart);
  const endMinutes = parseTime(workEnd);
  if (startMinutes === endMinutes) return 'out';

  const firstDate = addDays(dateInZone(range.startMs, zone), -1);
  const lastDate = addDays(dateInZone(range.endMs, zone), 1);
  let intersects = false;

  for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
    const windowStart = instantFromWallTime(zone, date, workStart);
    const windowEndDate = endMinutes > startMinutes ? date : addDays(date, 1);
    const windowEnd = instantFromWallTime(zone, windowEndDate, workEnd);

    if (range.startMs >= windowStart && range.endMs <= windowEnd) return 'in';
    if (range.startMs < windowEnd && range.endMs > windowStart) intersects = true;
  }

  return intersects ? 'partial' : 'out';
}

export function localRangeForZone(
  zone: ZoneId,
  range: NormalizedRange,
  format: TimeFormat,
  locale?: string,
): { start: string; end: string; startDate: DateString; endDate: DateString } {
  const options = locale === undefined ? {} : { locale };
  return {
    start: formatTime(range.startMs, zone, format, options),
    end: formatTime(range.endMs, zone, format, options),
    startDate: dateInZone(range.startMs, zone),
    endDate: dateInZone(range.endMs, zone),
  };
}

export function summarizeAvailability(
  zones: ZoneId[],
  range: NormalizedRange,
  workStart: TimeString,
  workEnd: TimeString,
): { in: number; partial: number; out: number; multiDay: number } {
  const summary = { in: 0, partial: 0, out: 0, multiDay: 0 };

  for (const zone of zones) {
    const status = availabilityForZone(zone, range, workStart, workEnd);
    if (status === 'in') summary.in += 1;
    else if (status === 'partial') summary.partial += 1;
    else if (status === 'out') summary.out += 1;
    else summary.multiDay += 1;
  }

  return summary;
}
