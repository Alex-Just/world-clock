<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { dateInZone, instantForPosition, positionForInstant } from '$lib/time/axis';
  import { buildRowBands, buildZoneRow } from '$lib/time/rows';
  import { availabilityForZone, localRangeForZone } from '$lib/time/range';
  import type { Availability, InstantMs, NormalizedRange, TimeAxis, ZoneId } from '$lib/time/types';
  import type { Settings, ZoneSetting } from '$lib/settings/types';
  import Ruler from './Ruler.svelte';
  import ZoneRow from './ZoneRow.svelte';

  let {
    axis,
    zones,
    homeZone,
    focusMs,
    nowMs,
    followNow,
    range,
    settings,
    onSetFocus = () => {},
    onNow = () => {},
    onSetRange = () => {},
    onRangeChange = () => {},
    onExtendRange = () => {},
    onClearRange = () => {},
    onSetHome = () => {},
    onRename = () => {},
    onMove = () => {},
    onRemove = () => {},
  }: {
    axis: TimeAxis;
    zones: ZoneSetting[];
    homeZone: ZoneId;
    focusMs: InstantMs;
    nowMs: InstantMs;
    followNow: boolean;
    range: NormalizedRange | null;
    settings: Settings;
    onSetFocus?: (instantMs: InstantMs) => void;
    onNow?: () => void;
    onSetRange?: (startMs: InstantMs, endMs: InstantMs) => void;
    onRangeChange?: (startMs: InstantMs, endMs: InstantMs) => void;
    onExtendRange?: (minutes: number) => void;
    onClearRange?: () => void;
    onSetHome?: (zone: ZoneId) => void;
    onRename?: (zone: ZoneId) => void;
    onMove?: (zone: ZoneId, delta: -1 | 1) => void;
    onRemove?: (zone: ZoneId) => void;
  } = $props();

  const rows = $derived(
    zones.map((zone) =>
      buildZoneRow(zone, axis, {
        focusMs,
        workStart: settings.workStart,
        workEnd: settings.workEnd,
        format: settings.timeFormat,
        showDateLabels: settings.showDateLabels,
        locale: 'en-US',
      }),
    ),
  );

  const homeWork = $derived(
    buildRowBands(homeZone, axis, settings.workStart, settings.workEnd).work,
  );

  const focusPosition = $derived(positionForInstant(axis, focusMs));
  const nowInView = $derived(nowMs >= axis.startMs && nowMs < axis.endMs);
  const focusInView = $derived(focusMs >= axis.startMs && focusMs < axis.endMs);
  const focusDayIsToday = $derived(axis.date === dateInZone(nowMs, homeZone));
  const showFocusLine = $derived(focusInView && focusDayIsToday);
  const nowPosition = $derived(nowInView ? positionForInstant(axis, nowMs) : null);
  const rangeInView = $derived(
    range !== null && range.endMs > axis.startMs && range.startMs < axis.endMs,
  );
  const rangeStartPosition = $derived(
    range && rangeInView ? positionForInstant(axis, range.startMs) : null,
  );
  const rangeEndPosition = $derived(
    range && rangeInView ? positionForInstant(axis, range.endMs) : null,
  );
  let hoverSlot = $state<number | null>(null);
  let hoveredZone = $state<ZoneId | null>(null);
  const slotCount = $derived(Math.max(1, axis.ticks.length));
  const focusSlot = $derived(
    Math.min(slotCount - 1, Math.max(0, Math.floor(focusPosition * slotCount))),
  );
  const activeSlot = $derived(hoverSlot ?? (focusInView ? focusSlot : null));
  const activeSlotPosition = $derived(activeSlot ?? 0);
  const hoverLeft = $derived(`${((activeSlotPosition / slotCount) * 100).toFixed(4)}%`);
  const hoverWidth = $derived(`${((1 / slotCount) * 100).toFixed(4)}%`);
  const crosshairActive = $derived(hoverSlot !== null && hoveredZone !== null);
  const crosshairRight = $derived(
    `${(100 - ((activeSlotPosition + 1) / slotCount) * 100).toFixed(4)}%`,
  );
  const highlightStart = $derived(activeSlot === null ? -1 : activeSlot / slotCount);
  const highlightEnd = $derived(activeSlot === null ? -1 : (activeSlot + 1) / slotCount);

  function handlePointerMove(event: PointerEvent): void {
    if (dragAnchor !== null) {
      if (event.buttons === 0) {
        cleanupRowDrag();
      } else {
        return;
      }
    }
    if (event.pointerType === 'touch') return;
    const target =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-timeline]') : null;
    const row =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-testid^="row-"]')
        : null;
    hoveredZone = row?.getAttribute('data-testid')?.slice(4) ?? null;
    if (!target) {
      hoverSlot = null;
      return;
    }
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) {
      hoverSlot = null;
      return;
    }
    const ratio = (event.clientX - rect.left) / rect.width;
    if (ratio < 0 || ratio > 1) {
      hoverSlot = null;
      return;
    }
    hoverSlot = Math.min(slotCount - 1, Math.max(0, Math.floor(ratio * slotCount)));
  }
  let dragAnchor: number | null = null;
  let dragAxis: TimeAxis | null = null;
  let dragStartX = 0;
  let dragRect: DOMRect | null = null;
  let dragMoved = false;

  function pct(position: number): string {
    return `${(position * 100).toFixed(4)}%`;
  }

  function ratioFromClientX(clientX: number, rect: DOMRect): number {
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function cleanupRowDrag(): void {
    window.removeEventListener('pointermove', handleRowDragMove);
    window.removeEventListener('pointerup', finishRowDrag);
    window.removeEventListener('pointercancel', cancelRowDrag);
    dragAnchor = null;
    dragAxis = null;
    dragRect = null;
    dragMoved = false;
  }

  function handleRowDragMove(event: PointerEvent): void {
    if (dragAnchor === null || dragAxis === null || dragRect === null) return;
    if (Math.abs(event.clientX - dragStartX) > 3) dragMoved = true;
    if (!dragMoved) return;
    onRangeChange(
      dragAnchor,
      instantForPosition(dragAxis, ratioFromClientX(event.clientX, dragRect)),
    );
  }

  function finishRowDrag(event: PointerEvent): void {
    if (dragAnchor === null || dragAxis === null || dragRect === null) return;
    if (dragMoved) {
      const current = instantForPosition(dragAxis, ratioFromClientX(event.clientX, dragRect));
      onSetRange(dragAnchor, current);
    } else {
      onSetFocus(dragAnchor);
    }
    cleanupRowDrag();
  }

  function cancelRowDrag(): void {
    cleanupRowDrag();
  }

  function handleRowPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-row-timeline]')
        : null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;

    event.preventDefault();
    hoverSlot = null;
    dragStartX = event.clientX;
    dragRect = rect;
    dragAxis = axis;
    dragMoved = false;
    dragAnchor = instantForPosition(dragAxis, ratioFromClientX(event.clientX, rect));
    onSetFocus(dragAnchor);

    window.addEventListener('pointermove', handleRowDragMove);
    window.addEventListener('pointerup', finishRowDrag);
    window.addEventListener('pointercancel', cancelRowDrag);
  }

  onDestroy(cleanupRowDrag);

  let boardEl = $state<HTMLElement>();

  onMount(() => {
    const resetPointerState = () => {
      cleanupRowDrag();
      hoverSlot = null;
      hoveredZone = null;
    };
    const resetOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !boardEl?.contains(event.target)) {
        resetPointerState();
      }
    };
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      resetPointerState();
    };
    const handleWindowBlur = () => {
      resetPointerState();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) resetPointerState();
    };
    const handleGlobalMove = (event: PointerEvent) => {
      handlePointerMove(event);
    };
    document.addEventListener('pointerdown', resetOutside, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointermove', handleGlobalMove, { passive: true });
    window.addEventListener('keydown', clearOnEscape);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('pointerdown', resetOutside, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('keydown', clearOnEscape);
      window.removeEventListener('blur', handleWindowBlur);
    };
  });

  const homeLabel = $derived(
    settings.zones.find((zone) => zone.timeZone === homeZone)?.label ?? homeZone,
  );

  function rangeLabelFor(zone: ZoneId): string | null {
    if (!range) return null;
    const local = localRangeForZone(zone, range, settings.timeFormat, 'en-US');
    return `${local.start}–${local.end}`;
  }

  function rangeStatusFor(zone: ZoneId): Availability | null {
    if (!range) return null;
    return availabilityForZone(zone, range, settings.workStart, settings.workEnd);
  }
