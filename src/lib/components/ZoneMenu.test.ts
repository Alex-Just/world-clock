import { render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import ZoneMenu from './ZoneMenu.svelte';

it('disables remove for the home zone', () => {
  render(ZoneMenu, {
    props: {
      zone: { timeZone: 'Europe/Madrid', label: 'Madrid' },
      isHome: true,
      canMoveUp: false,
      canMoveDown: true,
      onSetHome: vi.fn(),
      onRename: vi.fn(),
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onRemove: vi.fn(),
      onClose: vi.fn(),
    },
  });
  expect(screen.getByRole('menuitem', { name: /remove/i })).toBeDisabled();
  expect(screen.getByRole('menuitem', { name: /set as home/i })).toBeDisabled();
});
