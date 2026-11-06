<script lang="ts">
  import { modal } from '$lib/actions/modal';
  import { untrack } from 'svelte';
  import { createDefaultSettings } from '$lib/settings/defaults';
  import { downloadJson } from '$lib/settings/download';
  import { moveZone, removeZone } from '$lib/settings/mutations';
  import { exportSettings, importSettings } from '$lib/settings/storage';
  import { ACCENTS } from '$lib/settings/theme';
  import type { Settings } from '$lib/settings/types';

  let {
    open,
    settings,
    onUpdate,
    onReplace,
    onAddZone = () => {},
    onSetHome = () => {},
    onClose,
  }: {
    open: boolean;
    settings: Settings;
    onUpdate: (patch: Partial<Settings>) => void;
    onReplace: (settings: Settings) => void;
    onAddZone?: () => void;
    onSetHome?: (zone: string) => void;
    onClose: () => void;
  } = $props();

  let workStart = $state(untrack(() => settings.workStart));
  let workEnd = $state(untrack(() => settings.workEnd));
  let importMessage = $state('');
  const invalidHours = $derived(workStart === workEnd);

  $effect(() => {
    workStart = settings.workStart;
    workEnd = settings.workEnd;
  });

  function saveWorkingHours(): void {
    if (invalidHours) return;
    onUpdate({ workStart, workEnd });
  }

  function handleExport(): void {
    downloadJson('world-clock.json', exportSettings(settings));
  }

  async function handleImport(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = importSettings(text, settings.homeZone);
    if (result.ok) {
      if (!window.confirm('Replace your current settings with this backup?')) {
        input.value = '';
        return;
      }
      importMessage = 'Settings imported.';
      onReplace(result.settings);
    } else {
      importMessage = result.error;
    }
    input.value = '';
  }

  function resetAll(): void {
    if (!window.confirm('Reset every setting and zone to its default?')) return;
    onReplace(createDefaultSettings(settings.homeZone));
  }
</script>

