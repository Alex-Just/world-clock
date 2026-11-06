<script lang="ts">
  import { House } from '@lucide/svelte';
  import ZoneMenu from './ZoneMenu.svelte';
  import { formatOffset, formatUtcOffset } from '$lib/time/format';
  import type { Availability, ZoneRowModel } from '$lib/time/types';

  let {
    model,
    isHome,
    rangeLabel,
    rangeStatus,
    showWorkingHours,
    focusPosition,
    nowPosition,
    slotCount,
    rangeStartPosition,
    rangeEndPosition,
    crosshairActive = false,
    crosshairLeft = '0%',
    crosshairRight = '100%',
    showFocusLine = true,
    showIana,
    showAbbreviation,
    showUtcOffset,
    showDst,
    isHovered,
    highlightStart,
    highlightEnd,
    canMoveUp,
    canMoveDown,
    onSetHome,
    onRename,
    onMoveUp,
    onMoveDown,
    onRemove,
  }: {
    model: ZoneRowModel;
    isHome: boolean;
    rangeLabel: string | null;
    rangeStatus: Availability | null;
    showWorkingHours: boolean;
    focusPosition: number;
    nowPosition: number | null;
    slotCount: number;
    rangeStartPosition: number | null;
    rangeEndPosition: number | null;
    crosshairActive?: boolean;
    crosshairLeft?: string;
    crosshairRight?: string;
    showFocusLine?: boolean;
    showIana: boolean;
    showAbbreviation: boolean;
    showUtcOffset: boolean;
    showDst: boolean;
    isHovered: boolean;
    highlightStart: number;
    highlightEnd: number;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onSetHome: () => void;
    onRename: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
  } = $props();

  let menuOpen = $state(false);
  let menuButton = $state<HTMLButtonElement>();

  function pct(position: number): string {
    return `${(position * 100).toFixed(4)}%`;
  }

  function labelStyle(position: number): string {
    if (position <= 0.005) return 'left: 0; transform: none;';
    if (position >= 0.995) return 'left: 100%; transform: translateX(-100%);';
    return `left: ${pct(position)}; transform: translateX(-50%);`;
  }

  function cellLabelStyle(position: number, slots: number): string {
    return `left: ${pct(position + 0.5 / Math.max(1, slots))}; transform: translateX(-50%);`;
  }

  const statusLabel = $derived(
    model.focusedStatus === 'working'
      ? 'Working hours'
      : model.focusedStatus === 'day'
        ? 'Daytime'
        : 'Night',
  );

  const statusClass = $derived(
    model.focusedStatus === 'working'
      ? 'text-accent-text'
      : model.focusedStatus === 'day'
        ? 'text-status-day'
        : 'text-muted',
  );

  const rangeStatusLabel = $derived(
    rangeStatus === 'in'
      ? 'Working hours'
      : rangeStatus === 'partial'
        ? 'Partly working'
        : rangeStatus === 'multi-day'
          ? 'Multi-day'
          : 'Outside hours',
  );

  const offsetAbbreviation = $derived(/^(GMT|UTC)/i.test(model.abbreviation));
  const showAbbreviationLabel = $derived(
    showAbbreviation && (!offsetAbbreviation || !showUtcOffset),
  );
  const utcOffsetLabel = $derived(formatUtcOffset(model.offsetMinutes));
  const showUtcOffsetLabel = $derived(showUtcOffset && utcOffsetLabel !== model.label);
  const showIanaLabel = $derived(showIana && model.timeZone !== model.label);
  const hasMetadata = $derived(
    showAbbreviationLabel || showUtcOffsetLabel || (showDst && model.dst.active) || showIanaLabel,
  );
</script>

<div
  role="row"
  data-testid={`row-${model.timeZone}`}
  class={`border-border flex min-w-[1000px] border-b border-l-2 transition-opacity duration-150 last:border-b-0 ${
    isHovered
      ? 'border-l-accent bg-accent/5'
      : isHome
        ? 'border-l-home-accent bg-home-row'
        : 'border-l-transparent'
  }`}
