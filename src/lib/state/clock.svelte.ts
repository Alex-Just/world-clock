export interface ClockStore {
  readonly nowMs: number;
  start(): () => void;
}

export function createClockStore(now: () => number = Date.now): ClockStore {
  let nowMs = $state(now());
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let running = false;

  const tick = () => {
    nowMs = now();
  };

  const clearTimers = () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (intervalId !== undefined) clearInterval(intervalId);
    timeoutId = undefined;
    intervalId = undefined;
  };

  const schedule = () => {
    const remainder = now() % 1000;
    const delay = remainder === 0 ? 1000 : 1000 - remainder;
    timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 1000);
    }, delay);
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTimers();
      return;
    }
    if (!running) return;
    tick();
    clearTimers();
    schedule();
  };

  const stop = () => {
    running = false;
    clearTimers();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  const start = () => {
    if (running) return stop;
    running = true;
    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return stop;
  };

  return {
    get nowMs() {
      return nowMs;
    },
    start,
  };
}

export const clockStore = createClockStore();
