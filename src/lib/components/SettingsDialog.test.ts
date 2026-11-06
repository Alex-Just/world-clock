import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import SettingsDialog from './SettingsDialog.svelte';
import { createDefaultSettings } from '$lib/settings/defaults';
import { exportSettings } from '$lib/settings/storage';

const settings = createDefaultSettings('Europe/Madrid');

it('updates theme and accent', async () => {
  const onUpdate = vi.fn();
  render(SettingsDialog, {
    props: {
      open: true,
      settings,
      onUpdate,
      onReplace: vi.fn(),
      onAddZone: vi.fn(),
      onClose: vi.fn(),
    },
  });
  await fireEvent.click(screen.getByLabelText(/dark/i));
  expect(onUpdate).toHaveBeenCalledWith({ theme: 'dark' });
  await fireEvent.click(screen.getByRole('button', { name: /teal/i }));
  expect(onUpdate).toHaveBeenCalledWith({ accent: 'teal' });
});

it('rejects equal working hours', async () => {
  const onUpdate = vi.fn();
  render(SettingsDialog, {
    props: {
      open: true,
      settings,
      onUpdate,
      onReplace: vi.fn(),
      onAddZone: vi.fn(),
      onClose: vi.fn(),
    },
  });
  await fireEvent.input(screen.getByLabelText(/start/i), { target: { value: '09:00' } });
  await fireEvent.input(screen.getByLabelText(/end/i), { target: { value: '09:00' } });
  expect(screen.getByText(/start and end must differ/i)).toBeInTheDocument();
  expect(onUpdate).not.toHaveBeenCalledWith(
    expect.objectContaining({ workStart: '09:00', workEnd: '09:00' }),
  );
});

it('accepts an overnight window', async () => {
  const onUpdate = vi.fn();
  render(SettingsDialog, {
    props: {
      open: true,
      settings,
      onUpdate,
      onReplace: vi.fn(),
      onAddZone: vi.fn(),
      onClose: vi.fn(),
    },
  });
  await fireEvent.input(screen.getByLabelText(/start/i), { target: { value: '20:00' } });
  await fireEvent.input(screen.getByLabelText(/end/i), { target: { value: '04:00' } });
  await fireEvent.click(screen.getByRole('button', { name: /save working hours/i }));
  expect(onUpdate).toHaveBeenCalledWith({ workStart: '20:00', workEnd: '04:00' });
});

it('routes home zone changes through the dedicated action', async () => {
  const onSetHome = vi.fn();
  render(SettingsDialog, {
    props: {
      open: true,
      settings,
      onUpdate: vi.fn(),
      onReplace: vi.fn(),
      onAddZone: vi.fn(),
      onSetHome,
      onClose: vi.fn(),
    },
  });
  await fireEvent.click(screen.getByRole('button', { name: /set new york as home/i }));
  expect(onSetHome).toHaveBeenCalledWith('America/New_York');
});

it('resyncs working hours when settings change', async () => {
  const { rerender } = render(SettingsDialog, {
    props: {
      open: true,
      settings,
      onUpdate: vi.fn(),
      onReplace: vi.fn(),
      onAddZone: vi.fn(),
      onSetHome: vi.fn(),
      onClose: vi.fn(),
    },
  });
  await rerender({
    settings: { ...settings, workStart: '20:00', workEnd: '04:00' },
  });
  expect(screen.getByLabelText<HTMLInputElement>(/start/i).value).toBe('20:00');
  expect(screen.getByLabelText<HTMLInputElement>(/end/i).value).toBe('04:00');
});

it('asks before replacing settings on import', async () => {
  const onReplace = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(SettingsDialog, {
    props: {
      open: true,
      settings,
      onUpdate: vi.fn(),
      onReplace,
      onAddZone: vi.fn(),
      onSetHome: vi.fn(),
      onClose: vi.fn(),
    },
  });
  const file = new File([exportSettings(settings)], 'backup.json', {
    type: 'application/json',
  });
  await fireEvent.change(screen.getByLabelText(/import json/i), {
    target: { files: [file] },
  });
  await vi.waitFor(() => {
    expect(confirm).toHaveBeenCalled();
  });
  expect(onReplace).not.toHaveBeenCalled();
  confirm.mockRestore();
});
