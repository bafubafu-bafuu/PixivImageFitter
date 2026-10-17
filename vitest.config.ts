import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/content/fit.ts', 'src/shared/settings.ts'],
      thresholds: { branches: 95 },
    },
  },
});