{#if open}
  <dialog
    open
    use:modal
    aria-label="Settings"
    oncancel={(event) => {
      event.preventDefault();
      onClose();
    }}
    class="border-border bg-surface-raised text-text m-auto w-[min(760px,calc(100vw-2rem))] rounded-2xl border p-0 shadow-2xl backdrop:bg-black/40"
  >
    <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
      <header class="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 class="text-xl font-semibold">Settings</h2>
        <button
          type="button"
          aria-label="Close settings"
          onclick={() => {
            onClose();
          }}
          class="text-muted hover:bg-surface hover:text-text inline-flex size-10 items-center justify-center rounded-lg text-xl"
        >
          <span class="text-2xl" aria-hidden="true">×</span>
        </button>
      </header>

      <div class="space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <h3 class="text-muted text-sm font-semibold tracking-wide uppercase">Appearance</h3>
          <div class="mt-2 grid gap-3 sm:grid-cols-2">
            <fieldset>
              <legend class="text-muted text-xs">Theme</legend>
              <div class="mt-1 flex flex-wrap gap-2">
                <label class="flex min-h-9 items-center gap-2 text-base">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={settings.theme === 'system'}
                    onchange={() => {
                      onUpdate({ theme: 'system' });
                    }}
                  />
                  System
                </label>
                <label class="flex min-h-9 items-center gap-2 text-base">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={settings.theme === 'light'}
                    onchange={() => {
                      onUpdate({ theme: 'light' });
                    }}
                  />
                  Light
                </label>
                <label class="flex min-h-9 items-center gap-2 text-base">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={settings.theme === 'dark'}
                    onchange={() => {
                      onUpdate({ theme: 'dark' });
                    }}
                  />
                  Dark
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend class="text-muted text-xs">Accent</legend>
              <div class="mt-1 flex flex-wrap gap-1.5">
                {#each ACCENTS as accent (accent.id)}
                  <button
                    type="button"
                    aria-label={`${accent.label} accent`}
                    aria-pressed={settings.accent === accent.id}
                    onclick={() => {
                      onUpdate({ accent: accent.id });
                    }}
                    class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                    class:border-accent={settings.accent === accent.id}
                  >
                    <span class={`size-2.5 rounded-full ${accent.swatch}`} aria-hidden="true"
                    ></span>
                    {accent.label}
                  </button>
                {/each}
              </div>
            </fieldset>
          </div>
        </section>

        <section>
          <h3 class="text-muted text-sm font-semibold tracking-wide uppercase">Display</h3>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.timeFormat === '24h'}
                onchange={() => {
                  onUpdate({ timeFormat: settings.timeFormat === '24h' ? '12h' : '24h' });
                }}
              />
              <span>24-hour time</span>
            </label>
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.showIana}
                onchange={() => {
                  onUpdate({ showIana: !settings.showIana });
                }}
              />
              <span>Show IANA name</span>
            </label>
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.showAbbreviation}
                onchange={() => {
                  onUpdate({ showAbbreviation: !settings.showAbbreviation });
                }}
              />
              <span>Show abbreviation</span>
            </label>
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.showUtcOffset}
                onchange={() => {
                  onUpdate({ showUtcOffset: !settings.showUtcOffset });
                }}
              />
              <span>Show UTC offset</span>
            </label>
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.showDst}
                onchange={() => {
                  onUpdate({ showDst: !settings.showDst });
                }}
              />
              <span>Show DST badge</span>
            </label>
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.showDateLabels}
                onchange={() => {
                  onUpdate({ showDateLabels: !settings.showDateLabels });
                }}
              />
              <span>Show date labels</span>
            </label>
            <label class="flex min-h-9 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={settings.showWorkingHours}
                onchange={() => {
                  onUpdate({ showWorkingHours: !settings.showWorkingHours });
                }}
              />
              <span>Show working hours</span>
            </label>
            <label class="flex min-h-9 items-center justify-between gap-2 text-base">
              <span>Selection step</span>
              <select
                aria-label="Selection step"
                value={settings.stepMinutes}
                onchange={(event) => {
                  onUpdate({
                    stepMinutes: Number(event.currentTarget.value) as Settings['stepMinutes'],
                  });
                }}
                class="border-border bg-surface rounded-lg border px-2.5 py-1.5 text-base"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h3 class="text-muted text-sm font-semibold tracking-wide uppercase">Working hours</h3>
          <div class="mt-2 flex flex-wrap items-end gap-2">
            <label class="text-muted text-sm">
              Start
              <input
                type="time"
                bind:value={workStart}
                class="border-border bg-surface text-text mt-1 block rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <label class="text-muted text-sm">
              End
              <input
                type="time"
                bind:value={workEnd}
                class="border-border bg-surface text-text mt-1 block rounded-lg border px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={invalidHours}
              onclick={saveWorkingHours}
              class="bg-accent text-accent-contrast hover:bg-accent/90 h-10 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Save working hours
            </button>
          </div>
          {#if invalidHours}
            <p class="text-danger mt-1 text-sm">Start and end must differ.</p>
          {:else if workEnd < workStart}
            <p class="text-muted mt-1 text-sm">Overnight window — ends on the next day.</p>
          {/if}
        </section>

        <section>
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-muted text-sm font-semibold tracking-wide uppercase">Zones</h3>
            <button
              type="button"
              onclick={() => {
                onAddZone();
              }}
              class="border-border text-text hover:bg-surface h-9 rounded-lg border px-3 text-sm font-medium"
            >
              Add zone
            </button>
          </div>
          <ul class="mt-2 space-y-1">
            {#each settings.zones as zone, index (zone.timeZone)}
              <li
                class="border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-base font-medium">
                    {zone.label}
                    {#if zone.timeZone === settings.homeZone}
                      <span class="text-accent-text">· home</span>
                    {/if}
                  </p>
                  <p class="text-muted truncate text-sm">{zone.timeZone}</p>
                </div>
                <div class="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label={`Set ${zone.label} as home`}
                    disabled={zone.timeZone === settings.homeZone}
                    onclick={() => {
                      onSetHome(zone.timeZone);
                    }}
                    class="text-muted hover:bg-surface h-8 rounded px-2 text-sm disabled:opacity-30"
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${zone.label} up`}
                    disabled={index === 0}
                    onclick={() => {
                      onReplace(moveZone(settings, zone.timeZone, -1));
                    }}
                    class="text-muted hover:bg-surface h-8 rounded px-2 text-sm disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${zone.label} down`}
                    disabled={index === settings.zones.length - 1}
                    onclick={() => {
                      onReplace(moveZone(settings, zone.timeZone, 1));
                    }}
                    class="text-muted hover:bg-surface h-8 rounded px-2 text-sm disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${zone.label}`}
                    disabled={zone.timeZone === settings.homeZone}
                    onclick={() => {
                      onReplace(removeZone(settings, zone.timeZone));
                    }}
                    class="hover:bg-surface text-danger h-8 rounded px-2 text-sm disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        </section>

        <section>
          <h3 class="text-muted text-sm font-semibold tracking-wide uppercase">Data</h3>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onclick={handleExport}
              class="border-border text-text hover:bg-surface h-10 rounded-lg border px-3 text-sm font-medium"
            >
              Export JSON
            </button>
            <label
              class="border-border text-text hover:bg-surface inline-flex h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium"
            >
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                aria-label="Import JSON"
                class="sr-only"
                onchange={(event) => {
                  void handleImport(event);
                }}
              />
            </label>
            <button
              type="button"
              onclick={resetAll}
              class="hover:bg-surface text-danger h-10 rounded-lg px-3 text-sm font-medium"
            >
              Reset all settings
            </button>
          </div>
          {#if importMessage}
            <p class="text-muted mt-2 text-sm" role="status">{importMessage}</p>
          {/if}
          <p class="text-muted mt-2 text-sm">
            Everything stays in this browser. Clearing site data removes it; export is your backup.
          </p>
        </section>
      </div>

      <footer class="border-border flex justify-end border-t px-4 py-3">
        <button
          type="button"
          onclick={() => {
            onClose();
          }}
          class="border-border text-text hover:bg-surface h-10 rounded-lg border px-3 text-sm font-medium"
        >
          Done
        </button>
      </footer>
    </div>
  </dialog>
{/if}
