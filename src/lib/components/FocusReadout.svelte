<script lang="ts">
  import { formatDate, formatTime } from '$lib/time/format';
  import type { InstantMs, TimeFormat, ZoneId } from '$lib/time/types';

  let {
    focusMs,
    showYear,
    homeZone,
    zoneLabel,
    format,
    onOpen,
  }: {
    focusMs: InstantMs;
    showYear: boolean;
    homeZone: ZoneId;
    zoneLabel: string;
    format: TimeFormat;
    onOpen: () => void;
  } = $props();

  const time = $derived(formatTime(focusMs, homeZone, format, { seconds: true, locale: 'en-US' }));
  const date = $derived(
    formatDate(focusMs, homeZone, {
      style: 'short',
      locale: 'en-US',
      year: showYear,
    }),
  );
</script>

<button
  type="button"
  title="Set an exact or relative time"
  onclick={onOpen}
  class="group hover:bg-surface rounded-lg px-1 py-0.5 text-left transition-colors"
>
  <span
    class="text-muted block text-[2.125rem] leading-none font-light tracking-tight tabular-nums"
  >
    {time}
  </span>
  <span class="text-muted mt-1 block text-sm">
    {date} · {zoneLabel}
  </span>
  <span class="sr-only">Set time</span>
</button>
