import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import Toast from './Toast.svelte';

it('runs the undo action', async () => {
  const onAction = vi.fn();
  render(Toast, {
    props: { message: 'Removed Tokyo', actionLabel: 'Undo', onAction, onDismiss: vi.fn() },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onAction).toHaveBeenCalled();
});
