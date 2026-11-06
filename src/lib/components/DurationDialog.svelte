<script lang="ts">
  import { modal } from '$lib/actions/modal';
  import { untrack } from 'svelte';
  import { dateInZone, instantFromWallTime, wallTimeInZone } from '$lib/time/axis';
  import { formatDuration } from '$lib/time/format';
  import {
    availabilityForZone,
    localRangeForZone,
    normalizeRange,
    wallClockDurationMs,
  } from '$lib/time/range';
  import { listZones } from '$lib/time/zones';
  import type { Availability, NormalizedRange } from '$lib/time/types';
  import type { Settings, ZoneSetting } from '$lib/settings/types';

  let {
    open,
    range,
    zones,
    settings,
    onApply,
    onClose,
  }: {
    open: boolean;
    range: NormalizedRange;
    zones: ZoneSetting[];
    settings: Settings;
    onApply: (range: NormalizedRange) => void;
    onClose: () => void;
  } = $props();

  const allZones = listZones();
  const initial = untrack(() => ({
    startDate: dateInZone(range.startMs, settings.homeZone),
    startTime: wallTimeInZone(range.startMs, settings.homeZone),
    startZone: settings.homeZone,
    endDate: dateInZone(range.endMs, settings.homeZone),
    endTime: wallTimeInZone(range.endMs, settings.homeZone),
    endZone: settings.homeZone,
  }));

  let startDate = $state(initial.startDate);
  let startTime = $state(initial.startTime);
  let startZone = $state(initial.startZone);
  let endDate = $state(initial.endDate);
  let endTime = $state(initial.endTime);
  let endZone = $state(initial.endZone);

  const computed = $derived.by(() => {
    try {
      const startMs = instantFromWallTime(startZone, startDate, startTime);
      const endMs = instantFromWallTime(endZone, endDate, endTime);
      return normalizeRange(startMs, endMs);
    } catch {
      return null;
    }
  });

  const wallDifference = $derived(computed ? wallClockDurationMs(startZone, computed) : 0);

  const zoneRows = $derived(
    computed
      ? zones.map((zone) => {
          const local = localRangeForZone(zone.timeZone, computed, settings.timeFormat, 'en-US');
          const status = availabilityForZone(
            zone.timeZone,
            computed,
            settings.workStart,
            settings.workEnd,
          );
          return { label: zone.label, local, status };
        })
      : [],
  );

  function statusLabel(status: Availability): string {
    if (status === 'in') return 'Working hours';
    if (status === 'partial') return 'Partly';
    if (status === 'multi-day') return 'Per-day';
    return 'Outside';
  }

  function swap(): void {
    [startDate, endDate] = [endDate, startDate];
    [startTime, endTime] = [endTime, startTime];
    [startZone, endZone] = [endZone, startZone];
  }

  function apply(): void {
    if (!computed) return;
    onApply(computed);
  }
</script>

{#if open}
  <dialog
    open
    use:modal
    aria-labelledby="duration-title"
    oncancel={(event) => {
      event.preventDefault();
      onClose();
    }}
    class="border-border bg-surface-raised text-text m-auto w-[min(760px,calc(100vw-2rem))] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40"
  >
    <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 id="duration-title" class="text-base font-semibold">Duration</h2>
        <button
          type="button"
          aria-label="Close duration"
          onclick={() => {
            onClose();
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-8 items-center justify-center rounded-lg"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div class="overflow-y-auto px-4 py-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <fieldset class="border-border rounded-xl border p-3">
            <legend class="text-muted px-1 text-xs font-medium">Start</legend>
            <div class="grid gap-2">
              <label class="text-muted text-xs">
                Start date
                <input
                  type="date"
                  bind:value={startDate}
                  class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                />
              </label>
              <label class="text-muted text-xs">
                Start time
                <input
                  type="time"
                  bind:value={startTime}
                  class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                />
              </label>
              <label class="text-muted text-xs">
                Start zone
                <select
                  bind:value={startZone}
                  class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                >
                  {#each allZones as zone (zone)}
                    <option value={zone}>{zone}</option>
                  {/each}
                </select>
              </label>
            </div>
          </fieldset>

          <button
            type="button"
            onclick={swap}
            class="border-border text-muted hover:bg-surface hover:text-text h-9 rounded-lg border px-3 text-xs font-medium"
          >
            Swap
          </button>

          <fieldset class="border-border rounded-xl border p-3">
            <legend class="text-muted px-1 text-xs font-medium">End</legend>
            <div class="grid gap-2">
              <label class="text-muted text-xs">
                End date
                <input
                  type="date"
                  bind:value={endDate}
                  class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                />
              </label>
              <label class="text-muted text-xs">
                End time
                <input
                  type="time"
                  bind:value={endTime}
                  class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                />
              </label>
              <label class="text-muted text-xs">
                End zone
                <select
                  bind:value={endZone}
                  class="border-border bg-surface text-text mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                >
                  {#each allZones as zone (zone)}
                    <option value={zone}>{zone}</option>
                  {/each}
                </select>
              </label>
            </div>
          </fieldset>
        </div>

        {#if computed}
          <div class="mt-4 flex flex-wrap items-baseline gap-2">
            <span class="text-2xl font-light tabular-nums">
              {formatDuration(computed.durationMs)}
            </span>
            <span class="text-muted text-xs">elapsed</span>
            {#if wallDifference !== computed.durationMs}
              <span class="text-muted text-xs">
                · {formatDuration(wallDifference)} on the wall clock
              </span>
            {/if}
          </div>

          {#if computed.durationMs > 86_400_000}
            <p class="text-warning mt-2 text-xs">
              Multi-day span — availability is shown per local day.
            </p>
          {/if}

          <div class="border-border mt-4 overflow-x-auto rounded-xl border">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface text-muted">
                <tr>
                  <th class="px-3 py-2 font-medium">Zone</th>
                  <th class="px-3 py-2 font-medium">Local span</th>
                  <th class="px-3 py-2 font-medium">Availability</th>
                </tr>
              </thead>
              <tbody>
                {#each zoneRows as row (row.label)}
                  <tr class="border-border border-t">
                    <td class="px-3 py-2">{row.label}</td>
                    <td class="px-3 py-2 tabular-nums">
                      {row.local.start}–{row.local.end}
                    </td>
                    <td class="px-3 py-2">{statusLabel(row.status)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-danger mt-4 text-xs">Enter a valid start and end.</p>
        {/if}
      </div>

      <footer class="border-border flex justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          onclick={() => {
            onClose();
          }}
          class="border-border text-text hover:bg-surface h-9 rounded-lg border px-3 text-xs font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!computed}
          onclick={apply}
          class="bg-accent text-accent-contrast h-9 rounded-lg px-3 text-xs font-medium disabled:opacity-50"
        >
          Apply
        </button>
      </footer>
    </div>
  </dialog>
{/if}
