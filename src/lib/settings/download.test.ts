import { expect, it, vi } from 'vitest';
import { downloadJson } from './download';

it('creates and revokes a blob URL', () => {
  const create = vi.fn(() => 'blob:test');
  const revoke = vi.fn();
  const click = vi.fn();
  vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: revoke });
  const anchor = document.createElement('a');
  vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor);
  anchor.click = click;

  downloadJson('world-clock.json', '{"ok":true}');

  expect(create).toHaveBeenCalled();
  expect(anchor.download).toBe('world-clock.json');
  expect(click).toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith('blob:test');
});
