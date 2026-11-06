import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import DurationDialog from './DurationDialog.svelte';
import { createDefaultSettings } from '$lib/settings/defaults';
import { normalizeRange } from '$lib/time/range';

const at = (iso: string) => Date.parse(iso);
const settings = createDefaultSettings('Europe/Madrid');
const range = normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-05T15:00:00Z'));

it('shows elapsed duration and per-zone rows', () => {
  render(DurationDialog, {
    props: {
      open: true,
      range,
      zones: settings.zones,
      settings,
      onApply: vi.fn(),
      onClose: vi.fn(),
    },
  });
  expect(screen.getByRole('dialog', { name: /duration/i })).toBeInTheDocument();
  expect(screen.getByText('6h')).toBeInTheDocument();
  expect(screen.getByText('Madrid')).toBeInTheDocument();
  expect(screen.getByText('New York')).toBeInTheDocument();
});

it('applies an edited start and end', async () => {
  const onApply = vi.fn();
  render(DurationDialog, {
    props: { open: true, range, zones: settings.zones, settings, onApply, onClose: vi.fn() },
  });
  await fireEvent.input(screen.getByLabelText(/start time/i), { target: { value: '10:00' } });
  await fireEvent.click(screen.getByRole('button', { name: /apply/i }));
  expect(onApply).toHaveBeenCalled();
});

it('warns for multi-day spans', () => {
  render(DurationDialog, {
    props: {
      open: true,
      range: normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-07T09:00:00Z')),
      zones: settings.zones,
      settings,
      onApply: vi.fn(),
      onClose: vi.fn(),
    },
  });
  expect(screen.getByText(/multi-day/i)).toBeInTheDocument();
});
