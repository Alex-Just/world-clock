export interface HorizontalDragHandlers {
  onStart?: (event: PointerEvent) => void;
  onMove: (clientX: number, event: PointerEvent) => void;
  onEnd?: (clientX: number, event: PointerEvent) => void;
  onClick?: (clientX: number, event: PointerEvent) => void;
  thresholdPx?: number;
}

export function horizontalDrag(node: HTMLElement, initial: HorizontalDragHandlers) {
  let handlers = initial;
  let active = false;
  let moved = false;
  let startX = 0;
  let threshold = handlers.thresholdPx ?? 3;
  let pointerId: number | undefined;

  const stopWindowListeners = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    active = true;
    moved = false;
    startX = event.clientX;
    pointerId = event.pointerId;
    handlers.onStart?.(event);

    if (typeof node.setPointerCapture === 'function') {
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // Capture is optional.
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!active) return;
    if (Math.abs(event.clientX - startX) > threshold) moved = true;
    handlers.onMove(event.clientX, event);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!active) return;
    active = false;
    stopWindowListeners();

    if (typeof node.releasePointerCapture === 'function') {
      try {
        node.releasePointerCapture(pointerId ?? event.pointerId);
      } catch {
        // See above.
      }
    }

    handlers.onEnd?.(event.clientX, event);
    if (!moved) handlers.onClick?.(event.clientX, event);
  };

  node.addEventListener('pointerdown', onPointerDown);

  return {
    destroy() {
      stopWindowListeners();
      node.removeEventListener('pointerdown', onPointerDown);
    },
    update(next: HorizontalDragHandlers) {
      handlers = next;
      threshold = next.thresholdPx ?? 3;
    },
  };
}
