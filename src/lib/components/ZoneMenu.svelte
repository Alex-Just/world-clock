<script lang="ts">
  import type { ZoneSetting } from '$lib/settings/types';

  let {
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
</script>

<div
  role="menu"
  aria-label={`Actions for ${zone.label}`}
  class="border-border bg-surface-raised absolute top-full right-0 z-50 mt-1 w-48 rounded-xl border p-1 shadow-xl"
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
    class="hover:bg-surface block w-full rounded-lg px-2 py-1.5 text-left text-xs text-rose-600 disabled:opacity-40 dark:text-rose-400"
  >
    Remove
  </button>
</div>
