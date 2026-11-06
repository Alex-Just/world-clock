import { formatHourLabel } from './format';
import type {
  AxisTick,
  DateString,
  InstantMs,
  TimeAxis,
  TimeFormat,
  TimeString,
  ZoneId,
  ZoneTransition,
} from './types';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const MINUTE_NS = 60_000_000_000;

export const WINDOW_SHIFT_HOURS = 6;
export const WINDOW_OFFSET_LIMIT_HOURS = 18;

export function clampWindowOffsetHours(hours: number): number {
  return Math.max(-WINDOW_OFFSET_LIMIT_HOURS, Math.min(WINDOW_OFFSET_LIMIT_HOURS, hours));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDate(date: DateString): Temporal.PlainDate {
  return Temporal.PlainDate.from(date);
}

function parseTime(time: TimeString): { hour: number; minute: number } {
  const [hour = '0', minute = '0'] = time.split(':');
  return { hour: Number(hour), minute: Number(minute) };
}

function wallMinutes(zoned: Temporal.ZonedDateTime): number {
  return zoned.hour * 60 + zoned.minute + zoned.second / 60 + zoned.millisecond / MINUTE_MS;
}

export function startOfDayInstant(zone: ZoneId, date: DateString): InstantMs {
  const plainDate = parseDate(date);
  return Temporal.ZonedDateTime.from(
    {
      timeZone: zone,
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 0,
    },
    { disambiguation: 'compatible' },
  ).epochMilliseconds;
}

export function zoneTransitions(
  zone: ZoneId,
  startMs: InstantMs,
  endMs: InstantMs,
): ZoneTransition[] {
  const transitions: ZoneTransition[] = [];
  let cursor = Temporal.Instant.fromEpochMilliseconds(startMs).toZonedDateTimeISO(zone);

  for (;;) {
    const next = cursor.getTimeZoneTransition('next');
    if (!next) break;
    if (next.epochMilliseconds >= endMs) break;

    const before = next.subtract({ nanoseconds: 1 });
    transitions.push({
      instantMs: next.epochMilliseconds,
      beforeOffsetMinutes: Math.round(before.offsetNanoseconds / MINUTE_NS),
      afterOffsetMinutes: Math.round(next.offsetNanoseconds / MINUTE_NS),
    });
    cursor = next;
  }

  return transitions;
}

export function instantFromWallTime(zone: ZoneId, date: DateString, time: TimeString): InstantMs {
  const plainDate = parseDate(date);
  const { hour, minute } = parseTime(time);
  const fields = {
    timeZone: zone,
    year: plainDate.year,
    month: plainDate.month,
    day: plainDate.day,
    hour,
    minute,
  };

  try {
    return Temporal.ZonedDateTime.from(fields, { disambiguation: 'reject' }).epochMilliseconds;
  } catch {
    const compatible = Temporal.ZonedDateTime.from(fields, { disambiguation: 'compatible' });
    const requestedMinutes = hour * 60 + minute;

    if (compatible.hour === hour && compatible.minute === minute) {
      return Temporal.ZonedDateTime.from(fields, { disambiguation: 'earlier' }).epochMilliseconds;
    }

    const transitions = zoneTransitions(
      zone,
      compatible.epochMilliseconds - 36 * HOUR_MS,
      compatible.epochMilliseconds + 36 * HOUR_MS,
    );

    for (const transition of transitions) {
      if (transition.afterOffsetMinutes <= transition.beforeOffsetMinutes) continue;

      const before = Temporal.Instant.fromEpochMilliseconds(
        transition.instantMs - 1,
      ).toZonedDateTimeISO(zone);
      const after = Temporal.Instant.fromEpochMilliseconds(transition.instantMs).toZonedDateTimeISO(
        zone,
      );
      const beforeDate = before.toPlainDate().toString();
      const afterDate = after.toPlainDate().toString();

      if (afterDate === date && beforeDate === date) {
        if (requestedMinutes > wallMinutes(before) && requestedMinutes < wallMinutes(after)) {
          return transition.instantMs;
        }
      } else if (afterDate === date && beforeDate !== date) {
        if (requestedMinutes < wallMinutes(after)) {
          return transition.instantMs;
        }
      } else if (beforeDate === date && afterDate !== date) {
        if (requestedMinutes > wallMinutes(before)) {
          return transition.instantMs;
        }
      }
    }

    return compatible.epochMilliseconds;
  }
}

export function buildAxis(
  homeZone: ZoneId,
  date: DateString,
  format: TimeFormat,
  windowOffsetHours = 0,
): TimeAxis {
  const offsetHours = Math.trunc(windowOffsetHours);
  const totalHours = 24 + offsetHours;
  const dayOffset = Math.floor(totalHours / 24) - 1;
  const startHour = totalHours % 24;
  const windowDate = addDays(date, dayOffset);
  const windowTime = `${pad(startHour)}:00`;
  const startMs = instantFromWallTime(homeZone, windowDate, windowTime);
  const endMs = instantFromWallTime(homeZone, addDays(windowDate, 1), windowTime);
  const durationMs = endMs - startMs;
  const ticks: AxisTick[] = [];

  for (let instantMs = startMs; instantMs < endMs; instantMs += HOUR_MS) {
    const zoned = Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(homeZone);
    ticks.push({
      instantMs,
      position: (instantMs - startMs) / durationMs,
      label: formatHourLabel(zoned.hour, format),
      hour: zoned.hour,
    });
  }

  return { homeZone, date, startMs, endMs, durationMs, ticks };
}

export function positionForInstant(axis: TimeAxis, instantMs: InstantMs): number {
  if (axis.durationMs <= 0) return 0;
  const position = (instantMs - axis.startMs) / axis.durationMs;
  return Math.min(1, Math.max(0, position));
}

export function instantForPosition(axis: TimeAxis, position: number): InstantMs {
  const clamped = Math.min(1, Math.max(0, position));
  return axis.startMs + Math.round(clamped * axis.durationMs);
}

export function snapInstant(zone: ZoneId, instantMs: InstantMs, stepMinutes: number): InstantMs {
  return Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(zone).round({
    smallestUnit: 'minute',
    roundingIncrement: stepMinutes,
    roundingMode: 'halfExpand',
  }).epochMilliseconds;
}

export function moveByDays(zone: ZoneId, instantMs: InstantMs, days: number): InstantMs {
  const wallTime = wallTimeInZone(instantMs, zone);
  const targetDate = addDays(dateInZone(instantMs, zone), days);
  return instantFromWallTime(zone, targetDate, wallTime);
}

export function dateInZone(instantMs: InstantMs, zone: ZoneId): DateString {
  return Temporal.Instant.fromEpochMilliseconds(instantMs)
    .toZonedDateTimeISO(zone)
    .toPlainDate()
    .toString();
}

export function wallTimeInZone(instantMs: InstantMs, zone: ZoneId): TimeString {
  const zoned = Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(zone);
  return `${pad(zoned.hour)}:${pad(zoned.minute)}`;
}

export function addDays(date: DateString, days: number): DateString {
  return parseDate(date).add({ days }).toString();
}
