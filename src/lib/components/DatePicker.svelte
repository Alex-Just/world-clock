<script lang="ts">
  import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { dateInZone } from '$lib/time/axis';
  import type { DateString, InstantMs, ZoneId } from '$lib/time/types';

  let {
    viewDate,
    nowMs,
    homeZone,
    onSelectDate,
    onToday,
  }: {
    viewDate: DateString;
    nowMs: InstantMs;
    homeZone: ZoneId;
    onSelectDate: (date: DateString) => void;
    onToday: () => void;
  } = $props();

  interface DayCell {
    date: DateString;
    day: number;
    inMonth: boolean;
  }

  let open = $state(false);
  // svelte-ignore state_referenced_locally
  let displayMonth = $state(firstOfMonth(viewDate));
  let trigger = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();
  let jumpValue = $state('');
  let jumpError = $state<string | null>(null);
  let jumpFocusRequested = false;

  const supportsPopover =
    typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  const today = $derived(dateInZone(nowMs, homeZone));
  const month = $derived(Temporal.PlainDate.from(displayMonth));
  const monthLabel = $derived(formatMonth(month));
  const cells = $derived(buildDays(month));

  function firstOfMonth(date: DateString): DateString {
    return Temporal.PlainDate.from(date).with({ day: 1 }).toString();
  }

  function formatMonth(date: Temporal.PlainDate): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date.toString()}T12:00:00Z`));
  }

  function formatDayLabel(date: DateString): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`));
  }

  function buildDays(current: Temporal.PlainDate): DayCell[] {
    const start = current.subtract({ days: current.dayOfWeek % 7 });
    return Array.from({ length: 42 }, (_, index) => {
      const date = start.add({ days: index });
      return {
        date: date.toString(),
        day: date.day,
        inMonth: date.year === current.year && date.month === current.month,
      };
    });
  }

  function positionMenu(): void {
    if (!menuEl || !trigger) return;
    const anchorRect = trigger.getBoundingClientRect();
    const width = menuEl.offsetWidth || 320;
    const height = menuEl.offsetHeight || 360;
    const margin = 8;
    const gap = 6;
    const left = Math.min(
      window.innerWidth - width - margin,
      Math.max(margin, anchorRect.right - width),
    );
    let top = anchorRect.bottom + gap;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - height - gap);
    }
    menuEl.style.left = `${left.toFixed(1)}px`;
    menuEl.style.top = `${top.toFixed(1)}px`;
  }

  function close(focusTrigger = false): void {
    open = false;
    if (focusTrigger) trigger?.focus();
  }

  function selectDate(date: DateString): void {
    onSelectDate(date);
    close(true);
  }

  function toggle(event: MouseEvent): void {
    if (open) {
      close();
      return;
    }
    displayMonth = firstOfMonth(viewDate);
    jumpValue = '';
    jumpError = null;
    jumpFocusRequested = event.detail === 0;
    open = true;
  }

  function shiftMonth(delta: number): void {
    displayMonth = month.add({ months: delta }).with({ day: 1 }).toString();
  }

  function jumpToDate(): void {
    const value = jumpValue.trim();
    const parts = value.split(/[-/.]/).filter(Boolean);
    let year: number | undefined;
    let monthValue: number | undefined;
    let day: number | undefined;

    if (parts.length === 1) {
      const token = parts[0] ?? '';
      if (!/^\d+$/.test(token)) {
        jumpError = 'Use YYYY, YYYY-MM, or YYYY-MM-DD.';
        return;
      }
      if (token.length === 4) {
        year = Number(token);
      } else if (token.length === 6) {
        year = Number(token.slice(0, 4));
        monthValue = Number(token.slice(4, 6));
      } else if (token.length === 8) {
        year = Number(token.slice(0, 4));
        monthValue = Number(token.slice(4, 6));
        day = Number(token.slice(6, 8));
      } else {
        jumpError = 'Use YYYY, YYYY-MM, or YYYY-MM-DD.';
        return;
      }
    } else if (parts.length === 2) {
      const [yearPart, monthPart] = parts;
      if (!yearPart || !monthPart || !/^\d{4}$/.test(yearPart) || !/^\d{1,2}$/.test(monthPart)) {
        jumpError = 'Use YYYY, YYYY-MM, or YYYY-MM-DD.';
        return;
      }
      year = Number(yearPart);
      monthValue = Number(monthPart);
    } else if (parts.length === 3) {
      const [yearPart, monthPart, dayPart] = parts;
      if (
        !yearPart ||
        !monthPart ||
        !dayPart ||
        !/^\d{4}$/.test(yearPart) ||
        !/^\d{1,2}$/.test(monthPart) ||
        !/^\d{1,2}$/.test(dayPart)
      ) {
        jumpError = 'Use YYYY, YYYY-MM, or YYYY-MM-DD.';
        return;
      }
      year = Number(yearPart);
      monthValue = Number(monthPart);
      day = Number(dayPart);
    } else {
      jumpError = 'Use YYYY, YYYY-MM, or YYYY-MM-DD.';
      return;
    }

    try {
      if (day !== undefined && monthValue !== undefined) {
        const date = Temporal.PlainDate.from(
          { year, month: monthValue, day },
          { overflow: 'reject' },
        );
        jumpValue = '';
        jumpError = null;
        selectDate(date.toString());
        return;
      }
      if (monthValue !== undefined) {
        const date = Temporal.PlainDate.from(
          { year, month: monthValue, day: 1 },
          { overflow: 'reject' },
        );
        displayMonth = date.toString();
        jumpValue = '';
        jumpError = null;
        return;
      }
      const date = Temporal.PlainDate.from({ year, month: month.month, day: 1 });
      displayMonth = date.toString();
      jumpValue = '';
      jumpError = null;
    } catch {
      jumpError = 'That date does not exist.';
    }
  }

  function closeOnOutside(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menuEl?.contains(target) || trigger?.contains(target)) return;
    close();
  }

  function closeOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close(true);
  }

  $effect(() => {
    const element = menuEl;
    if (!open || !element) return;

    if (typeof element.showPopover === 'function') {
      try {
        element.showPopover();
      } catch {
        // Already open.
      }
    }
    positionMenu();
    const focusTarget = jumpFocusRequested
      ? element.querySelector<HTMLInputElement>('#date-jump')
      : element.querySelector<HTMLElement>('[aria-current="date"]');
    focusTarget?.focus();
    jumpFocusRequested = false;

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
    };
  });
