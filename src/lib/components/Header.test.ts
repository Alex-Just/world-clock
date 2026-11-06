import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import Header from './Header.svelte';

const baseProps = {
  focusMs: Date.parse('2026-11-05T13:32:08Z'),
  homeZone: 'Europe/Madrid',
  zoneLabel: 'Madrid',
  format: '24h' as const,
  followNow: false,
  onNow: vi.fn(),
  onOpenSetTime: vi.fn(),
  onOpenDuration: vi.fn(),
  onOpenAddZone: vi.fn(),
  onOpenSettings: vi.fn(),
};

it('shows the focused time and relative badge', () => {
  render(Header, { props: { ...baseProps, nowMs: Date.parse('2026-11-05T11:32:08Z') } });
  expect(screen.getByText('14:32:08')).toBeInTheDocument();
  expect(screen.getByText('in 2h')).toBeInTheDocument();
});

it('wires the header actions', async () => {
  render(Header, { props: { ...baseProps, nowMs: baseProps.focusMs } });
  await fireEvent.click(screen.getByRole('button', { name: /now/i }));
  expect(baseProps.onNow).toHaveBeenCalled();
});
