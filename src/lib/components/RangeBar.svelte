<script lang="ts">
  import { formatDuration } from '$lib/time/format';
  import { localRangeForZone, summarizeAvailability } from '$lib/time/range';
  import type { NormalizedRange } from '$lib/time/types';
  import type { Settings, ZoneSetting } from '$lib/settings/types';

  let {
    range,
    zones,
    settings,
    onClear,
    onDetails,
  }: {
    range: NormalizedRange;
    zones: ZoneSetting[];
    settings: Settings;
    onClear: () => void;
    onDetails: () => void;
  } = $props();

  const local = $derived(localRangeForZone(settings.homeZone, range, settings.timeFormat, 'en-US'));
  const summary = $derived(
    summarizeAvailability(
      zones.map((zone) => zone.timeZone),
      range,
      settings.workStart,
      settings.workEnd,
    ),
  );
  const homeLabel = $derived(
    settings.zones.find((zone) => zone.timeZone === settings.homeZone)?.label ?? settings.homeZone,
  );
</script>

<div
  data-testid="range-bar"
  class="border-border bg-surface-raised flex h-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl border px-3"
>
  <div class="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
    <span class="text-text text-base font-medium tabular-nums">
      {local.start}–{local.end}
    </span>
    <span class="text-muted shrink-0 text-sm tabular-nums">
      ({formatDuration(range.durationMs)})
    </span>
    <span class="text-muted hidden text-sm sm:inline">{homeLabel}</span>
    <span class="text-muted hidden truncate text-sm sm:inline">
      {summary.in} of {zones.length} zones in working hours
      {#if summary.partial > 0}
        · {summary.partial} partly
      {/if}
      {#if summary.multiDay > 0}
        · multi-day
      {/if}
    </span>
  </div>

  <div class="flex shrink-0 items-center gap-1">
    <button
      type="button"
      onclick={() => {
        onDetails();
      }}
      class="border-border text-text hover:bg-surface h-9 rounded-lg border px-2.5 text-sm font-medium"
    >
      Details
    </button>
    <button
      type="button"
      onclick={() => {
        onClear();
      }}
      class="text-muted hover:bg-surface hover:text-text h-9 rounded-lg px-2 text-sm font-medium"
    >
      Clear
    </button>
  </div>
</div>