>
  <div
    role="gridcell"
    class={`border-border sticky left-0 z-20 flex w-[120px] shrink-0 flex-wrap content-center items-center justify-between gap-x-2 gap-y-0.5 overflow-hidden border-r px-2 py-1 sm:w-[320px] sm:flex-nowrap sm:px-3 ${
      isHovered ? 'bg-accent/10' : isHome ? 'bg-home-row-header' : 'bg-surface-raised'
    }`}
    title={`${model.timeZone} · ${formatUtcOffset(model.offsetMinutes)}`}
  >
    <div class="w-full min-w-0 sm:w-auto sm:flex-1">
      <div class="flex items-center gap-1.5">
        {#if isHome}
          <House class="text-accent-text size-3 shrink-0" aria-hidden="true" />
          <span class="sr-only">Home zone</span>
        {/if}
        <span class="text-text truncate text-sm font-medium sm:text-base">{model.label}</span>
        {#if model.relativeOffsetMinutes !== 0}
          <span
            data-testid="relative-offset"
            class="bg-surface text-muted shrink-0 rounded px-1 text-xs tabular-nums sm:text-sm"
            title={`UTC offset ${utcOffsetLabel}`}
          >
            {formatOffset(model.relativeOffsetMinutes)}
          </span>
        {/if}
      </div>
      {#if hasMetadata}
        <div class="text-muted mt-0.5 flex flex-wrap items-center gap-1 text-xs sm:text-base">
          {#if showAbbreviationLabel}
            <span>{model.abbreviation}</span>
          {/if}
          {#if showUtcOffsetLabel}
            <span>{utcOffsetLabel}</span>
          {/if}
          {#if showDst && model.dst.active}
            <span class="bg-status-day/15 text-status-day rounded px-1">DST</span>
          {/if}
          {#if showIanaLabel}
            <span class="max-w-24 truncate sm:max-w-40">{model.timeZone}</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="flex w-full shrink-0 items-start justify-between gap-1 sm:w-auto sm:justify-start">
      <div
        class="min-w-0 flex-1 text-right max-sm:flex max-sm:flex-wrap max-sm:items-baseline max-sm:gap-x-1 max-sm:text-left"
      >
        {#if rangeLabel !== null}
          <div
            data-testid="range-label-value"
            class="text-text text-base leading-none font-medium tabular-nums max-sm:w-full max-sm:min-w-0 max-sm:basis-full max-sm:truncate max-sm:text-sm"
            title={rangeLabel}
          >
            {rangeLabel}
          </div>
          <div
            class={`mt-0.5 text-xs max-sm:sr-only sm:text-sm ${rangeStatus === 'in' ? 'text-accent-text' : 'text-muted'}`}
          >
            {rangeStatusLabel}
          </div>
        {:else}
          <div class="text-text text-base leading-none font-medium tabular-nums max-sm:basis-full">
            {model.focusedTime}
          </div>
          <div class="mt-0.5 flex items-baseline gap-1 text-xs max-sm:sr-only sm:text-sm">
            <span class="text-muted">{model.focusedDate}</span>
            <span class="text-muted">·</span>
            <span class={statusClass}>{statusLabel}</span>
          </div>
        {/if}
      </div>

      <div class="relative shrink-0">
        <button
          bind:this={menuButton}
          type="button"
          aria-label={`Actions for ${model.label}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onclick={() => {
            menuOpen = !menuOpen;
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <span aria-hidden="true">⋯</span>
        </button>
        {#if menuOpen && menuButton}
          <ZoneMenu
            anchor={menuButton}
            zone={{ timeZone: model.timeZone, label: model.label }}
            {isHome}
            {canMoveUp}
            {canMoveDown}
            {onSetHome}
            {onRename}
            {onMoveUp}
            {onMoveDown}
            {onRemove}
            onClose={() => {
              menuOpen = false;
            }}
          />
        {/if}
      </div>
    </div>
    <div
      data-testid="row-crosshair-dim"
      class={`bg-crosshair-dim pointer-events-none absolute inset-0 z-30 transition-opacity duration-150 ${
        crosshairActive && !isHovered ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    ></div>
  </div>

  <div
    role="gridcell"
    data-timeline
    data-row-timeline
    class="border-border bg-band-night relative min-h-14 min-w-[680px] flex-1 overflow-hidden"
  >
    {#each model.bands.base as band (band.start)}
      <div
        class={`absolute inset-y-0 ${
          band.kind === 'day'
            ? 'bg-band-day'
            : band.kind === 'twilight'
              ? 'bg-band-twilight'
              : 'bg-band-night'
        }`}
        style={`left: ${pct(band.start)}; width: ${pct(band.end - band.start)}`}
      ></div>
    {/each}

    {#if isHome}
      <div
        data-testid="home-row-fill"
        class="bg-home-row pointer-events-none absolute inset-0 z-[1]"
        aria-hidden="true"
      ></div>
    {/if}

    {#if showWorkingHours}
      {#each model.bands.work as segment (segment.start)}
        <div
          data-testid="work-cell"
          class="bg-band-work absolute inset-y-0 z-[2]"
          style={`left: ${pct(segment.start)}; width: ${pct(segment.end - segment.start)}`}
        ></div>
      {/each}
    {/if}

    {#if rangeStartPosition !== null && rangeEndPosition !== null}
      <div
        data-testid="row-range-fill"
        class="bg-accent/5 absolute inset-y-0 z-[5]"
        style={`left: ${pct(rangeStartPosition)}; width: ${pct(rangeEndPosition - rangeStartPosition)}`}
      ></div>
    {/if}

    {#each model.dstMarkers as marker (marker.position)}
      <div
        class="border-dst-marker/70 absolute inset-y-0 z-10 w-0 border-l border-dashed"
        style={`left: ${pct(marker.position)}`}
        title={marker.label}
        aria-hidden="true"
      ></div>
    {/each}

    {#each model.hourLabels as label (label.position)}
      {@const activeLabel =
        label.position >= highlightStart - 1e-6 && label.position < highlightEnd - 1e-6}
      <div
        data-testid="hour-label"
        class={`text-band-text absolute bottom-1 z-10 px-0.5 text-base tabular-nums ${
          activeLabel ? 'font-semibold' : 'font-normal'
        }`}
        style={cellLabelStyle(label.position, slotCount)}
      >
        {label.label}
      </div>
      <div
        data-testid="hour-tick"
        class="bg-band-text/25 pointer-events-none absolute bottom-0 z-10 h-1.5 w-px -translate-x-1/2"
        style={`left: ${pct(label.position)}`}
        aria-hidden="true"
      ></div>
    {/each}

    {#each model.dayMarkers as marker (marker.position)}
      <div
        data-testid="day-marker"
        class="border-border bg-band-marker text-band-marker-text absolute top-1 z-10 rounded border px-1.5 text-sm font-medium whitespace-nowrap"
        style={labelStyle(marker.position)}
      >
        {marker.label}
      </div>
    {/each}

    {#if nowPosition !== null}
      <div
        class="border-accent pointer-events-none absolute inset-y-0 z-10 w-px border-l border-dashed"
        style={`left: ${pct(nowPosition)}`}
      ></div>
    {/if}

    {#if showFocusLine}
      <div
        data-testid="row-focus-line"
        class="border-focus-line pointer-events-none absolute inset-y-0 z-20 w-0 border-l-2 border-dashed drop-shadow-[0_0_1px_rgba(255,255,255,0.85)]"
        style={`left: ${pct(focusPosition)}`}
      ></div>
    {/if}

    <div
      data-testid="crosshair-dim-left"
      class={`bg-crosshair-dim pointer-events-none absolute inset-y-0 left-0 z-30 transition-opacity duration-150 ${
        crosshairActive && !isHovered ? 'opacity-100' : 'opacity-0'
      }`}
      style={`width: ${crosshairLeft}`}
      aria-hidden="true"
    ></div>
    <div
      data-testid="crosshair-dim-right"
      class={`bg-crosshair-dim pointer-events-none absolute inset-y-0 right-0 z-30 transition-opacity duration-150 ${
        crosshairActive && !isHovered ? 'opacity-100' : 'opacity-0'
      }`}
      style={`width: ${crosshairRight}`}
      aria-hidden="true"
    ></div>
  </div>
</div>