</script>

<div
  bind:this={boardEl}
  role="grid"
  tabindex="-1"
  aria-label="World clock"
  aria-rowcount={rows.length + 1}
  aria-colcount={2}
  data-following={followNow}
  onpointerdown={handleRowPointerDown}
  onpointerleave={() => {
    hoverSlot = null;
    hoveredZone = null;
  }}
  onpointercancel={() => {
    hoverSlot = null;
    hoveredZone = null;
  }}
  onfocusout={(event) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      hoverSlot = null;
      hoveredZone = null;
    }
  }}
  class="border-border bg-surface-raised overflow-hidden rounded-xl border select-none"
>
  <div data-testid="board-scroll" class="overflow-x-auto">
    <div class="min-w-[1000px]">
      <div role="row" class="border-border bg-surface-raised sticky top-0 z-30 flex border-b">
        <div
          role="columnheader"
          class="border-border text-muted relative flex w-[120px] shrink-0 items-center border-r px-2 text-sm font-medium tracking-wide uppercase sm:w-[320px] sm:px-3"
        >
          Zone
          <div
            data-testid="zone-header-dim"
            class={`bg-crosshair-dim pointer-events-none absolute inset-0 transition-opacity duration-150 ${
              crosshairActive ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          ></div>
        </div>
        <div role="columnheader" class="min-w-[680px] flex-1">
          <Ruler
            {axis}
            {focusMs}
            {nowMs}
            range={rangeInView ? range : null}
            format={settings.timeFormat}
            stepMinutes={settings.stepMinutes}
            {homeZone}
            zoneLabel={homeLabel}
            {onSetFocus}
            {onNow}
            {onSetRange}
            {onRangeChange}
            {onExtendRange}
            {onClearRange}
            {crosshairActive}
            crosshairLeft={hoverLeft}
            {crosshairRight}
            {activeSlot}
            {showFocusLine}
            work={settings.showWorkingHours ? homeWork : []}
          />
        </div>
      </div>

      <div class="relative">
        {#if rangeInView && rangeStartPosition !== null && rangeEndPosition !== null}
          <div
            class="pointer-events-none absolute inset-y-0 right-0 left-[120px] z-20 sm:left-[320px]"
            aria-hidden="true"
          >
            <div
              data-testid="range-outline"
              class="border-focus-line absolute inset-y-0 border"
              style={`left: ${pct(rangeStartPosition)}; width: ${pct(rangeEndPosition - rangeStartPosition)}`}
            ></div>
          </div>
        {/if}

        <div
          class="pointer-events-none absolute inset-y-0 right-0 left-[120px] z-30 sm:left-[320px]"
          aria-hidden="true"
        >
          {#if activeSlot !== null}
            <div
              data-testid="hover-slot"
              class={`bg-accent/10 absolute inset-y-0 ${
                crosshairActive ? 'border-accent/60 border-x' : 'border-accent/40 border-x'
              }`}
              style={`left: ${hoverLeft}; width: ${hoverWidth}`}
            ></div>
          {/if}
        </div>

        {#each rows as row, index (row.timeZone)}
          <ZoneRow
            model={row}
            isHome={row.timeZone === homeZone}
            rangeLabel={rangeLabelFor(row.timeZone)}
            rangeStatus={rangeStatusFor(row.timeZone)}
            showWorkingHours={settings.showWorkingHours}
            {focusPosition}
            {nowPosition}
            {slotCount}
            {rangeStartPosition}
            {rangeEndPosition}
            {crosshairActive}
            crosshairLeft={hoverLeft}
            {crosshairRight}
            {showFocusLine}
            showIana={settings.showIana}
            showAbbreviation={settings.showAbbreviation}
            showUtcOffset={settings.showUtcOffset}
            showDst={settings.showDst}
            isHovered={hoveredZone === row.timeZone}
            {highlightStart}
            {highlightEnd}
            canMoveUp={index > 0}
            canMoveDown={index < rows.length - 1}
            onSetHome={() => {
              onSetHome(row.timeZone);
            }}
            onRename={() => {
              onRename(row.timeZone);
            }}
            onMoveUp={() => {
              onMove(row.timeZone, -1);
            }}
            onMoveDown={() => {
              onMove(row.timeZone, 1);
            }}
            onRemove={() => {
              onRemove(row.timeZone);
            }}
          />
        {/each}
      </div>
    </div>
  </div>
</div>
