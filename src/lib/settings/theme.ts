import type { Accent, Settings, Theme } from './types';

export const ACCENTS: Array<{ id: Accent; label: string; swatch: string }> = [
  { id: 'blue', label: 'Blue', swatch: 'bg-blue-600' },
  { id: 'teal', label: 'Teal', swatch: 'bg-teal-600' },
  { id: 'violet', label: 'Violet', swatch: 'bg-violet-600' },
  { id: 'amber', label: 'Amber', swatch: 'bg-amber-600' },
  { id: 'rose', label: 'Rose', swatch: 'bg-rose-600' },
  { id: 'green', label: 'Green', swatch: 'bg-green-600' },
];

export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

export function applyAppearance(
  settings: Settings,
  root: HTMLElement = document.documentElement,
  prefersDark = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches,
): void {
  root.dataset.theme = resolveTheme(settings.theme, prefersDark);
  root.dataset.accent = settings.accent;
}
