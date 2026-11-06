import './app.css';

async function bootstrap() {
  if (!('Temporal' in globalThis)) {
    await import('temporal-polyfill/global');
  }

  const { mount } = await import('svelte');
  const { default: App } = await import('./App.svelte');
  const target = document.getElementById('app');
  if (!target) throw new Error('Missing #app');
  mount(App, { target });
}

void bootstrap();
