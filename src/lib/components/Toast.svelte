<script lang="ts">
  let {
    message,
    actionLabel,
    onAction,
    onDismiss,
    durationMs = 5000,
  }: {
    message: string;
    actionLabel: string;
    onAction: () => void;
    onDismiss: () => void;
    durationMs?: number;
  } = $props();

  $effect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => {
      clearTimeout(timer);
    };
  });
</script>

<div
  role="status"
  class="border-border bg-surface-raised text-text fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-3 py-2 text-xs shadow-xl"
>
  <span>{message}</span>
  <button
    type="button"
    onclick={() => {
      onAction();
    }}
    class="text-accent-text font-semibold hover:underline"
  >
    {actionLabel}
  </button>
  <button
    type="button"
    aria-label="Dismiss"
    onclick={() => {
      onDismiss();
    }}
    class="text-muted hover:text-text"
  >
    <span aria-hidden="true">×</span>
  </button>
</div>
