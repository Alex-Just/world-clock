import { createDefaultSettings } from '$lib/settings/defaults';
import { loadSettings, saveSettings, subscribeToStorage } from '$lib/settings/storage';
import type { Settings } from '$lib/settings/types';

export interface SettingsStore {
  readonly value: Settings;
  update(patch: Partial<Settings>): void;
  replace(next: Settings, options?: { persist?: boolean }): void;
  reset(): void;
}

export function createSettingsStore(
  initial: Settings,
  persist: (settings: Settings) => void = saveSettings,
): SettingsStore {
  let value = $state(initial);

  return {
    get value() {
      return value;
    },
    update(patch) {
      value = { ...value, ...patch };
      persist(value);
    },
    replace(next, options) {
      value = next;
      if (options?.persist !== false) persist(value);
    },
    reset() {
      value = createDefaultSettings();
      persist(value);
    },
  };
}

export const settingsStore = createSettingsStore(loadSettings().settings);

export function startSettingsSync(): () => void {
  return subscribeToStorage((next) => {
    settingsStore.replace(next, { persist: false });
  });
}
