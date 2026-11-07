<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Clock,
    ChevronLeft,
    ChevronRight,
    LocateFixed,
    Moon,
    Plus,
    Settings,
    Sun,
  } from '@lucide/svelte';
  import { WINDOW_OFFSET_LIMIT_HOURS, WINDOW_SHIFT_HOURS } from '$lib/time/axis';
  import { formatDuration, formatRelativeBreakdown, formatSourceStamp } from '$lib/time/format';
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
    theme,
    onNow,
    onOpenSetTime,
    onOpenAddZone,
    onOpenSettings,
    onShiftWindow,
    onToggleTheme,
    children,
  }: {
    focusMs: InstantMs;
    nowMs: InstantMs;
    homeZone: ZoneId;
    zoneLabel: string;
    format: TimeFormat;
    followNow: boolean;
    windowOffsetHours: number;
    theme: 'light' | 'dark';
    onNow: () => void;
    onOpenSetTime: () => void;
    onOpenAddZone: () => void;
    onOpenSettings: () => void;
    onShiftWindow: (hours: number) => void;
    onToggleTheme: () => void;
    children?: Snippet;
  } = $props();

  const relativeDelta = $derived(focusMs - nowMs);
  const relativeBreakdown = $derived(formatRelativeBreakdown(nowMs, focusMs, homeZone));
  const relativeSource = $derived(formatSourceStamp(nowMs, nowMs, homeZone, format, 'en-US'));
  const relativeText = $derived(
    followNow
      ? 'Now'
      : relativeDelta < 0
        ? `${relativeBreakdown.text} ago`
        : `in ${relativeBreakdown.text}`,
  );
  const relativeTotal = $derived(formatDuration(Math.abs(relativeDelta)));
  const showRelative = $derived(!followNow && Math.abs(relativeDelta) >= 60_000);
  const relativeLive = $derived(
    showRelative
      ? `${relativeText}. ${
          relativeBreakdown.hasCalendarUnits ? `${relativeTotal} total. ` : ''
        }From ${relativeSource}.`
      : '',
  );
  const canShiftBack = $derived(windowOffsetHours > -WINDOW_OFFSET_LIMIT_HOURS);
  const canShiftForward = $derived(windowOffsetHours < WINDOW_OFFSET_LIMIT_HOURS);
  const focusYear = $derived(
    Temporal.Instant.fromEpochMilliseconds(focusMs).toZonedDateTimeISO(homeZone).year,
  );
  const nowYear = $derived(
    Temporal.Instant.fromEpochMilliseconds(nowMs).toZonedDateTimeISO(homeZone).year,
  );
  const showFocusYear = $derived(focusYear !== nowYear);

  let headerEl = $state<HTMLElement>();
  let leftGroupEl = $state<HTMLDivElement>();
  let rightGroupEl = $state<HTMLDivElement>();
  let dayStripEl = $state<HTMLDivElement>();
  let dayShift = $state(0);

  onMount(() => {
    const header = headerEl;
    const leftGroup = leftGroupEl;
    const rightGroup = rightGroupEl;
    const dayStrip = dayStripEl;
    if (!header || !leftGroup || !rightGroup || !dayStrip) return;
    if (typeof ResizeObserver !== 'function') return;

    const updateShift = () => {
      const headerRect = header.getBoundingClientRect();
      const stripRect = dayStrip.getBoundingClientRect();
      const centeredLeft = (headerRect.width - stripRect.width) / 2;
      const gap = 16;
      const minLeft = leftGroup.getBoundingClientRect().right - headerRect.left + gap;
      const maxLeft =
        rightGroup.getBoundingClientRect().left - headerRect.left - gap - stripRect.width;
      const left = Math.min(Math.max(centeredLeft, minLeft), Math.max(minLeft, maxLeft));
      dayShift = Math.round(left - centeredLeft);
    };

    const observer = new ResizeObserver(updateShift);
    observer.observe(header);
    observer.observe(leftGroup);
    observer.observe(rightGroup);
    observer.observe(dayStrip);
    updateShift();
    return () => {
      observer.disconnect();
    };
  });
</script>

<header
  bind:this={headerEl}
  class="bg-surface-raised relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6"
>
  <div bind:this={leftGroupEl} class="flex min-w-0 shrink-0 items-center gap-4 sm:gap-6 xl:gap-3">
    <div class="text-text flex items-center gap-2 text-sm font-semibold tracking-tight">
      <Clock class="text-accent-text size-5" aria-hidden="true" />
      <h1 class="sr-only sm:not-sr-only">World Clock</h1>
    </div>

    <FocusReadout
      {focusMs}
      showYear={showFocusYear}
      {homeZone}
      {zoneLabel}
      {format}
      onOpen={onOpenSetTime}
    />

    <span
      data-testid="relative-badge"
      class={`border-border text-muted hidden w-36 rounded-xl border px-1.5 py-1.5 text-center text-xs leading-tight font-medium sm:inline-flex sm:flex-col sm:items-center sm:gap-0.5 ${
        showRelative ? '' : 'invisible'
      }`}
      aria-hidden="true"
    >
      <span data-testid="relative-breakdown" class="text-text block font-semibold">
        {relativeText}
      </span>
      {#if relativeBreakdown.hasCalendarUnits}
        <span data-testid="relative-total" class="text-muted block">
          {relativeTotal} total
        </span>
      {/if}
      <span data-testid="relative-source" class="text-muted block">
        from {relativeSource}
      </span>
    </span>
    <span data-testid="relative-live" class="sr-only" aria-live="polite">
      {relativeLive}
    </span>
  </div>

  {#if children}
    <div
      bind:this={dayStripEl}
      data-testid="day-strip"
      style={`--day-shift: ${String(dayShift)}px`}
      class="order-last flex w-full justify-center min-[1440px]:absolute min-[1440px]:top-1/2 min-[1440px]:left-[calc(50%_+_var(--day-shift))] min-[1440px]:w-auto min-[1440px]:-translate-x-1/2 min-[1440px]:-translate-y-1/2"
    >
      {@render children()}
    </div>
  {/if}

  <div
    bind:this={rightGroupEl}
    class="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1"
  >
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
        class="text-muted hover:bg-surface-control hover:text-text border-border disabled:hover:text-muted inline-flex size-10 items-center justify-center rounded-l-lg border-r disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Show next 6 hours"
        title="Show next 6 hours"
        disabled={!canShiftForward}
        onclick={() => {
          onShiftWindow(WINDOW_SHIFT_HOURS);
        }}
        class="text-muted hover:bg-surface-control hover:text-text disabled:hover:text-muted inline-flex size-10 items-center justify-center rounded-r-lg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      onclick={onNow}
      class="border-border text-text hover:bg-surface-control inline-flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
    >
      <LocateFixed class="text-accent-text size-4" aria-hidden="true" />
      Now
    </button>

    <IconButton
      label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onclick={onToggleTheme}
    >
      {#if theme === 'dark'}
        <Sun class="size-4" aria-hidden="true" />
      {:else}
        <Moon class="size-4" aria-hidden="true" />
      {/if}
    </IconButton>

    <IconButton label="Add zone" onclick={onOpenAddZone}>
      <Plus class="size-4" aria-hidden="true" />
    </IconButton>

    <IconButton label="Settings" onclick={onOpenSettings}>
      <Settings class="size-4" aria-hidden="true" />
    </IconButton>
  </div>
</header>
