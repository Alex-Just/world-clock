import { fireEvent } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import { horizontalDrag } from './pointerDrag';

it('cancels a drag when a move arrives without a pressed button', async () => {
  const node = document.createElement('div');
  document.body.append(node);
  const onMove = vi.fn();
  const onEnd = vi.fn();
  const action = horizontalDrag(node, { onMove, onEnd, thresholdPx: 0 });

  await fireEvent.pointerDown(node, {
    clientX: 10,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
  });
  await fireEvent.pointerMove(window, {
    clientX: 30,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 0,
  });
  await fireEvent.pointerUp(window, {
    clientX: 50,
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 0,
  });

  expect(onMove).not.toHaveBeenCalled();
  expect(onEnd).not.toHaveBeenCalled();

  action.destroy();
  node.remove();
});
