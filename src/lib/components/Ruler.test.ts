import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import Ruler from './Ruler.svelte';
import { buildAxis } from '$lib/time/axis';

const at = (iso: string) => Date.parse(iso);
const axis = buildAxis('Europe/Madrid', '2026-11-05', '24h');
const baseProps = {
  axis,
  focusMs: at('2026-11-05T12:00:00Z'),
  nowMs: at('2026-11-05T12:00:00Z'),
  range: null,
  format: '24h' as const,
  stepMinutes: 15,
  homeZone: 'Europe/Madrid',
  zoneLabel: 'Madrid',
  onSetFocus: vi.fn(),
  onNow: vi.fn(),
  onSetRange: vi.fn(),
  onRangeChange: vi.fn(),
  onExtendRange: vi.fn(),
  onClearRange: vi.fn(),
};

it('exposes the focus as a slider with an accessible value', () => {
  render(Ruler, { props: baseProps });
  const slider = screen.getByRole('slider', { name: /focus time/i });
  expect(slider).toHaveAttribute('aria-valuenow', String(baseProps.focusMs - axis.startMs));
  expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('13:00'));
});

it('nudges focus with arrows and alt-arrows', async () => {
  const onSetFocus = vi.fn();
  render(Ruler, { props: { ...baseProps, onSetFocus } });
  const slider = screen.getByRole('slider', { name: /focus time/i });
  await fireEvent.keyDown(slider, { key: 'ArrowRight' });
  expect(onSetFocus).toHaveBeenLastCalledWith(baseProps.focusMs + 15 * 60_000);
  await fireEvent.keyDown(slider, { key: 'ArrowLeft', altKey: true });
  expect(onSetFocus).toHaveBeenLastCalledWith(baseProps.focusMs - 60 * 60_000);
});

it('jumps to now with T and to day edges with Home/End', async () => {
  const onSetFocus = vi.fn();
  const onNow = vi.fn();
  render(Ruler, { props: { ...baseProps, onSetFocus, onNow } });
  const slider = screen.getByRole('slider', { name: /focus time/i });
  await fireEvent.keyDown(slider, { key: 't' });
  expect(onNow).toHaveBeenCalled();
  await fireEvent.keyDown(slider, { key: 'Home' });
  expect(onSetFocus).toHaveBeenLastCalledWith(axis.startMs);
  await fireEvent.keyDown(slider, { key: 'End' });
  expect(onSetFocus).toHaveBeenLastCalledWith(axis.endMs);
});

it('sets focus from a click on the ruler surface', async () => {
  const onSetFocus = vi.fn();
  render(Ruler, { props: { ...baseProps, onSetFocus } });
  const surface = screen.getByTestId('ruler-surface');
  surface.getBoundingClientRect = () => ({
    left: 0,
    width: 1000,
    top: 0,
    height: 32,
    right: 1000,
    bottom: 32,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  await fireEvent.pointerDown(surface, { clientX: 500, pointerId: 1, pointerType: 'mouse' });
  await fireEvent.pointerUp(surface, { clientX: 500, pointerId: 1, pointerType: 'mouse' });
  expect(onSetFocus).toHaveBeenCalledWith(axis.startMs + axis.durationMs / 2);
});
