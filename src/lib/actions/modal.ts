export function modal(node: HTMLDialogElement) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (typeof node.showModal === 'function') {
    try {
      if (node.hasAttribute('open')) node.removeAttribute('open');
      node.showModal();
    } catch {
      node.setAttribute('open', '');
    }
  }

  return {
    destroy() {
      try {
        if (node.open) node.close();
      } catch {
        // Test environments may omit close().
      }
      previous?.focus();
    },
  };
}
