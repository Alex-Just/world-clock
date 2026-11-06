<script lang="ts">
  import { onDestroy } from 'svelte';
  import { instantForPosition, positionForInstant } from '$lib/time/axis';
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
  const nowInView = $derived(nowMs >= axis.startMs && nowMs <= axis.endMs);
  const nowPosition = $derived(nowInView ? positionForInstant(axis, nowMs) : null);
  const rangeStartPosition = $derived(range ? positionForInstant(axis, range.startMs) : null);
  const rangeEndPosition = $derived(range ? positionForInstant(axis, range.endMs) : null);
  let hoverSlot = $state<number | null>(null);
  const slotCount = $derived(Math.max(1, axis.ticks.length));
  const hoverLeft = $derived(
    hoverSlot === null ? null : `${((hoverSlot / slotCount) * 100).toFixed(4)}%`,
  );
  const hoverWidth = $derived(hoverSlot === null ? null : `${((1 / slotCount) * 100).toFixed(4)}%`);

  function handlePointerMove(event: PointerEvent): void {
    if (dragAnchor !== null || event.pointerType === 'touch') return;
    const target =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-timeline]') : null;
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
    dragRect = null;
    dragMoved = false;
  }

  function handleRowDragMove(event: PointerEvent): void {
    if (dragAnchor === null || dragRect === null) return;
    if (Math.abs(event.clientX - dragStartX) > 3) dragMoved = true;
    if (!dragMoved) return;
    onRangeChange(dragAnchor, instantForPosition(axis, ratioFromClientX(event.clientX, dragRect)));
  }

  function finishRowDrag(event: PointerEvent): void {
    if (dragAnchor === null || dragRect === null) return;
    const current = instantForPosition(axis, ratioFromClientX(event.clientX, dragRect));
    if (dragMoved) onSetRange(dragAnchor, current);
    else onSetFocus(current);
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
    dragMoved = false;
    dragAnchor = instantForPosition(axis, ratioFromClientX(event.clientX, rect));
    onSetFocus(dragAnchor);

    window.addEventListener('pointermove', handleRowDragMove);
    window.addEventListener('pointerup', finishRowDrag);
    window.addEventListener('pointercancel', cancelRowDrag);
  }

  onDestroy(cleanupRowDrag);

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
  role="grid"
  tabindex="-1"
  aria-label="World clock"
  aria-rowcount={rows.length + 1}
  aria-colcount={2}
  data-following={followNow}
  onpointerdown={handleRowPointerDown}
  onpointermove={handlePointerMove}
  onpointerleave={() => {
    hoverSlot = null;
  }}
  class="border-border bg-surface-raised overflow-hidden border-y"
>
  <div data-testid="board-scroll" class="overflow-x-auto">
    <div class="min-w-[720px]">
      <div class="relative">
        {#if rangeStartPosition !== null && rangeEndPosition !== null}
          <div
            class="pointer-events-none absolute inset-y-0 right-0 left-0 z-20"
            aria-hidden="true"
          >
            <div
              data-testid="range-outline"
              class="border-now/80 absolute inset-y-0 border-x"
              style={`left: ${pct(rangeStartPosition)}; width: ${pct(rangeEndPosition - rangeStartPosition)}`}
            ></div>
          </div>
        {/if}

        {#if hoverLeft !== null && hoverWidth !== null}
          <div
            class="pointer-events-none absolute inset-y-0 right-0 left-0 z-30"
            aria-hidden="true"
          >
            <div
              data-testid="hover-slot"
              class="border-text/20 bg-accent/10 absolute inset-y-0 border-x"
              style={`left: ${hoverLeft}; width: ${hoverWidth}`}
            ></div>
          </div>
        {/if}

        {#each rows as row, index (row.timeZone)}
          <ZoneRow
            model={row}
            isHome={row.timeZone === homeZone}
            rangeLabel={rangeLabelFor(row.timeZone)}
            rangeStatus={rangeStatusFor(row.timeZone)}
            showWorkingHours={settings.showWorkingHours}
            {focusPosition}
            {nowPosition}
            {rangeStartPosition}
            {rangeEndPosition}
            showIana={settings.showIana}
            showAbbreviation={settings.showAbbreviation}
            showUtcOffset={settings.showUtcOffset}
            showDst={settings.showDst}
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

      <div role="row" class="border-border bg-surface-raised sticky left-0 w-full border-t">
        <div role="gridcell" class="w-full">
          <Ruler
            {axis}
            {focusMs}
            {nowMs}
            {range}
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
            work={settings.showWorkingHours ? homeWork : []}
          />
        </div>
      </div>
    </div>
  </div>
</div>
