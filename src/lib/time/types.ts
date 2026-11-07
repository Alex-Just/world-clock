export type InstantMs = number;
export type ZoneId = string;
export type DateString = string;
export type TimeString = string;
export type TimeFormat = '24h' | '12h';
export type BandKind = 'day' | 'twilight' | 'night';
export type DayPeriod = 'night' | 'early-morning' | 'morning' | 'afternoon' | 'evening';
export type Availability = 'in' | 'partial' | 'out' | 'multi-day';

export interface DstInfo {
  active: boolean;
  aheadMinutes: number;
}

export interface ZoneSearchResult {
  timeZone: ZoneId;
  label: string;
  offsetMinutes: number;
  abbreviation: string;
  score: number;
}

export interface AxisTick {
  instantMs: InstantMs;
  position: number;
  label: string;
  hour: number;
}

export interface TimeAxis {
  homeZone: ZoneId;
  date: DateString;
  startMs: InstantMs;
  endMs: InstantMs;
  durationMs: number;
  ticks: AxisTick[];
}

export interface ZoneTransition {
  instantMs: InstantMs;
  beforeOffsetMinutes: number;
  afterOffsetMinutes: number;
}

export interface BandSegment {
  start: number;
  end: number;
  kind: BandKind;
}

export interface WorkSegment {
  start: number;
  end: number;
}

export interface RowBands {
  base: BandSegment[];
  work: WorkSegment[];
}

export interface HourLabel {
  position: number;
  label: string;
  hour: number;
}

export interface DayMarker {
  position: number;
  label: string;
}

export interface DstMarker {
  position: number;
  label: string;
  direction: 'forward' | 'back';
}

export interface RowZone {
  timeZone: ZoneId;
  label: string;
}

export interface RowOptions {
  focusMs: InstantMs;
  workStart: TimeString;
  workEnd: TimeString;
  format: TimeFormat;
  showDateLabels: boolean;
  locale?: string;
}

export interface ZoneRowModel {
  timeZone: ZoneId;
  label: string;
  abbreviation: string;
  offsetMinutes: number;
  relativeOffsetMinutes: number;
  dst: DstInfo;
  focusedTime: string;
  focusedDate: string | null;
  focusedPeriod: DayPeriod;
  focusedWorking: boolean;
  bands: RowBands;
  hourLabels: HourLabel[];
  dayMarkers: DayMarker[];
  dstMarkers: DstMarker[];
}

export interface NormalizedRange {
  startMs: InstantMs;
  endMs: InstantMs;
  durationMs: number;
}
