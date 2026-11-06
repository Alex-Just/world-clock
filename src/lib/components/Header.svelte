<script lang="ts">
  import { Clock, LocateFixed, Plus, Settings, Timer } from '@lucide/svelte';
  import { formatRelative } from '$lib/time/format';
  import type { InstantMs, TimeFormat, ZoneId } from '$lib/time/types';
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
  } = $props();

  const relative = $derived(followNow ? 'Now' : formatRelative(focusMs - nowMs));
</script>

<header
  class="border-border bg-surface-raised flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-4 py-3 sm:px-6"
>
  <div class="flex min-w-0 items-center gap-4 sm:gap-6">
    <div class="text-text flex items-center gap-2 text-sm font-semibold tracking-tight">
      <Clock class="text-accent size-5" aria-hidden="true" />
      <h1 class="sr-only sm:not-sr-only">World Clock</h1>
    </div>

    <FocusReadout {focusMs} {homeZone} {zoneLabel} {format} onOpen={onOpenSetTime} />

    <span
      class="border-border text-muted rounded-full border px-2.5 py-1 text-xs font-medium"
      aria-live="polite"
    >
      {relative}
    </span>
  </div>

  <div class="flex items-center gap-1">
    <button
      type="button"
      onclick={onNow}
      class="border-border text-text hover:bg-surface inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
    >
      <LocateFixed class="text-accent size-4" aria-hidden="true" />
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
