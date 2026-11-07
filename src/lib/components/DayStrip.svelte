<script lang="ts">
  import { addDays, dateInZone } from '$lib/time/axis';
  import type { DateString, InstantMs, ZoneId } from '$lib/time/types';
  import DatePicker from './DatePicker.svelte';

  let {
    viewDate,
    nowMs,
    homeZone,
    onSelectDate,
    onShiftDay,
    onToday,
    inline = false,
  }: {
    viewDate: DateString;
    nowMs: InstantMs;
    homeZone: ZoneId;
    onSelectDate: (date: DateString) => void;
    onShiftDay: (days: number) => void;
    onToday: () => void;
    inline?: boolean;
  } = $props();

  const days = $derived(Array.from({ length: 7 }, (_, index) => addDays(viewDate, index - 3)));
  const today = $derived(dateInZone(nowMs, homeZone));

  function weekdayShort(date: DateString): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  }

  function dayNumber(date: DateString): string {
    return String(Number(date.slice(8, 10)));
  }

  function isWeekend(date: DateString): boolean {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    return weekday === 0 || weekday === 6;
  }

  function dayClass(date: DateString): string {
    if (date === viewDate) {
      return 'bg-surface-control text-accent-text font-semibold hover:bg-surface-control';
    }
    return 'hover:bg-surface-control';
  }
</script>

<div
  class={inline
    ? 'flex min-w-0 items-center gap-1'
    : 'border-border bg-surface flex items-center gap-1 border-b px-2 py-2 sm:px-4'}
>
  <nav
    aria-label="Days"
    title={`Dates in ${homeZone}`}
    class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
  >
    <button
      type="button"
      aria-label="Previous day"
      onclick={() => {
        onShiftDay(-1);
      }}
      class="text-muted hover:bg-surface-control hover:text-text inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors"
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
        class={`relative flex min-h-10 min-w-12 shrink-0 flex-col items-center rounded-lg px-2 py-1.5 text-xs transition-colors ${dayClass(date)}`}
      >
        <span class="text-muted text-sm tracking-wide uppercase">{weekdayShort(date)}</span>
        <span class="text-text text-base tabular-nums">{dayNumber(date)}</span>
        {#if date === today || isWeekend(date)}
          <span
            data-testid={date === today ? 'today-marker' : 'weekend-marker'}
            class={`absolute bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full ${
              date === today ? 'bg-home-accent' : 'bg-weekend-line'
            }`}
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    {/each}

    <button
      type="button"
      aria-label="Next day"
      onclick={() => {
        onShiftDay(1);
      }}
      class="text-muted hover:bg-surface-control hover:text-text inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors"
    >
      <span aria-hidden="true">›</span>
    </button>

    <button
      type="button"
      onclick={onToday}
      class="border-border text-text hover:bg-surface-control ml-1 h-10 shrink-0 rounded-lg border px-2.5 text-xs font-medium transition-colors"
    >
      Today
    </button>
  </nav>
  <DatePicker {viewDate} {nowMs} {homeZone} {onSelectDate} {onToday} />
</div>
