import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import FocusReadout from './FocusReadout.svelte';

const at = (iso: string) => Date.parse(iso);
const now = at('2026-11-05T12:00:00Z');

const baseProps = {
  nowMs: now,
  homeZone: 'Europe/Madrid',
  zoneLabel: 'Madrid',
  format: '24h' as const,
  onOpen: () => {},
};

it('omits the target year when it matches the current year', () => {
  render(FocusReadout, {
    props: { ...baseProps, focusMs: at('2026-11-20T12:00:00Z') },
  });
  expect(screen.getByText(/Fri, Nov 20 · Madrid/)).toBeInTheDocument();
});

it('shows the target year when it differs from the current year', () => {
  render(FocusReadout, {
    props: { ...baseProps, focusMs: at('1985-03-14T12:00:00Z') },
  });
  expect(screen.getByText(/Thu, Mar 14 · Madrid/)).toBeInTheDocument();
  expect(screen.getByText('1985')).toBeInTheDocument();
});
