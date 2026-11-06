<script lang="ts">
  import { horizontalDrag } from '$lib/actions/pointerDrag';
  import { instantForPosition, moveByDays, positionForInstant } from '$lib/time/axis';
  import { formatDate, formatTime } from '$lib/time/format';
  import type { NormalizedRange, TimeAxis, TimeFormat, WorkSegment, ZoneId } from '$lib/time/types';

  let {
    axis,
    focusMs,
    nowMs,
    range,
    format,
    stepMinutes,
    homeZone,
    zoneLabel,
    onSetFocus,
    onNow,
    onSetRange,
    onRangeChange,
    onExtendRange,
    onClearRange,
    work = [],
  }: {
    axis: TimeAxis;
    focusMs: number;
    nowMs: number;
    range: NormalizedRange | null;
    format: TimeFormat;
    stepMinutes: number;
    homeZone: ZoneId;
    zoneLabel: string;
    onSetFocus: (instantMs: number) => void;
    onNow: () => void;
    onSetRange: (startMs: number, endMs: number) => void;
    onRangeChange: (startMs: number, endMs: number) => void;
    onExtendRange: (minutes: number) => void;
    onClearRange: () => void;
    work?: WorkSegment[];
  } = $props();

  let surface: HTMLElement;

  function pct(position: number): string {
    return `${(position * 100).toFixed(4)}%`;
  }

  function labelStyle(position: number): string {
    if (position <= 0.005) return 'left: 0; transform: none;';
    if (position >= 0.995) return 'left: 100%; transform: translateX(-100%);';
    return `left: ${pct(position)}; transform: translateX(-50%);`;
  }

  const focusPosition = $derived(pct(positionForInstant(axis, focusMs)));
  const nowInView = $derived(nowMs >= axis.startMs && nowMs <= axis.endMs);
  const nowPosition = $derived(pct(positionForInstant(axis, nowMs)));
  const rangeStart = $derived(range ? pct(positionForInstant(axis, range.startMs)) : null);
  const rangeWidth = $derived(
    range
      ? pct(positionForInstant(axis, range.endMs) - positionForInstant(axis, range.startMs))
      : null,
  );
  const rangeEnd = $derived(range ? pct(positionForInstant(axis, range.endMs)) : null);

  const ariaValueText = $derived(
    `${formatTime(focusMs, homeZone, format, { locale: 'en-US' })} ${formatDate(focusMs, homeZone, {
      style: 'short',
      locale: 'en-US',
    })} ${zoneLabel}`,
  );

  function positionFromClientX(clientX: number): number {
    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function handleFocusMove(clientX: number): void {
    onSetFocus(instantForPosition(axis, positionFromClientX(clientX)));
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;

    if (direction !== 0 && event.shiftKey) {
      onExtendRange(direction * stepMinutes);
      event.preventDefault();
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const minutes = event.altKey ? 60 : stepMinutes;
        onSetFocus(focusMs + direction * minutes * 60_000);
        break;
      }
      case 'PageUp':
        onSetFocus(moveByDays(homeZone, focusMs, -1));
        break;
      case 'PageDown':
        onSetFocus(moveByDays(homeZone, focusMs, 1));
        break;
      case 'Home':
        onSetFocus(axis.startMs);
        break;
      case 'End':
        onSetFocus(axis.endMs);
        break;
      case 'Escape':
        onClearRange();
        break;
      default:
        if (event.key.toLowerCase() === 't') {
          onNow();
        } else {
          return;
        }
    }

    event.preventDefault();
  }

  let dragAnchor: number | null = null;
  let dragStartX = 0;
  let dragMoved = false;

  const surfaceHandlers = {
    onStart: (event: PointerEvent) => {
      dragStartX = event.clientX;
      dragAnchor = instantForPosition(axis, positionFromClientX(event.clientX));
      dragMoved = false;
      onSetFocus(dragAnchor);
    },
    onMove: (clientX: number) => {
      if (dragAnchor === null) return;
      if (Math.abs(clientX - dragStartX) > 3) dragMoved = true;
      if (!dragMoved) return;
      onRangeChange(dragAnchor, instantForPosition(axis, positionFromClientX(clientX)));
    },
    onEnd: (clientX: number) => {
      if (dragAnchor === null) return;
      const current = instantForPosition(axis, positionFromClientX(clientX));
      if (dragMoved) onSetRange(dragAnchor, current);
      else onSetFocus(current);
      dragAnchor = null;
      dragMoved = false;
    },
    onClick: () => {},
  };

  const startHandleHandlers = {
    thresholdPx: 0,
    onStart: (event: PointerEvent) => {
      event.stopPropagation();
    },
    onMove: (clientX: number) => {
      if (!range) return;
      onRangeChange(instantForPosition(axis, positionFromClientX(clientX)), range.endMs);
    },
  };

  const endHandleHandlers = {
    thresholdPx: 0,
    onStart: (event: PointerEvent) => {
      event.stopPropagation();
    },
    onMove: (clientX: number) => {
      if (!range) return;
      onRangeChange(range.startMs, instantForPosition(axis, positionFromClientX(clientX)));
    },
  };

  const focusHandlers = {
    thresholdPx: 0,
    onStart: (event: PointerEvent) => {
      event.stopPropagation();
    },
    onMove: handleFocusMove,
  };
