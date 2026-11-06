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

  const releaseCapture = () => {
    if (typeof node.releasePointerCapture === 'function' && pointerId !== undefined) {
      try {
        node.releasePointerCapture(pointerId);
      } catch {
        // Capture is optional.
      }
    }
  };

  const cancelActive = () => {
    if (!active) return;
    active = false;
    stopWindowListeners();
    releaseCapture();
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
    if (event.buttons === 0) {
      cancelActive();
      return;
    }
    if (Math.abs(event.clientX - startX) > threshold) moved = true;
    handlers.onMove(event.clientX, event);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!active) return;
    active = false;
    stopWindowListeners();
    releaseCapture();

    handlers.onEnd?.(event.clientX, event);
    if (!moved) handlers.onClick?.(event.clientX, event);
  };

  const onLostPointerCapture = () => {
    cancelActive();
  };

  const onWindowBlur = () => {
    cancelActive();
  };

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('lostpointercapture', onLostPointerCapture);
  window.addEventListener('blur', onWindowBlur);

  return {
    destroy() {
      cancelActive();
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('lostpointercapture', onLostPointerCapture);
      window.removeEventListener('blur', onWindowBlur);
    },
    update(next: HorizontalDragHandlers) {
      handlers = next;
      threshold = next.thresholdPx ?? 3;
    },
  };
}
