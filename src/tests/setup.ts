import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

if (!('Temporal' in globalThis)) {
  await import('temporal-polyfill/global');
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
