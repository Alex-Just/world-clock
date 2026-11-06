<script lang="ts">
  import { addDays } from '$lib/time/axis';
  import type { DateString, ZoneId } from '$lib/time/types';

  let {
    viewDate,
    homeZone,
    onSelectDate,
    onShiftDay,
    onToday,
  }: {
    viewDate: DateString;
    homeZone: ZoneId;
    onSelectDate: (date: DateString) => void;
    onShiftDay: (days: number) => void;
    onToday: () => void;
  } = $props();

  const days = $derived(Array.from({ length: 7 }, (_, index) => addDays(viewDate, index - 3)));

  function weekdayShort(date: DateString): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  }

  function dayNumber(date: DateString): string {
    return String(Number(date.slice(8, 10)));
  }
</script>

<nav
  aria-label="Days"
  title={`Dates in ${homeZone}`}
  class="bg-surface-raised flex items-center gap-1 overflow-x-auto px-2 py-1 sm:px-4"
>
  <button
    type="button"
    aria-label="Previous day"
    onclick={() => {
      onShiftDay(-1);
    }}
    class="text-muted hover:bg-surface-raised hover:text-text inline-flex size-10 shrink-0 items-center justify-center rounded-lg"
  >
    <span aria-hidden="true">‹</span>
  </button>

  {#each days as date (date)}
    <button
      type="button"
      aria-label={`${weekdayShort(date)} ${dayNumber(date)} ${date.slice(0, 4)}`}
      aria-current={date === viewDate ? 'date' : undefined}
      onclick={() => {
        onSelectDate(date);
      }}
      class="hover:bg-surface flex min-h-10 min-w-12 shrink-0 flex-col items-center border-b-2 border-transparent px-2 py-1 text-xs transition-colors"
      class:text-accent-text={date === viewDate}
      class:border-accent={date === viewDate}
      class:font-semibold={date === viewDate}
    >
      <span class="text-muted text-xs tracking-wide uppercase">{weekdayShort(date)}</span>
      <span class="text-text text-base tabular-nums">{dayNumber(date)}</span>
    </button>
  {/each}

  <button
    type="button"
    aria-label="Next day"
    onclick={() => {
      onShiftDay(1);
    }}
    class="text-muted hover:bg-surface-raised hover:text-text inline-flex size-10 shrink-0 items-center justify-center rounded-lg"
  >
    <span aria-hidden="true">›</span>
  </button>

  <button
    type="button"
    onclick={onToday}
    class="border-border text-text hover:bg-surface-raised ml-1 h-10 shrink-0 rounded-lg border px-2.5 text-xs font-medium"
  >
    Today
  </button>
</nav>
