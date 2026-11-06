<script lang="ts">
  import { House } from '@lucide/svelte';
  import ZoneMenu from './ZoneMenu.svelte';
  import { formatUtcOffset } from '$lib/time/format';
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
  class="border-border relative border-b last:border-b-0"
>
  <div
    role="gridcell"
    class="bg-surface-raised sticky left-0 z-30 flex w-[calc(100vw-2rem)] flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1 sm:w-full sm:flex-nowrap sm:px-4"
  >
    <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {#if isHome}
        <House class="text-accent-text size-3.5 shrink-0" aria-hidden="true" />
        <span class="sr-only">Home zone</span>
      {/if}
      <span class="text-text truncate text-base leading-tight">{model.label}</span>
      {#if showAbbreviation}
        <span class="text-muted text-base leading-tight">{model.abbreviation}</span>
      {/if}
      {#if showUtcOffset}
        <span class="text-muted text-base leading-tight"
          >{formatUtcOffset(model.offsetMinutes)}</span
        >
      {/if}
      {#if showDst && model.dst.active}
        <span class="bg-status-day/15 text-status-day rounded px-1 text-xs">DST</span>
      {/if}
      {#if showIana}
        <span class="text-muted hidden max-w-40 truncate text-xs sm:inline">{model.timeZone}</span>
      {/if}
    </div>

    <div class="ml-auto flex shrink-0 items-baseline gap-2">
      <span class="text-text text-base leading-tight tabular-nums">
        {rangeLabel ?? model.focusedTime}
      </span>
      {#if rangeLabel !== null}
        <span class="text-muted text-xs leading-tight">{rangeStatusLabel}</span>
      {:else}
        <span class="sr-only">{statusLabel}</span>
      {/if}
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
          class="text-muted hover:bg-surface hover:text-text -my-1 inline-flex size-8 items-center justify-center rounded-full"
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

  <div class="relative min-w-[720px]">
    <div role="gridcell" data-timeline data-row-timeline class="relative flex h-6 overflow-hidden">
      {#each model.hourCells as cell (cell.start)}
        {@const current =
          nowPosition !== null && nowPosition >= cell.start && nowPosition < cell.end}
        <div
          class={`relative flex h-full shrink-0 items-center justify-center ${
            current
              ? 'bg-cell-current text-cell-current-text'
              : cell.midnight
                ? 'bg-cell-midnight text-text'
                : cell.kind === 'day'
                  ? 'bg-cell-day text-text'
                  : 'bg-cell-night text-text'
          }`}
          style={`width: ${pct(cell.end - cell.start)}`}
        >
          <span data-testid="hour-label" class="text-base tabular-nums">{cell.label}</span>
        </div>
      {/each}

      {#if showWorkingHours}
        {#each model.bands.work as segment (segment.start)}
          <div
            class="bg-band-work pointer-events-none absolute inset-y-0 z-[2]"
            style={`left: ${pct(segment.start)}; width: ${pct(segment.end - segment.start)}`}
          ></div>
        {/each}
      {/if}

      {#if rangeStartPosition !== null && rangeEndPosition !== null}
        <div
          data-testid="row-range-fill"
          class="bg-now/15 pointer-events-none absolute inset-y-0 z-[5]"
          style={`left: ${pct(rangeStartPosition)}; width: ${pct(rangeEndPosition - rangeStartPosition)}`}
        ></div>
      {/if}

      {#each model.dstMarkers as marker (marker.position)}
        <div
          class="border-dst-marker/70 pointer-events-none absolute inset-y-0 z-10 w-0 border-l border-dashed"
          style={`left: ${pct(marker.position)}`}
          title={marker.label}
          aria-hidden="true"
        ></div>
      {/each}

      <div
        class="border-now pointer-events-none absolute inset-y-0 z-20 w-px border-l border-dashed"
        style={`left: ${pct(focusPosition)}`}
        aria-hidden="true"
      ></div>
      {#if nowPosition !== null}
        <div
          class="border-accent pointer-events-none absolute inset-y-0 z-20 w-px border-l border-dashed"
          style={`left: ${pct(nowPosition)}`}
          aria-hidden="true"
        ></div>
      {/if}
    </div>

    <div class="relative h-4">
      {#each model.dayMarkers as marker (marker.position)}
        <div
          data-testid="day-marker"
          class="text-muted absolute bottom-0 text-xs whitespace-nowrap"
          style={labelStyle(marker.position)}
        >
          {marker.label}
        </div>
      {/each}
    </div>
  </div>
</div>
