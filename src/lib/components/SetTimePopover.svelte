<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { dateInZone, instantFromWallTime, wallTimeInZone } from '$lib/time/axis';
  import { formatTime } from '$lib/time/format';
  import { listZones } from '$lib/time/zones';
  import type { InstantMs, TimeFormat, ZoneId } from '$lib/time/types';

  let {
    open,
    focusMs,
    homeZone,
    format = '24h',
    onApply,
    onNow,
    onClose,
  }: {
    open: boolean;
    focusMs: InstantMs;
    homeZone: ZoneId;
    format?: TimeFormat;
    onApply: (instantMs: InstantMs) => void;
    onNow?: () => void;
    onClose: () => void;
  } = $props();

  const initial = untrack(() => ({
    date: dateInZone(focusMs, homeZone),
    time: wallTimeInZone(focusMs, homeZone),
    zone: homeZone,
  }));

  let tab = $state<'exact' | 'relative'>('exact');
  let exactDate = $state(initial.date);
  let exactTime = $state(initial.time);
  let exactZone = $state(initial.zone);
  let amount = $state('1');
  let unit = $state<'minutes' | 'hours' | 'days'>('hours');
  let direction = $state<'after' | 'before'>('after');

  const allZones = listZones();
  let panel: HTMLElement | undefined = $state();
  const unitMs = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;

  const exactInstant = $derived.by(() => {
    if (!exactDate || !exactTime) return null;
    try {
      return instantFromWallTime(exactZone, exactDate, exactTime);
    } catch {
      return null;
    }
  });

  const relativeOffset = $derived(
    Number.isFinite(Number(amount)) ? Number(amount) * unitMs[unit] : 0,
  );
  const relativeInstant = $derived(
    focusMs + (direction === 'before' ? -relativeOffset : relativeOffset),
  );
  const preview = $derived(
    formatTime(
      tab === 'exact' && exactInstant !== null ? exactInstant : relativeInstant,
      homeZone,
      format,
      {
        locale: 'en-US',
      },
    ),
  );

  function apply(): void {
    if (tab === 'exact') {
      if (exactInstant === null) return;
      onApply(exactInstant);
    } else {
      if (!Number.isFinite(Number(amount))) return;
      onApply(relativeInstant);
    }
    onClose();
  }

  function applyQuick(
    quickAmount: string,
    quickUnit: 'hours' | 'days',
    quickDirection: 'after' | 'before',
  ): void {
    amount = quickAmount;
    unit = quickUnit;
    direction = quickDirection;
  }

  function goNow(): void {
    onNow?.();
    onClose();
  }

  function trapFocus(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first =
      panel?.querySelector<HTMLElement>('input, select') ?? panel?.querySelector('button');
    first?.focus();
    return () => {
      previous?.focus();
    };
  });
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-20">
    <div
      bind:this={panel}
      role="dialog"
      tabindex="-1"
      aria-label="Set time"
      onkeydown={trapFocus}
      class="border-border bg-surface-raised text-text w-[min(440px,100%)] rounded-2xl border p-4 shadow-2xl"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">Set time</h2>
        <button
          type="button"
          aria-label="Close set time"
          onclick={() => {
            onClose();
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-10 items-center justify-center rounded-lg"
        >
          <span class="text-2xl" aria-hidden="true">×</span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Set time mode"
        class="bg-surface mt-3 flex gap-1 rounded-lg p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'exact'}
          class:bg-surface-raised={tab === 'exact'}
          class:text-text={tab === 'exact'}
          class="text-muted flex-1 rounded-md px-2 py-2 text-sm font-medium"
          onclick={() => {
            tab = 'exact';
          }}
        >
          Exact
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'relative'}
          class:bg-surface-raised={tab === 'relative'}
          class:text-text={tab === 'relative'}
          class="text-muted flex-1 rounded-md px-2 py-2 text-sm font-medium"
          onclick={() => {
            tab = 'relative';
          }}
        >
          Relative
        </button>
      </div>

      {#if tab === 'exact'}
        <div class="mt-3 grid gap-2">
          <label class="text-muted text-xs">
            Date
            <input
              type="date"
              bind:value={exactDate}
              class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
            />
          </label>
          <label class="text-muted text-xs">
            Time
            <input
              type="time"
              bind:value={exactTime}
              class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
            />
          </label>
          <label class="text-muted text-xs">
            Zone
            <select
              bind:value={exactZone}
              class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
            >
              {#each allZones as zone (zone)}
                <option value={zone}>{zone}</option>
              {/each}
            </select>
          </label>
        </div>
      {:else}
        <div class="mt-3 grid gap-2">
          <label class="text-muted text-xs">
            Amount
            <input
              type="number"
              min="0"
              step="0.5"
              bind:value={amount}
              class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
            />
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="text-muted text-xs">
              Unit
              <select
                bind:value={unit}
                class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </label>
            <label class="text-muted text-xs">
              Direction
              <select
                bind:value={direction}
                class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
              >
                <option value="after">after</option>
                <option value="before">before</option>
              </select>
            </label>
          </div>
          <div class="flex flex-wrap gap-1">
            <button
              type="button"
              onclick={() => {
                applyQuick('1', 'days', 'before');
              }}
              class="border-border text-muted hover:bg-surface h-9 rounded-lg border px-2.5 text-sm"
            >
              −1d
            </button>
            <button
              type="button"
              onclick={() => {
                applyQuick('1', 'hours', 'before');
              }}
              class="border-border text-muted hover:bg-surface h-9 rounded-lg border px-2.5 text-sm"
            >
              −1h
            </button>
            <button
              type="button"
              onclick={goNow}
              class="border-border text-muted hover:bg-surface h-9 rounded-lg border px-2.5 text-sm"
            >
              Now
            </button>
            <button
              type="button"
              onclick={() => {
                applyQuick('1', 'hours', 'after');
              }}
              class="border-border text-muted hover:bg-surface h-9 rounded-lg border px-2.5 text-sm"
            >
              +1h
            </button>
            <button
              type="button"
              onclick={() => {
                applyQuick('1', 'days', 'after');
              }}
              class="border-border text-muted hover:bg-surface h-9 rounded-lg border px-2.5 text-sm"
            >
              +1d
            </button>
          </div>
        </div>
      {/if}

      <div
        class="border-border text-muted mt-4 flex items-center justify-between border-t pt-3 text-sm"
      >
        <span aria-live="polite">
          Preview: <span class="text-text tabular-nums">{preview}</span>
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => {
              onClose();
            }}
            class="border-border text-text hover:bg-surface h-10 rounded-lg border px-3 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={tab === 'exact' && exactInstant === null}
            onclick={apply}
            class="bg-accent text-accent-contrast h-10 rounded-lg px-3 text-sm font-medium disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
