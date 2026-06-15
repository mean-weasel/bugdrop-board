import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      miniflare: {
        compatibilityDate: '2024-01-29',
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(join(rootDir, 'migrations')),
        },
        d1Databases: ['DB'],
      },
    })),
  ],
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    exclude: ['test/doctor-selfhost.test.ts'],
    setupFiles: ['./test/apply-migrations.ts'],
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
