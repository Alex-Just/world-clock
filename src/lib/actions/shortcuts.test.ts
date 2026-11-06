import { expect, it, vi } from 'vitest';
import { installShortcuts } from './shortcuts';

function makeHandlers() {
  return {
    now: vi.fn(),
    nudge: vi.fn(),
    extendRange: vi.fn(),
    shiftWindow: vi.fn(),
    shiftDay: vi.fn(),
    setDayEdge: vi.fn(),
    openAddZone: vi.fn(),
    openSettings: vi.fn(),
    openHelp: vi.fn(),
    resetBoard: vi.fn(),
  };
}

it('maps keys to actions', () => {
  const handlers = makeHandlers();
  const stop = installShortcuts(handlers, window);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
  expect(handlers.now).toHaveBeenCalled();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(handlers.shiftWindow).toHaveBeenCalledWith(6);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  expect(handlers.shiftWindow).toHaveBeenCalledWith(-6);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true }));
  expect(handlers.nudge).toHaveBeenCalledWith(-60);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
  expect(handlers.setDayEdge).toHaveBeenCalledWith('end');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
  expect(handlers.openHelp).toHaveBeenCalled();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(handlers.resetBoard).toHaveBeenCalled();
  stop();
});

it('ignores typing targets and modal dialogs', () => {
  const handlers = makeHandlers();
  const stop = installShortcuts(handlers, window);
  const input = document.createElement('input');
  document.body.append(input);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
  expect(handlers.now).not.toHaveBeenCalled();
  input.remove();

  const dialog = document.createElement('dialog');
  dialog.setAttribute('open', '');
  document.body.append(dialog);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
  expect(handlers.now).not.toHaveBeenCalled();
  dialog.remove();
  stop();
});

it('reads the step size lazily', () => {
  const handlers = makeHandlers();
  let step = 15;
  const stop = installShortcuts(handlers, window, () => step);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
  expect(handlers.extendRange).toHaveBeenLastCalledWith(15);
  step = 30;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
  expect(handlers.extendRange).toHaveBeenLastCalledWith(30);
  stop();
});
