<script lang="ts">
  import type { ZoneSetting } from '$lib/settings/types';

  let {
    anchor,
    zone,
    isHome,
    canMoveUp,
    canMoveDown,
    onSetHome,
    onRename,
    onMoveUp,
    onMoveDown,
    onRemove,
    onClose,
  }: {
    anchor: HTMLElement;
    zone: ZoneSetting;
    isHome: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onSetHome: () => void;
    onRename: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    onClose: () => void;
  } = $props();

  let menuEl = $state<HTMLDivElement>();
  const supportsPopover =
    typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

  function positionMenu(): void {
    if (!menuEl) return;
    const anchorRect = anchor.getBoundingClientRect();
    const width = menuEl.offsetWidth || 192;
    const height = menuEl.offsetHeight || 0;
    const margin = 8;
    const gap = 4;
    const left = Math.min(
      window.innerWidth - width - margin,
      Math.max(margin, anchorRect.right - width),
    );
    let top = anchorRect.bottom + gap;
    if (height > 0 && top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - height - gap);
    }
    menuEl.style.left = `${left.toFixed(1)}px`;
    menuEl.style.top = `${top.toFixed(1)}px`;
  }

  function closeOnOutside(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menuEl?.contains(target) || anchor.contains(target)) return;
    onClose();
  }

  function closeOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
    anchor.focus();
  }

  $effect(() => {
    const element = menuEl;
    if (!element) return;

    if (typeof element.showPopover === 'function') {
      try {
        element.showPopover();
      } catch {
        // Already open.
      }
    }
    positionMenu();

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  });
</script>

<div
  bind:this={menuEl}
  popover={supportsPopover ? 'manual' : undefined}
  role="menu"
  aria-label={`Actions for ${zone.label}`}
  class="border-border bg-surface-raised fixed inset-auto z-50 m-0 max-h-[calc(100vh-1rem)] w-48 overflow-y-auto rounded-xl border p-1 shadow-xl"
>
  <div class="px-2 py-1.5">
    <p class="text-text truncate text-xs font-medium">{zone.label}</p>
    <p class="text-muted truncate text-[10px]">{zone.timeZone}</p>
  </div>

  <button
    type="button"
    role="menuitem"
    disabled={isHome}
    onclick={() => {
      onSetHome();
      onClose();
    }}
    class="text-text hover:bg-surface block w-full rounded-lg px-2 py-1.5 text-left text-xs disabled:opacity-40"
  >
    Set as home
  </button>
  <button
    type="button"
    role="menuitem"
    onclick={() => {
      onRename();
      onClose();
    }}
    class="text-text hover:bg-surface block w-full rounded-lg px-2 py-1.5 text-left text-xs"
  >
    Rename
  </button>
  <button
    type="button"
    role="menuitem"
    disabled={!canMoveUp}
    onclick={() => {
      onMoveUp();
      onClose();
    }}
    class="text-text hover:bg-surface block w-full rounded-lg px-2 py-1.5 text-left text-xs disabled:opacity-40"
  >
    Move up
  </button>
  <button
    type="button"
    role="menuitem"
    disabled={!canMoveDown}
    onclick={() => {
      onMoveDown();
      onClose();
    }}
    class="text-text hover:bg-surface block w-full rounded-lg px-2 py-1.5 text-left text-xs disabled:opacity-40"
  >
    Move down
  </button>
  <button
    type="button"
    role="menuitem"
    disabled={isHome}
    onclick={() => {
      onRemove();
      onClose();
    }}
    class="hover:bg-surface block w-full rounded-lg px-2 py-1.5 text-left text-xs text-rose-700 disabled:opacity-40 dark:text-rose-300"
  >
    Remove
  </button>
</div>
