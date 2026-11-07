import { addDays, dateInZone, instantFromWallTime, zoneTransitions } from './axis';
import { formatDayMarker, formatHourLabel, formatTime } from './format';
import { dstInfo, relativeOffsetMinutes, zoneAbbreviation, zoneOffsetMinutes } from './zones';
import type {
  BandSegment,
  DateString,
  DayMarker,
  DayPeriod,
  DstMarker,
  HourLabel,
  InstantMs,
  RowBands,
  RowOptions,
  RowZone,
  TimeAxis,
  TimeFormat,
  TimeString,
  WorkSegment,
  ZoneId,
  ZoneRowModel,
} from './types';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const EPSILON = 1e-9;

function parseTime(time: TimeString): number {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

function localHourAt(zone: ZoneId, instantMs: InstantMs): number {
  return Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(zone).hour;
}

function localDates(zone: ZoneId, axis: TimeAxis, padding: number): DateString[] {
  const first = addDays(dateInZone(axis.startMs, zone), -padding);
  const last = addDays(dateInZone(axis.endMs - 1, zone), padding);
  const dates: DateString[] = [];

  for (let date = first; date <= last; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function positionOf(axis: TimeAxis, instantMs: InstantMs): number {
  if (axis.durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, (instantMs - axis.startMs) / axis.durationMs));
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const unique: number[] = [];
  for (const value of sorted) {
    const previous = unique.at(-1);
    if (previous === undefined || value - previous > EPSILON) {
      unique.push(value);
    }
  }
  return unique;
}

export function buildRowBands(
  zone: ZoneId,
  axis: TimeAxis,
  workStart: TimeString,
  workEnd: TimeString,
): RowBands {
  const boundaries = [0, 1];

  for (const date of localDates(zone, axis, 0)) {
    for (const time of ['06:00', '08:00', '18:00', '22:00']) {
      const instant = instantFromWallTime(zone, date, time);
      const position = positionOf(axis, instant);
      if (position > 0 && position < 1) boundaries.push(position);
    }
  }

  const base: BandSegment[] = [];
  const sorted = uniqueSorted(boundaries);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (start === undefined || end === undefined) continue;
    if (end - start <= EPSILON) continue;
    const midpoint = axis.startMs + ((start + end) / 2) * axis.durationMs;
    const hour = localHourAt(zone, midpoint);
    const kind =
      hour >= 8 && hour < 18
        ? 'day'
        : (hour >= 6 && hour < 8) || (hour >= 18 && hour < 22)
          ? 'twilight'
          : 'night';
    const previous = base.at(-1);
    if (previous && previous.kind === kind) {
      previous.end = end;
    } else {
      base.push({ start, end, kind });
    }
  }

  const work: WorkSegment[] = [];
  const startMinutes = parseTime(workStart);
  const endMinutes = parseTime(workEnd);

  if (startMinutes !== endMinutes) {
    const windows: WorkSegment[] = [];

    for (const date of localDates(zone, axis, 1)) {
      const startInstant = instantFromWallTime(zone, date, workStart);
      const endDate = endMinutes > startMinutes ? date : addDays(date, 1);
      const endInstant = instantFromWallTime(zone, endDate, workEnd);

      if (endInstant <= axis.startMs || startInstant >= axis.endMs) continue;

      const start = positionOf(axis, startInstant);
      const end = positionOf(axis, endInstant);
      if (end - start > EPSILON) windows.push({ start, end });
    }

    windows.sort((a, b) => a.start - b.start);
    for (const window of windows) {
      const previous = work.at(-1);
      if (previous && window.start <= previous.end + EPSILON) {
        previous.end = Math.max(previous.end, window.end);
      } else {
        work.push({ ...window });
      }
    }
  }

  return { base, work };
}

export function buildHourLabels(zone: ZoneId, axis: TimeAxis, format: TimeFormat): HourLabel[] {
  const transitions = zoneTransitions(zone, axis.startMs, axis.endMs);
  const boundaries = [
    axis.startMs,
    ...transitions.map((transition) => transition.instantMs),
    axis.endMs,
  ];
  const labels: HourLabel[] = [];
  const seen = new Set<number>();

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (start === undefined || end === undefined) continue;
    if (end <= start) continue;

    const zoned = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(zone);
    let toNextBoundary = ((60 - zoned.minute) % 60) * MINUTE_MS;
    toNextBoundary -= zoned.second * 1000 + zoned.millisecond;
    if (toNextBoundary < 0) toNextBoundary += HOUR_MS;

    for (let instant = start + toNextBoundary; instant <= end; instant += HOUR_MS) {
      if (instant < axis.startMs || instant >= axis.endMs) continue;
      if (seen.has(instant)) continue;
      seen.add(instant);

      const local = Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(zone);
      labels.push({
        position: positionOf(axis, instant),
        label: formatHourLabel(local.hour, format),
        hour: local.hour,
      });
    }
  }

  return labels;
}

