import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import Header from './Header.svelte';

const baseProps = {
  focusMs: Date.parse('2026-11-05T13:32:08Z'),
  homeZone: 'Europe/Madrid',
  zoneLabel: 'Madrid',
  format: '24h' as const,
  followNow: false,
  windowOffsetHours: 0,
  onNow: vi.fn(),
  onOpenSetTime: vi.fn(),
  onOpenDuration: vi.fn(),
  onOpenAddZone: vi.fn(),
  onOpenSettings: vi.fn(),
  onShiftWindow: vi.fn(),
  onResetWindow: vi.fn(),
};

it('shows the focused time and relative badge', () => {
  render(Header, { props: { ...baseProps, nowMs: Date.parse('2026-11-05T11:32:08Z') } });
  expect(screen.getByText('14:32:08')).toBeInTheDocument();
  expect(screen.getByTestId('relative-badge')).toHaveTextContent('in 2h');
  expect(screen.getByTestId('relative-badge')).toHaveTextContent('from Nov 5, 2026');
});

it('shows a calendar breakdown and source for distant dates', () => {
  render(Header, {
    props: {
      ...baseProps,
      focusMs: Date.parse('1985-03-14T12:00:00Z'),
      nowMs: Date.parse('2026-11-05T12:00:00Z'),
    },
  });
  const badge = screen.getByTestId('relative-badge');
  expect(badge).toHaveTextContent(/\d+y/);
  expect(badge).toHaveTextContent(/\d+mo/);
  expect(badge).toHaveTextContent('total');
  expect(badge).toHaveTextContent('from Nov 5, 2026');
  expect(screen.getByTestId('relative-live')).toHaveTextContent('total');
  expect(screen.getByTestId('relative-live')).toHaveTextContent('From Nov 5, 2026');
});

it('wires the header actions', async () => {
  render(Header, { props: { ...baseProps, nowMs: baseProps.focusMs } });
  await fireEvent.click(screen.getByRole('button', { name: /now/i }));
  expect(baseProps.onNow).toHaveBeenCalled();
});

it('shifts the visible window from the header', async () => {
  const onShiftWindow = vi.fn();
  const onResetWindow = vi.fn();
  render(Header, {
    props: {
      ...baseProps,
      nowMs: baseProps.focusMs,
      windowOffsetHours: 6,
      onShiftWindow,
      onResetWindow,
    },
  });

  await fireEvent.click(screen.getByRole('button', { name: 'Show previous 6 hours' }));
  expect(onShiftWindow).toHaveBeenCalledWith(-6);
  await fireEvent.click(screen.getByRole('button', { name: 'Show next 6 hours' }));
  expect(onShiftWindow).toHaveBeenCalledWith(6);
  await fireEvent.click(screen.getByRole('button', { name: 'Reset visible window' }));
  expect(onResetWindow).toHaveBeenCalled();
});

it('disables the window control at its limit', () => {
  render(Header, {
    props: {
      ...baseProps,
      nowMs: baseProps.focusMs,
      windowOffsetHours: -18,
    },
  });
  expect(screen.getByRole('button', { name: 'Show previous 6 hours' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Show next 6 hours' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Reset visible window' })).toBeEnabled();
});

it('reserves but hides the relative badge when it would only say now', () => {
  render(Header, {
    props: { ...baseProps, nowMs: baseProps.focusMs, followNow: true },
  });
  const badge = screen.getByTestId('relative-badge');
  expect(badge).toHaveClass('invisible');
  expect(badge).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByTestId('relative-live')).toHaveTextContent('');
});

it('hides the relative badge for a near-now focus', () => {
  render(Header, {
    props: {
      ...baseProps,
      nowMs: baseProps.focusMs - 30_000,
      followNow: false,
    },
  });
  expect(screen.getByTestId('relative-badge')).toHaveClass('invisible');
});
