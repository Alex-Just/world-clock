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
    rangeStartPosition,
    rangeEndPosition,
    showIana,
    showAbbreviation,
    showUtcOffset,
    showDst,
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
    rangeStartPosition: number | null;
    rangeEndPosition: number | null;
    showIana: boolean;
    showAbbreviation: boolean;
    showUtcOffset: boolean;
    showDst: boolean;
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
</script>

<div
  role="row"
  data-testid={`row-${model.timeZone}`}
  class="border-border flex min-w-[980px] border-b last:border-b-0"
>
  <div
    role="gridcell"
    class="border-border bg-surface-raised sticky left-0 z-20 flex w-[120px] shrink-0 flex-wrap content-center items-center justify-between gap-x-2 gap-y-0.5 border-r px-2 py-1.5 sm:w-[260px] sm:flex-nowrap sm:px-3"
    title={`${model.timeZone} · ${formatUtcOffset(model.offsetMinutes)}`}
  >
    <div class="w-full min-w-0 sm:w-auto sm:flex-1">
      <div class="flex items-center gap-1.5">
        {#if isHome}
          <House class="text-accent-text size-3 shrink-0" aria-hidden="true" />
          <span class="sr-only">Home zone</span>
        {/if}
        <span class="text-text truncate text-xs font-medium sm:text-sm">{model.label}</span>
        <span
          class="bg-surface text-muted shrink-0 rounded px-1 text-[11px] tabular-nums"
          title={`UTC offset ${formatUtcOffset(model.offsetMinutes)}`}
        >
          {formatOffset(model.relativeOffsetMinutes)}
        </span>
      </div>
      <div class="text-muted mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
        {#if showAbbreviation}
          <span>{model.abbreviation}</span>
        {/if}
        {#if showUtcOffset}
          <span>{formatUtcOffset(model.offsetMinutes)}</span>
        {/if}
        {#if showDst && model.dst.active}
          <span class="bg-status-day/15 text-status-day rounded px-1">DST</span>
        {/if}
        {#if showIana}
          <span class="max-w-24 truncate sm:max-w-40">{model.timeZone}</span>
        {/if}
      </div>
    </div>

    <div class="flex w-full shrink-0 items-start justify-between gap-1 sm:w-auto sm:justify-start">
      <div
        class="text-right max-sm:flex max-sm:flex-wrap max-sm:items-baseline max-sm:gap-x-1 max-sm:text-left"
      >
        {#if rangeLabel !== null}
          <div
            class="text-text text-sm leading-none font-medium tabular-nums max-sm:basis-full sm:text-base"
          >
            {rangeLabel}
          </div>
          <div
            class={`mt-0.5 text-[11px] max-sm:mt-0 ${rangeStatus === 'in' ? 'text-accent-text' : 'text-muted'}`}
          >
            {rangeStatusLabel}
          </div>
        {:else}
          <div
            class="text-text text-base leading-none font-medium tabular-nums max-sm:basis-full sm:text-lg"
          >
            {model.focusedTime}
          </div>
          <div class="text-muted mt-0.5 text-[11px] max-sm:mt-0">{model.focusedDate}</div>
          <div class={`mt-0.5 text-[11px] max-sm:mt-0 ${statusClass}`}>{statusLabel}</div>
        {/if}
      </div>

      <div class="relative">
        <button
          bind:this={menuButton}
          type="button"
          aria-label={`Actions for ${model.label}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onclick={() => {
            menuOpen = !menuOpen;
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-6 items-center justify-center rounded-md"
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
  </div>

  <div
    role="gridcell"
    data-timeline
    data-row-timeline
    class="border-border bg-band-night relative min-h-14 min-w-[720px] flex-1 overflow-hidden"
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

    {#if showWorkingHours}
      {#each model.bands.work as segment (segment.start)}
        <div
          class="bg-band-work absolute inset-y-0"
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
      <div
        data-testid="hour-label"
        class="text-band-text absolute bottom-1 z-10 px-0.5 text-xs tabular-nums"
        style={labelStyle(label.position)}
      >
        {label.label}
      </div>
    {/each}

    {#each model.dayMarkers as marker (marker.position)}
      <div
        data-testid="day-marker"
        class="border-border bg-band-marker text-band-marker-text absolute top-1 z-10 rounded border px-1.5 text-xs font-medium whitespace-nowrap"
        style={labelStyle(marker.position)}
      >
        {marker.label}
      </div>
    {/each}

    {#if nowPosition !== null}
      <div
        class="border-now pointer-events-none absolute inset-y-0 z-10 w-px border-l border-dashed"
        style={`left: ${pct(nowPosition)}`}
      ></div>
    {/if}

    <div
      class="bg-accent pointer-events-none absolute inset-y-0 z-20 w-0.5"
      style={`left: ${pct(focusPosition)}`}
    ></div>
  </div>
</div>
