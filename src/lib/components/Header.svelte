<script lang="ts">
  import {
    Clock,
    ChevronLeft,
    ChevronRight,
    LocateFixed,
    Plus,
    RotateCcw,
    Settings,
    Timer,
  } from '@lucide/svelte';
  import { WINDOW_OFFSET_LIMIT_HOURS, WINDOW_SHIFT_HOURS } from '$lib/time/axis';
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
    windowOffsetHours,
    onNow,
    onOpenSetTime,
    onOpenDuration,
    onOpenAddZone,
    onOpenSettings,
    onShiftWindow,
    onResetWindow,
    children,
  }: {
    focusMs: InstantMs;
    nowMs: InstantMs;
    homeZone: ZoneId;
    zoneLabel: string;
    format: TimeFormat;
    followNow: boolean;
    windowOffsetHours: number;
    onNow: () => void;
    onOpenSetTime: () => void;
    onOpenDuration: () => void;
    onOpenAddZone: () => void;
    onOpenSettings: () => void;
    onShiftWindow: (hours: number) => void;
    onResetWindow: () => void;
    children?: Snippet;
  } = $props();

  const relative = $derived(followNow ? 'Now' : formatRelative(focusMs - nowMs));
  const showRelative = $derived(!followNow && Math.abs(focusMs - nowMs) >= 60_000);
  const canShiftBack = $derived(windowOffsetHours > -WINDOW_OFFSET_LIMIT_HOURS);
  const canShiftForward = $derived(windowOffsetHours < WINDOW_OFFSET_LIMIT_HOURS);
  const canResetWindow = $derived(windowOffsetHours !== 0);
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

  <div class="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1">
    <div
      role="group"
      aria-label="Visible time window"
      class="border-border flex items-center rounded-lg border"
    >
      <button
        type="button"
        aria-label="Show previous 6 hours"
        title="Show previous 6 hours"
        disabled={!canShiftBack}
        onclick={() => {
          onShiftWindow(-WINDOW_SHIFT_HOURS);
        }}
        class="text-muted hover:bg-surface hover:text-text disabled:hover:text-muted inline-flex size-10 items-center justify-center rounded-l-lg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Reset visible window"
        title="Reset visible window"
        disabled={!canResetWindow}
        onclick={onResetWindow}
        class="border-border text-muted hover:bg-surface hover:text-text disabled:hover:text-muted inline-flex size-10 items-center justify-center border-x disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Show next 6 hours"
        title="Show next 6 hours"
        disabled={!canShiftForward}
        onclick={() => {
          onShiftWindow(WINDOW_SHIFT_HOURS);
        }}
        class="text-muted hover:bg-surface hover:text-text disabled:hover:text-muted inline-flex size-10 items-center justify-center rounded-r-lg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </div>

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
