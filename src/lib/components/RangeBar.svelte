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
  class="border-border bg-surface-raised mb-3 flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <span class="text-text font-medium">Selected</span>
    <span class="text-muted tabular-nums">
      {local.start}–{local.end}
      {homeLabel}
    </span>
    <span class="bg-surface text-accent-text rounded-full px-2 py-0.5 font-medium tabular-nums">
      {formatDuration(range.durationMs)}
    </span>
    <span class="text-muted">
      {summary.in} of {zones.length} zones in working hours
      {#if summary.partial > 0}
        · {summary.partial} partly
      {/if}
      {#if summary.multiDay > 0}
        · multi-day
      {/if}
    </span>
  </div>

  <div class="flex items-center gap-1">
    <button
      type="button"
      onclick={() => {
        onDetails();
      }}
      class="border-border text-text hover:bg-surface h-7 rounded-lg border px-2 text-[11px] font-medium"
    >
      Details
    </button>
    <button
      type="button"
      onclick={() => {
        onClear();
      }}
      class="text-muted hover:bg-surface hover:text-text h-7 rounded-lg px-2 text-[11px] font-medium"
    >
      Clear
    </button>
  </div>
</div>
