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
</script>

<div
  data-testid="range-bar"
  class="border-border bg-surface-raised flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 sm:px-4"
>
  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <span class="text-text text-base font-medium tabular-nums">
      {local.start}–{local.end}
    </span>
    <span class="text-muted text-sm tabular-nums">({formatDuration(range.durationMs)})</span>
    <span class="text-muted text-xs">
      {summary.in} of {zones.length} zones in working hours
      {#if summary.partial > 0}
        · {summary.partial} partly
      {/if}
      {#if summary.multiDay > 0}
        · multi-day
      {/if}
    </span>
  </div>

  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={() => {
        onDetails();
      }}
      class="bg-accent text-accent-contrast h-10 rounded px-5 text-sm font-medium tracking-wide uppercase"
    >
      Details
    </button>
    <button
      type="button"
      onclick={() => {
        onClear();
      }}
      class="text-muted hover:bg-surface hover:text-text h-10 rounded px-3 text-sm font-medium"
    >
      Clear
    </button>
  </div>
</div>
