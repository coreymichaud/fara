import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/*.mjs'],
      exclude: ['src/app/api/**/route.ts'],
      reporter: ['text', 'html', 'json-summary', 'json'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
