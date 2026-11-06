import { expect, it } from 'vitest';
import { createDefaultSettings } from './defaults';
import { applyAppearance, resolveTheme } from './theme';

it('resolves system theme', () => {
  expect(resolveTheme('system', true)).toBe('dark');
  expect(resolveTheme('system', false)).toBe('light');
  expect(resolveTheme('light', true)).toBe('light');
});

it('writes theme and accent attributes', () => {
  const root = document.createElement('div');
  applyAppearance(
    { ...createDefaultSettings('Europe/Madrid'), theme: 'dark', accent: 'teal' },
    root,
  );
  expect(root.dataset.theme).toBe('dark');
  expect(root.dataset.accent).toBe('teal');
});
