<script lang="ts">
  import { modal } from '$lib/actions/modal';

  let { open, onClose }: { open: boolean; onClose: () => void } = $props();

  const shortcuts = [
    ['T', 'Jump to now'],
    ['← / →', 'Move focus by the selection step'],
    ['Alt + ← / →', 'Move focus by one hour'],
    ['Shift + ← / →', 'Extend or shrink the range'],
    ['Page Up / Page Down', 'Previous or next day'],
    ['Home / End', 'Start or end of the visible day'],
    ['[ / ]', 'Previous or next day'],
    ['Cmd/Ctrl + K', 'Add a time zone'],
    ['Cmd/Ctrl + ,', 'Open settings'],
    ['?', 'Show this help'],
    ['Esc', 'Clear the range; press again for Now'],
  ];
</script>

{#if open}
  <dialog
    open
    use:modal
    aria-labelledby="shortcuts-title"
    oncancel={(event) => {
      event.preventDefault();
      onClose();
    }}
    class="border-border bg-surface-raised text-text m-auto w-[min(520px,calc(100vw-2rem))] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40"
  >
    <div class="p-4">
      <div class="flex items-start justify-between gap-3">
        <h2 id="shortcuts-title" class="text-xl font-semibold">Keyboard shortcuts</h2>
        <button
          type="button"
          aria-label="Close shortcuts"
          onclick={() => {
            onClose();
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-10 items-center justify-center rounded-lg"
        >
          <span class="text-2xl" aria-hidden="true">×</span>
        </button>
      </div>

      <dl class="mt-3 grid gap-2 text-sm">
        {#each shortcuts as [keys, description] (keys)}
          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-text font-mono text-sm">{keys}</dt>
            <dd class="text-muted text-right">{description}</dd>
          </div>
        {/each}
      </dl>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          onclick={() => {
            onClose();
          }}
          class="border-border text-text hover:bg-surface h-10 rounded-lg border px-3 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  </dialog>
{/if}
