<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    onclick,
    children,
  }: {
    label: string;
    onclick: () => void;
    children: Snippet;
  } = $props();
</script>

<button
  type="button"
  aria-label={label}
  title={label}
  {onclick}
  class="text-muted hover:bg-surface hover:text-text inline-flex size-9 items-center justify-center rounded-lg transition-colors"
>
  {@render children()}
</button>