</script>

<button
  bind:this={trigger}
  type="button"
  aria-label="Pick a date"
  title="Pick a date"
  aria-haspopup="dialog"
  aria-expanded={open}
  onclick={toggle}
  class="border-border text-muted hover:bg-surface hover:text-text inline-flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors"
>
  <CalendarDays class="size-4" aria-hidden="true" />
</button>

{#if open}
  <div
    bind:this={menuEl}
    popover={supportsPopover ? 'manual' : undefined}
    role="dialog"
    aria-label="Choose a date"
    class="border-border bg-surface-raised text-text fixed inset-auto z-50 m-0 max-h-[calc(100vh-1rem)] w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border p-3 shadow-xl"
  >
    <form
      class="border-border mb-3 border-b pb-3"
      onsubmit={(event) => {
        event.preventDefault();
        jumpToDate();
      }}
    >
      <label class="text-muted text-xs font-medium" for="date-jump">Jump to date</label>
      <div class="mt-1 flex gap-2">
        <input
          id="date-jump"
          bind:value={jumpValue}
          oninput={() => {
            jumpError = null;
          }}
          type="text"
          inputmode="numeric"
          autocomplete="off"
          placeholder="YYYY-MM-DD"
          aria-invalid={jumpError ? 'true' : undefined}
          aria-describedby={jumpError ? 'date-jump-error' : undefined}
          class="border-border bg-surface text-text h-11 min-w-0 flex-1 rounded-lg border px-3 text-base"
        />
        <button
          type="submit"
          aria-label="Go to date"
          class="bg-accent text-accent-contrast hover:bg-accent/90 h-11 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors"
        >
          Go
        </button>
      </div>
      {#if jumpError}
        <p id="date-jump-error" class="text-danger mt-1.5 text-xs" role="alert">{jumpError}</p>
      {/if}
    </form>

    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Previous month"
        onclick={() => {
          shiftMonth(-1);
        }}
        class="text-muted hover:bg-surface hover:text-text inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      >
        <ChevronLeft class="size-4" aria-hidden="true" />
      </button>
      <p class="text-base font-semibold" aria-live="polite">{monthLabel}</p>
      <button
        type="button"
        aria-label="Next month"
        onclick={() => {
          shiftMonth(1);
        }}
        class="text-muted hover:bg-surface hover:text-text inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      >
        <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div
      class="text-muted mt-2 grid grid-cols-7 gap-1 text-center text-xs font-medium tracking-wide uppercase"
      aria-hidden="true"
    >
      {#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as label, index (index)}
        <span class="py-1">{label}</span>
      {/each}
    </div>

    <div class="mt-1 grid grid-cols-7 gap-1">
      {#each cells as cell (cell.date)}
        <button
          type="button"
          aria-current={cell.date === viewDate ? 'date' : undefined}
          aria-label={formatDayLabel(cell.date)}
          onclick={() => {
            selectDate(cell.date);
          }}
          class={`flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${
            cell.date === viewDate
              ? 'bg-accent text-accent-contrast font-semibold'
              : cell.inMonth
                ? 'text-text hover:bg-surface'
                : 'text-muted hover:bg-surface'
          } ${cell.date === today && cell.date !== viewDate ? 'ring-accent/50 ring-1' : ''}`}
        >
          {cell.day}
        </button>
      {/each}
    </div>

    <div class="border-border mt-3 flex items-center justify-between border-t pt-2">
      <button
        type="button"
        onclick={() => {
          onToday();
          close(true);
        }}
        class="text-accent-text hover:bg-surface rounded-lg px-2 py-1.5 text-sm font-medium transition-colors"
      >
        Today
      </button>
      <button
        type="button"
        onclick={() => {
          close(true);
        }}
        class="text-muted hover:bg-surface hover:text-text rounded-lg px-2 py-1.5 text-sm font-medium transition-colors"
      >
        Close
      </button>
    </div>
  </div>
{/if}
