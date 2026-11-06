import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import AddZoneDialog from './AddZoneDialog.svelte';
import { createDefaultSettings } from '$lib/settings/defaults';

it('search ranks and disables already-added zones', async () => {
  const settings = createDefaultSettings('Europe/Madrid');
  render(AddZoneDialog, {
    props: { open: true, zones: settings.zones, onAdd: vi.fn(), onClose: vi.fn() },
  });
  await fireEvent.input(screen.getByRole('combobox', { name: /search/i }), {
    target: { value: 'new york' },
  });
  const option = screen.getByRole('option', { name: /new york/i });
  expect(option).toHaveAttribute('aria-disabled', 'true');
});

it('adds the top result with Enter', async () => {
  const onAdd = vi.fn();
  const settings = createDefaultSettings('Europe/Madrid');
  settings.zones = settings.zones.filter((zone) => zone.timeZone !== 'Asia/Kathmandu');
  render(AddZoneDialog, {
    props: { open: true, zones: settings.zones, onAdd, onClose: vi.fn() },
  });
  const input = screen.getByRole('combobox', { name: /search/i });
  await fireEvent.input(input, { target: { value: 'kathmandu' } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  expect(onAdd).toHaveBeenCalledWith('Asia/Kathmandu');
});

it('closes on Escape', async () => {
  const onClose = vi.fn();
  render(AddZoneDialog, {
    props: { open: true, zones: [], onAdd: vi.fn(), onClose },
  });
  await fireEvent.keyDown(screen.getByRole('combobox', { name: /search/i }), { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
