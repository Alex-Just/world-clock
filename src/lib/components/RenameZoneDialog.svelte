<script lang="ts">
  import { modal } from '$lib/actions/modal';
  import { untrack } from 'svelte';
  import type { ZoneSetting } from '$lib/settings/types';

  let {
    open,
    zone,
    onRename,
    onClose,
  }: {
    open: boolean;
    zone: ZoneSetting;
    onRename: (label: string) => void;
    onClose: () => void;
  } = $props();

  let label = $state(untrack(() => zone.label));
  const trimmed = $derived(label.trim());

  function save(): void {
    if (!trimmed) return;
    onRename(trimmed);
    onClose();
  }
</script>

{#if open}
  <dialog
    open
    use:modal
    aria-labelledby="rename-zone-title"
    oncancel={(event) => {
      event.preventDefault();
      onClose();
    }}
    class="border-border bg-surface-raised text-text m-auto w-[min(420px,calc(100vw-2rem))] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40"
  >
    <div class="p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="rename-zone-title" class="text-xl font-semibold">Edit zone</h2>
          <p class="text-muted mt-0.5 text-sm">{zone.timeZone}</p>
        </div>
        <button
          type="button"
          aria-label="Close edit"
          onclick={() => {
            onClose();
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-10 items-center justify-center rounded-lg"
        >
          <span class="text-2xl" aria-hidden="true">×</span>
        </button>
      </div>

      <label class="text-muted mt-3 block text-xs">
        Display name
        <input
          type="text"
          maxlength="40"
          bind:value={label}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
          }}
          class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
        />
      </label>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => {
            onClose();
          }}
          class="border-border text-text hover:bg-surface h-10 rounded-lg border px-3 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!trimmed}
          onclick={save}
          class="bg-accent text-accent-contrast hover:bg-accent/90 h-10 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  </dialog>
{/if}
