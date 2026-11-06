<script lang="ts">
  import { Clock, LocateFixed, Plus, Settings, Timer } from '@lucide/svelte';
  import { formatRelative } from '$lib/time/format';
  import type { InstantMs, TimeFormat, ZoneId } from '$lib/time/types';
  import type { Snippet } from 'svelte';
  import FocusReadout from './FocusReadout.svelte';
  import IconButton from './primitives/IconButton.svelte';

  let {
    focusMs,
    nowMs,
    homeZone,
    zoneLabel,
    format,
    followNow,
    onNow,
    onOpenSetTime,
    onOpenDuration,
    onOpenAddZone,
    onOpenSettings,
    children,
  }: {
    focusMs: InstantMs;
    nowMs: InstantMs;
    homeZone: ZoneId;
    zoneLabel: string;
    format: TimeFormat;
    followNow: boolean;
    onNow: () => void;
    onOpenSetTime: () => void;
    onOpenDuration: () => void;
    onOpenAddZone: () => void;
    onOpenSettings: () => void;
    children?: Snippet;
  } = $props();

  const relative = $derived(followNow ? 'Now' : formatRelative(focusMs - nowMs));
  const showRelative = $derived(!followNow && Math.abs(focusMs - nowMs) >= 60_000);
</script>

<header
  class="border-border bg-surface-raised relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 sm:px-6"
>
  <div class="flex min-w-0 shrink-0 items-center gap-4 sm:gap-6">
    <div class="text-text flex items-center gap-2 text-sm font-semibold tracking-tight">
      <Clock class="text-accent-text size-5" aria-hidden="true" />
      <h1 class="sr-only sm:not-sr-only">World Clock</h1>
    </div>

    <FocusReadout {focusMs} {homeZone} {zoneLabel} {format} onOpen={onOpenSetTime} />

    <span
      data-testid="relative-badge"
      class={`border-border text-muted hidden w-[5.75rem] rounded-full border px-2.5 py-1 text-center text-xs font-medium sm:inline-block ${
        showRelative ? '' : 'invisible'
      }`}
      aria-hidden="true"
    >
      {relative}
    </span>
    <span data-testid="relative-live" class="sr-only" aria-live="polite">
      {showRelative ? relative : ''}
    </span>
  </div>

  {#if children}
    <div
      class="order-last w-full sm:order-none sm:mx-auto sm:w-auto xl:absolute xl:top-1/2 xl:left-1/2 xl:mx-0 xl:-translate-x-1/2 xl:-translate-y-1/2"
    >
      {@render children()}
    </div>
  {/if}

  <div class="ml-auto flex shrink-0 items-center gap-1">
    <button
      type="button"
      onclick={onNow}
      class="border-border text-text hover:bg-surface inline-flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
    >
      <LocateFixed class="text-accent-text size-4" aria-hidden="true" />
      Now
    </button>

    <IconButton label="Duration" onclick={onOpenDuration}>
      <Timer class="size-4" aria-hidden="true" />
    </IconButton>

    <IconButton label="Add zone" onclick={onOpenAddZone}>
      <Plus class="size-4" aria-hidden="true" />
    </IconButton>

    <IconButton label="Settings" onclick={onOpenSettings}>
      <Settings class="size-4" aria-hidden="true" />
    </IconButton>
  </div>
</header>
