export interface ShortcutHandlers {
  now: () => void;
  nudge: (minutes: number) => void;
  extendRange: (minutes: number) => void;
  shiftDay: (days: number) => void;
  setDayEdge: (edge: 'start' | 'end') => void;
  openAddZone: () => void;
  openSettings: () => void;
  openHelp: () => void;
  clearRange: () => void;
}

export function installShortcuts(
  handlers: ShortcutHandlers,
  target: Window = window,
  stepMinutes: number | (() => number) = 15,
): () => void {
  const currentStep = (): number =>
    typeof stepMinutes === 'function' ? stepMinutes() : stepMinutes;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;

    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (document.querySelector('dialog[open], [role="dialog"]')) return;

    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      handlers.openAddZone();
      return;
    }
    if (mod && event.key === ',') {
      event.preventDefault();
      handlers.openSettings();
      return;
    }
    if (mod) return;

    switch (event.key) {
      case 't':
      case 'T':
        handlers.now();
        break;
      case 'ArrowLeft':
        if (event.shiftKey) handlers.extendRange(-currentStep());
        else handlers.nudge(event.altKey ? -60 : -currentStep());
        break;
      case 'ArrowRight':
        if (event.shiftKey) handlers.extendRange(currentStep());
        else handlers.nudge(event.altKey ? 60 : currentStep());
        break;
      case 'PageUp':
        handlers.shiftDay(-1);
        break;
      case 'PageDown':
        handlers.shiftDay(1);
        break;
      case 'Home':
        handlers.setDayEdge('start');
        break;
      case 'End':
        handlers.setDayEdge('end');
        break;
      case '[':
        handlers.shiftDay(-1);
        break;
      case ']':
        handlers.shiftDay(1);
        break;
      case '?':
        handlers.openHelp();
        break;
      case 'Escape':
        handlers.clearRange();
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  target.addEventListener('keydown', onKeyDown);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
  };
}
