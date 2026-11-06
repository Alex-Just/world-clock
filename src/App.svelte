<script lang="ts">
  import { onMount } from 'svelte';
  import { installShortcuts } from '$lib/actions/shortcuts';
  import AddZoneDialog from '$lib/components/AddZoneDialog.svelte';
  import Board from '$lib/components/Board.svelte';
  import DayStrip from '$lib/components/DayStrip.svelte';
  import DurationDialog from '$lib/components/DurationDialog.svelte';
  import Header from '$lib/components/Header.svelte';
  import RangeBar from '$lib/components/RangeBar.svelte';
  import RenameZoneDialog from '$lib/components/RenameZoneDialog.svelte';
  import SetTimePopover from '$lib/components/SetTimePopover.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ShortcutsDialog from '$lib/components/ShortcutsDialog.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { addZone, moveZone, removeZone, renameZone } from '$lib/settings/mutations';
  import { applyAppearance } from '$lib/settings/theme';
  import type { Settings, ZoneSetting } from '$lib/settings/types';
  import { boardStore } from '$lib/state/board.svelte';
  import { clockStore } from '$lib/state/clock.svelte';
  import { storageAvailable } from '$lib/settings/storage';
  import { settingsStore, startSettingsSync } from '$lib/state/settings.svelte';
  import { defaultLabel } from '$lib/time/zones';
  import type { DateString, InstantMs, NormalizedRange, ZoneId } from '$lib/time/types';

  const persistenceAvailable = storageAvailable();

  const homeLabel = $derived(
    settingsStore.value.zones.find((zone) => zone.timeZone === settingsStore.value.homeZone)
      ?.label ?? settingsStore.value.homeZone,
  );

  function selectDate(date: DateString): void {
    boardStore.goToDay(date);
  }

  function shiftDay(days: number): void {
    boardStore.shiftDay(days);
  }

  function goToday(): void {
    boardStore.now();
  }

  function setBoardFocus(instantMs: InstantMs): void {
    boardStore.setFocus(instantMs);
  }

  function extendBoardRange(minutes: number): void {
    boardStore.extendRange(minutes);
  }

  function setBoardRange(startMs: InstantMs, endMs: InstantMs): void {
    boardStore.setRange(startMs, endMs, { focus: 'keep' });
  }

  function clearBoardRange(): void {
    boardStore.clearRange();
  }

  let durationOpen = $state(false);
  let setTimeOpen = $state(false);
  let addZoneOpen = $state(false);
  let settingsOpen = $state(false);
  let helpOpen = $state(false);
  let renameFor = $state<ZoneSetting | null>(null);
  let removed = $state<{ zone: ZoneSetting; index: number } | null>(null);

  function openDuration(): void {
    if (!boardStore.range) {
      boardStore.setRange(boardStore.focusMs, boardStore.focusMs + 3_600_000);
    }
    durationOpen = true;
  }

  function handleAddZone(timeZone: string): void {
    const current = settingsStore.value;
    const next = addZone(current, { timeZone, label: defaultLabel(timeZone) });
    if (next !== current) settingsStore.replace(next);
    addZoneOpen = false;
  }

  function handleSetHome(zone: ZoneId): void {
    boardStore.setHomeZone(zone);
  }

  function handleRename(zone: ZoneId): void {
    const found = settingsStore.value.zones.find((entry) => entry.timeZone === zone);
    if (found) renameFor = found;
  }

  function handleMove(zone: ZoneId, delta: -1 | 1): void {
    settingsStore.replace(moveZone(settingsStore.value, zone, delta));
  }

  function handleRemove(zone: ZoneId): void {
    const current = settingsStore.value;
    const index = current.zones.findIndex((entry) => entry.timeZone === zone);
    const target = current.zones[index];
    if (index < 0 || !target || zone === current.homeZone) return;
    settingsStore.replace(removeZone(current, zone));
    removed = { zone: target, index };
  }

  function undoRemove(): void {
    if (!removed) return;
    const target = removed;
    const current = settingsStore.value;
    if (current.zones.some((entry) => entry.timeZone === target.zone.timeZone)) return;
    const zones = [...current.zones];
    zones.splice(Math.min(target.index, zones.length), 0, target.zone);
    settingsStore.replace({ ...current, zones });
    removed = null;
  }

  function handleRenameSubmit(label: string): void {
    if (!renameFor) return;
    settingsStore.replace(renameZone(settingsStore.value, renameFor.timeZone, label));
    renameFor = null;
  }

  function updateSettings(patch: Partial<Settings>): void {
    settingsStore.update(patch);
  }

  function replaceSettings(next: Settings): void {
    settingsStore.replace(next);
  }

  function addZoneFromSettings(): void {
    settingsOpen = false;
    addZoneOpen = true;
  }

  onMount(() => {
    const stopClock = clockStore.start();
    const stopSync = startSettingsSync();
    const stopShortcuts = installShortcuts(
      {
        now: () => {
          boardStore.now();
        },
        nudge: (minutes) => {
          boardStore.nudge(minutes);
        },
        extendRange: (minutes) => {
          boardStore.extendRange(minutes);
        },
        shiftDay: (days) => {
          boardStore.shiftDay(days);
        },
        setDayEdge: (edge) => {
          boardStore.setFocus(edge === 'start' ? boardStore.axis.startMs : boardStore.axis.endMs);
        },
        openAddZone: () => {
          addZoneOpen = true;
        },
        openSettings: () => {
          settingsOpen = true;
        },
        openHelp: () => {
          helpOpen = true;
        },
        resetBoard: () => {
          if (boardStore.range) {
            boardStore.clearRange();
          } else {
            boardStore.now();
          }
        },
      },
      window,
      () => settingsStore.value.stepMinutes,
    );

    return () => {
      stopClock();
      stopSync();
      stopShortcuts();
    };
  });

  $effect(() => {
    applyAppearance(settingsStore.value);
  });
