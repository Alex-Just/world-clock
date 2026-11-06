<script lang="ts">
  import { modal } from '$lib/actions/modal';
  import { formatOffset } from '$lib/time/format';
  import { searchZones } from '$lib/time/zones';
  import type { ZoneSetting } from '$lib/settings/types';

  let {
    open,
    zones,
    onAdd,
    onClose,
  }: {
    open: boolean;
    zones: ZoneSetting[];
    onAdd: (timeZone: string) => void;
    onClose: () => void;
  } = $props();

  let query = $state('');
  let activeIndex = $state(0);
  let status = $state('');
  let searchInput: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (open) searchInput?.focus();
  });

  const added = $derived(new Set(zones.map((zone) => zone.timeZone)));
  const results = $derived(searchZones(query, 'en-US').slice(0, 50));

  function add(timeZone: string): void {
    if (added.has(timeZone)) return;
    status = 'Zone added';
    onAdd(timeZone);
    onClose();
  }

  function move(delta: number): void {
    if (results.length === 0) return;
    let next = activeIndex;
    for (let step = 0; step < results.length; step += 1) {
      next = (next + delta + results.length) % results.length;
      const candidate = results[next];
      if (candidate && !added.has(candidate.timeZone)) {
        activeIndex = next;
        return;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) add(result.timeZone);
    }
  }
</script>

{#if open}
  <dialog
    open
    use:modal
    aria-labelledby="add-zone-title"
    oncancel={(event) => {
      event.preventDefault();
      onClose();
    }}
    class="border-border bg-surface-raised text-text m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40"
  >
    <div class="flex flex-col">
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 id="add-zone-title" class="text-xl font-semibold">Add a time zone</h2>
        <button
          type="button"
          aria-label="Close add zone"
          onclick={() => {
            onClose();
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-10 items-center justify-center rounded-lg"
        >
          <span class="text-2xl" aria-hidden="true">×</span>
        </button>
      </header>

      <div class="p-4">
        <input
          type="text"
          role="combobox"
          aria-label="Search time zones"
          aria-autocomplete="list"
          aria-controls="add-zone-results"
          aria-expanded="true"
          placeholder="Search a city, region, or IANA zone…"
          bind:this={searchInput}
          bind:value={query}
          oninput={() => {
            activeIndex = 0;
          }}
          onkeydown={handleKeyDown}
          class="border-border bg-surface text-text placeholder:text-muted w-full rounded-lg border px-3 py-2 text-sm"
        />

        <p class="sr-only" aria-live="polite">{status}</p>

        <ul
          id="add-zone-results"
          role="listbox"
          aria-label="Time zone results"
          class="mt-2 max-h-[50dvh] overflow-y-auto"
        >
          {#each results as result, index (result.timeZone)}
            <li
              role="option"
              aria-selected={index === activeIndex}
              aria-disabled={added.has(result.timeZone)}
              onclick={() => {
                add(result.timeZone);
              }}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  add(result.timeZone);
                }
              }}
              class="hover:bg-surface flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm aria-disabled:cursor-default aria-disabled:opacity-50"
            >
              <span class="flex min-w-0 items-baseline gap-2">
                <span class="text-text truncate font-medium">{result.label}</span>
                <span class="text-muted truncate text-sm">{result.timeZone}</span>
              </span>
              <span class="text-muted shrink-0 text-right text-sm">
                {result.abbreviation} · {formatOffset(result.offsetMinutes)}
                {#if added.has(result.timeZone)}
                  · Added
                {/if}
              </span>
            </li>
          {:else}
            <li class="text-muted px-2 py-6 text-center text-sm">No zones match that search.</li>
          {/each}
        </ul>
      </div>
    </div>
  </dialog>
{/if}
