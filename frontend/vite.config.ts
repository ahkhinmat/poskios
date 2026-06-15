import { defineConfig } from 'vite';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function buildVersion() {
  const now = new Date();

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('');
}

export default defineConfig({
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(buildVersion()),
  },
});
