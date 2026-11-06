import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import RangeBar from './RangeBar.svelte';
import Ruler from './Ruler.svelte';
import { createDefaultSettings } from '$lib/settings/defaults';
import { buildAxis } from '$lib/time/axis';
import { normalizeRange } from '$lib/time/range';

const at = (iso: string) => Date.parse(iso);

it('shows duration and availability count', () => {
  const settings = createDefaultSettings('Europe/Madrid');
  render(RangeBar, {
    props: {
      range: normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-05T15:00:00Z')),
      zones: settings.zones,
      settings,
      onClear: vi.fn(),
      onDetails: vi.fn(),
    },
  });
  expect(screen.getAllByText(/6h/).length).toBeGreaterThan(0);
  expect(screen.getByText(/zones in working hours/)).toBeInTheDocument();
});

it('clears and opens details', async () => {
  const onClear = vi.fn();
  const onDetails = vi.fn();
  const settings = createDefaultSettings('Europe/Madrid');
  render(RangeBar, {
    props: {
      range: normalizeRange(at('2026-11-05T09:00:00Z'), at('2026-11-05T15:00:00Z')),
      zones: settings.zones,
      settings,
      onClear,
      onDetails,
    },
  });
  await fireEvent.click(screen.getByRole('button', { name: /clear/i }));
  expect(onClear).toHaveBeenCalled();
  await fireEvent.click(screen.getByRole('button', { name: /details/i }));
  expect(onDetails).toHaveBeenCalled();
});

it('extends a range with Shift+Arrow and clears with Escape', async () => {
  const onExtendRange = vi.fn();
  const onClearRange = vi.fn();
  const axis = buildAxis('Europe/Madrid', '2026-11-05', '24h');
  render(Ruler, {
    props: {
      axis,
      focusMs: at('2026-11-05T12:00:00Z'),
      nowMs: at('2026-11-05T12:00:00Z'),
      range: null,
      format: '24h',
      stepMinutes: 15,
      homeZone: 'Europe/Madrid',
      zoneLabel: 'Madrid',
      onSetFocus: vi.fn(),
      onNow: vi.fn(),
      onSetRange: vi.fn(),
      onRangeChange: vi.fn(),
      onExtendRange,
      onClearRange,
    },
  });
  const slider = screen.getByRole('slider', { name: /focus time/i });
  await fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
  expect(onExtendRange).toHaveBeenCalledWith(15);
  await fireEvent.keyDown(slider, { key: 'Escape' });
  expect(onClearRange).toHaveBeenCalled();
});