</script>

<div
  bind:this={surface}
  data-testid="ruler-surface"
  data-timeline
  data-format={format}
  use:horizontalDrag={surfaceHandlers}
  class="border-border bg-surface-raised relative h-14 min-w-0 touch-none border-b select-none"
>
  <div class="bg-border/50 absolute inset-x-0 top-0 h-1" aria-hidden="true">
    {#each work as segment (segment.start)}
      <div
        data-testid="work-segment"
        class="bg-work-line/70 absolute inset-y-0"
        style={`left: ${pct(segment.start)}; width: ${pct(segment.end - segment.start)}`}
      ></div>
    {/each}
  </div>

  {#each axis.ticks as tick (tick.instantMs)}
    <div
      data-testid="hour-label"
      class="text-muted absolute bottom-1 px-0.5 text-base tabular-nums"
      style={labelStyle(tick.position)}
    >
      {tick.label}
    </div>
    <div
      data-testid="hour-tick"
      class="bg-muted/40 pointer-events-none absolute bottom-0 h-1.5 w-px -translate-x-1/2"
      style={`left: ${pct(tick.position)}`}
      aria-hidden="true"
    ></div>
  {/each}

  {#if rangeStart !== null && rangeWidth !== null}
    <div
      data-testid="range-fill"
      class="bg-focus-line-ui/15 absolute inset-y-2 z-10"
      style={`left: ${rangeStart}; width: ${rangeWidth}`}
    ></div>
  {/if}

  {#if range && rangeStart !== null && rangeEnd !== null}
    <div
      data-testid="range-start-handle"
      use:horizontalDrag={startHandleHandlers}
      class="border-surface-raised bg-focus-line-ui absolute top-1 z-40 h-3 w-3 -translate-x-1/2 cursor-ew-resize rounded-full border-2 shadow"
      style={`left: ${rangeStart}`}
      title="Drag range start"
    ></div>
    <div
      data-testid="range-end-handle"
      use:horizontalDrag={endHandleHandlers}
      class="border-surface-raised bg-focus-line-ui absolute top-1 z-40 h-3 w-3 -translate-x-1/2 cursor-ew-resize rounded-full border-2 shadow"
      style={`left: ${rangeEnd}`}
      title="Drag range end"
    ></div>
  {/if}

  {#if nowInView}
    <div
      data-testid="now-line"
      class="border-muted pointer-events-none absolute inset-y-0 z-10 w-px border-l border-dashed"
      style={`--position: ${nowPosition}; left: var(--position)`}
      title="Now"
    ></div>
  {/if}

  <div
    role="slider"
    tabindex="0"
    aria-label="Focus time"
    aria-valuemin={0}
    aria-valuemax={axis.durationMs}
    aria-valuenow={focusMs - axis.startMs}
    aria-valuetext={ariaValueText}
    onkeydown={handleKeyDown}
    class="absolute inset-y-0 z-30 w-0 cursor-ew-resize focus-visible:outline-none"
    style={`left: ${focusPosition}`}
  >
    {#if nowInView}
      <div
        data-testid="focus-line"
        class="border-focus-line-ui pointer-events-none absolute inset-y-0 w-0 border-l-2 border-dashed drop-shadow-[0_0_1px_rgba(255,255,255,0.85)]"
        style={`--position: ${focusPosition}`}
      ></div>
      <div
        data-testid="focus-handle"
        use:horizontalDrag={focusHandlers}
        class="border-surface-raised bg-focus-line-ui absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 shadow"
        title="Drag to move the focus time"
      ></div>
    {/if}
  </div>
</div>
