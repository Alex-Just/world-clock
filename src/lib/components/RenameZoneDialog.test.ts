import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import RenameZoneDialog from './RenameZoneDialog.svelte';

it('blocks an empty name and emits a trimmed name', async () => {
  const onRename = vi.fn();
  render(RenameZoneDialog, {
    props: {
      open: true,
      zone: { timeZone: 'Asia/Tokyo', label: 'Tokyo' },
      onRename,
      onClose: vi.fn(),
    },
  });
  const input = screen.getByLabelText(/name/i);
  await fireEvent.input(input, { target: { value: '   ' } });
  expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  await fireEvent.input(input, { target: { value: '  Tokyo HQ  ' } });
  await fireEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(onRename).toHaveBeenCalledWith('Tokyo HQ');
});