</script>

<div class="bg-surface text-text min-h-dvh">
  <a
    href="#board"
    class="bg-surface-raised sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm focus:shadow"
  >
    Skip to board
  </a>
  <Header
    focusMs={boardStore.focusMs}
    nowMs={clockStore.nowMs}
    homeZone={settingsStore.value.homeZone}
    zoneLabel={homeLabel}
    format={settingsStore.value.timeFormat}
    followNow={boardStore.followNow}
    windowOffsetHours={boardStore.windowOffsetHours}
    onNow={() => {
      boardStore.now();
    }}
    onOpenSetTime={() => {
      setTimeOpen = true;
    }}
    onOpenDuration={openDuration}
    onOpenAddZone={() => {
      addZoneOpen = true;
    }}
    onOpenSettings={() => {
      settingsOpen = true;
    }}
    onShiftWindow={(hours: number) => {
      boardStore.shiftWindow(hours);
    }}
    onResetWindow={() => {
      boardStore.resetWindow();
    }}
  >
    <DayStrip
      viewDate={boardStore.viewDate}
      homeZone={settingsStore.value.homeZone}
      onSelectDate={selectDate}
      onShiftDay={shiftDay}
      onToday={goToday}
      inline
    />
  </Header>

  {#if !persistenceAvailable}
    <div role="status" class="border-warning/30 bg-warning/10 text-warning px-4 py-2 text-xs">
      Settings can't be saved in this browser. Changes last until you reload.
    </div>
  {/if}

  <main id="board" class="p-4 sm:p-6">
    <div class="mb-3 h-12">
      {#if boardStore.range}
        <RangeBar
          range={boardStore.range}
          zones={settingsStore.value.zones}
          settings={settingsStore.value}
          onClear={clearBoardRange}
          onDetails={() => {
            durationOpen = true;
          }}
        />
      {:else}
        <div
          class="border-border text-muted flex h-full items-center rounded-xl border border-dashed px-3 text-sm"
        >
          Click and drag the board to select a period.
        </div>
      {/if}
    </div>

    <Board
      axis={boardStore.axis}
      zones={settingsStore.value.zones}
      homeZone={settingsStore.value.homeZone}
      focusMs={boardStore.focusMs}
      nowMs={clockStore.nowMs}
      followNow={boardStore.followNow}
      range={boardStore.range}
      settings={settingsStore.value}
      onSetFocus={setBoardFocus}
      onNow={goToday}
      onSetRange={setBoardRange}
      onRangeChange={setBoardRange}
      onExtendRange={extendBoardRange}
      onClearRange={clearBoardRange}
      onSetHome={handleSetHome}
      onRename={handleRename}
      onMove={handleMove}
      onRemove={handleRemove}
    />
  </main>

  {#if addZoneOpen}
    <AddZoneDialog
      open
      zones={settingsStore.value.zones}
      onAdd={handleAddZone}
      onClose={() => {
        addZoneOpen = false;
      }}
    />
  {/if}

  {#if setTimeOpen}
    <SetTimePopover
      open
      focusMs={boardStore.focusMs}
      homeZone={settingsStore.value.homeZone}
      format={settingsStore.value.timeFormat}
      onApply={(instantMs: InstantMs) => {
        boardStore.setFocus(instantMs);
        setTimeOpen = false;
      }}
      onNow={() => {
        boardStore.now();
      }}
      onClose={() => {
        setTimeOpen = false;
      }}
    />
  {/if}

  {#if durationOpen && boardStore.range}
    <DurationDialog
      open
      range={boardStore.range}
      zones={settingsStore.value.zones}
      settings={settingsStore.value}
      onApply={(next: NormalizedRange) => {
        boardStore.setRange(next.startMs, next.endMs);
        durationOpen = false;
      }}
      onClose={() => {
        durationOpen = false;
      }}
    />
  {/if}

  {#if renameFor}
    <RenameZoneDialog
      open
      zone={renameFor}
      onRename={handleRenameSubmit}
      onClose={() => {
        renameFor = null;
      }}
    />
  {/if}

  {#if removed}
    <Toast
      message={`Removed ${removed.zone.label}`}
      actionLabel="Undo"
      onAction={() => {
        undoRemove();
      }}
      onDismiss={() => {
        removed = null;
      }}
    />
  {/if}

  {#if helpOpen}
    <ShortcutsDialog
      open
      onClose={() => {
        helpOpen = false;
      }}
    />
  {/if}

  {#if settingsOpen}
    <SettingsDialog
      open
      settings={settingsStore.value}
      onUpdate={updateSettings}
      onReplace={replaceSettings}
      onAddZone={addZoneFromSettings}
      onSetHome={handleSetHome}
      onClose={() => {
        settingsOpen = false;
      }}
    />
  {/if}
</div>