export function buildDayMarkers(zone: ZoneId, axis: TimeAxis, locale?: string): DayMarker[] {
  const markers: DayMarker[] = [];

  for (const date of localDates(zone, axis, 1)) {
    const instant = instantFromWallTime(zone, date, '00:00');
    if (instant < axis.startMs || instant >= axis.endMs) continue;
    markers.push({
      position: positionOf(axis, instant),
      label: formatDayMarker(instant, zone, locale),
    });
  }

  return markers;
}

export function buildDstMarkers(zone: ZoneId, axis: TimeAxis): DstMarker[] {
  return zoneTransitions(zone, axis.startMs, axis.endMs).map((transition) => {
    const delta = transition.afterOffsetMinutes - transition.beforeOffsetMinutes;
    const absolute = Math.abs(delta);
    const amount =
      absolute % 60 === 0
        ? `${String(absolute / 60)} hour${absolute === 60 ? '' : 's'}`
        : `${String(absolute)} minutes`;

    return {
      position: positionOf(axis, transition.instantMs),
      label: `Clocks go ${delta > 0 ? 'forward' : 'back'} ${amount}`,
      direction: delta > 0 ? 'forward' : 'back',
    };
  });
}

export function isWorkingTime(
  zone: ZoneId,
  instantMs: InstantMs,
  workStart: TimeString,
  workEnd: TimeString,
): boolean {
  const zoned = Temporal.Instant.fromEpochMilliseconds(instantMs).toZonedDateTimeISO(zone);
  const minutes = zoned.hour * 60 + zoned.minute;
  const start = parseTime(workStart);
  const end = parseTime(workEnd);

  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export function dayPeriodForHour(hour: number): DayPeriod {
  if (hour >= 5 && hour < 8) return 'early-morning';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

export function buildZoneRow(zone: RowZone, axis: TimeAxis, options: RowOptions): ZoneRowModel {
  const local = Temporal.Instant.fromEpochMilliseconds(options.focusMs).toZonedDateTimeISO(
    zone.timeZone,
  );
  const home = Temporal.Instant.fromEpochMilliseconds(options.focusMs).toZonedDateTimeISO(
    axis.homeZone,
  );
  const sameDate = local.toPlainDate().equals(home.toPlainDate());
  const working = isWorkingTime(zone.timeZone, options.focusMs, options.workStart, options.workEnd);

  return {
    timeZone: zone.timeZone,
    label: zone.label,
    abbreviation: zoneAbbreviation(zone.timeZone, options.focusMs, options.locale),
    offsetMinutes: zoneOffsetMinutes(zone.timeZone, options.focusMs),
    relativeOffsetMinutes: relativeOffsetMinutes(zone.timeZone, axis.homeZone, options.focusMs),
    dst: dstInfo(zone.timeZone, options.focusMs),
    focusedTime: formatTime(
      options.focusMs,
      zone.timeZone,
      options.format,
      options.locale === undefined ? {} : { locale: options.locale },
    ),
    focusedDate: sameDate ? null : formatDayMarker(options.focusMs, zone.timeZone, options.locale),
    focusedPeriod: dayPeriodForHour(local.hour),
    focusedWorking: working,
    bands: buildRowBands(zone.timeZone, axis, options.workStart, options.workEnd),
    hourLabels: buildHourLabels(zone.timeZone, axis, options.format),
    dayMarkers: options.showDateLabels ? buildDayMarkers(zone.timeZone, axis, options.locale) : [],
    dstMarkers: buildDstMarkers(zone.timeZone, axis),
  };
}
