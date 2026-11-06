import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import DayStrip from './DayStrip.svelte';

it('renders seven days and marks the selected date', () => {
  render(DayStrip, {
    props: {
      viewDate: '2026-11-05',
      homeZone: 'Europe/Madrid',
      onSelectDate: vi.fn(),
      onShiftDay: vi.fn(),
      onToday: vi.fn(),
    },
  });
  expect(screen.getAllByRole('button', { name: /2026/ })).toHaveLength(7);
  expect(screen.getByRole('button', { name: /Thu 5/ })).toHaveAttribute('aria-current', 'date');
});

it('moves to the previous and next day', async () => {
  const onShiftDay = vi.fn();
  render(DayStrip, {
    props: {
      viewDate: '2026-11-05',
      homeZone: 'Europe/Madrid',
      onSelectDate: vi.fn(),
      onShiftDay,
      onToday: vi.fn(),
    },
  });
  await fireEvent.click(screen.getByRole('button', { name: /previous day/i }));
  expect(onShiftDay).toHaveBeenCalledWith(-1);
});
