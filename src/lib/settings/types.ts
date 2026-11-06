import type { TimeFormat } from '$lib/time/types';

export type Theme = 'system' | 'light' | 'dark';
export type Accent = 'blue' | 'teal' | 'violet' | 'amber' | 'rose' | 'green';
export type StepMinutes = 5 | 15 | 30 | 60;

export interface ZoneSetting {
  timeZone: string;
  label: string;
}

export interface Settings {
  theme: Theme;
  accent: Accent;
  timeFormat: TimeFormat;
  showIana: boolean;
  showAbbreviation: boolean;
  showUtcOffset: boolean;
  showDst: boolean;
  showDateLabels: boolean;
  showWorkingHours: boolean;
  workStart: string;
  workEnd: string;
  stepMinutes: StepMinutes;
  homeZone: string;
  zones: ZoneSetting[];
}

export interface PersistedV1 {
  version: 1;
  settings: Settings;
}

export type StorageLoadSource = 'default' | 'stored' | 'recovered';
