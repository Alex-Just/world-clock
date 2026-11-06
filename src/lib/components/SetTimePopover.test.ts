import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import SetTimePopover from './SetTimePopover.svelte';

const at = (iso: string) => Date.parse(iso);

it('applies an exact wall time in a chosen zone', async () => {
  const onApply = vi.fn();
  render(SetTimePopover, {
    props: {
      open: true,
      focusMs: at('2026-11-05T12:00:00Z'),
      homeZone: 'Europe/Madrid',
      onApply,
      onClose: vi.fn(),
    },
  });
  await fireEvent.input(screen.getByLabelText('Date'), { target: { value: '2026-11-06' } });
  await fireEvent.input(screen.getByLabelText('Time'), { target: { value: '15:30' } });
  await fireEvent.click(screen.getByRole('button', { name: /apply/i }));
  expect(onApply).toHaveBeenCalledWith(at('2026-11-06T14:30:00Z'));
});

it('resolves a skipped DST time to the gap end', async () => {
  const onApply = vi.fn();
  render(SetTimePopover, {
    props: {
      open: true,
      focusMs: at('2026-03-08T12:00:00Z'),
      homeZone: 'America/New_York',
      onApply,
      onClose: vi.fn(),
    },
  });
  await fireEvent.input(screen.getByLabelText('Date'), { target: { value: '2026-03-08' } });
  await fireEvent.input(screen.getByLabelText('Time'), { target: { value: '02:30' } });
  await fireEvent.click(screen.getByRole('button', { name: /apply/i }));
  expect(onApply).toHaveBeenCalledWith(at('2026-03-08T07:00:00Z'));
});

it('applies relative hours from now', async () => {
  const onApply = vi.fn();
  render(SetTimePopover, {
    props: {
      open: true,
      focusMs: at('2026-11-05T12:00:00Z'),
      homeZone: 'Europe/Madrid',
      onApply,
      onClose: vi.fn(),
    },
  });
  await fireEvent.click(screen.getByRole('tab', { name: /relative/i }));
  await fireEvent.input(screen.getByLabelText(/amount/i), { target: { value: '3' } });
  await fireEvent.click(screen.getByRole('button', { name: /apply/i }));
  expect(onApply).toHaveBeenCalledWith(at('2026-11-05T15:00:00Z'));
});
