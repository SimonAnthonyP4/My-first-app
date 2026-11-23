import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Logic and API-client tests run in Node. The screen tests ask for a DOM
    // themselves (`@vitest-environment jsdom` at the top of the file).
    environment: 'node',
    include: ['extensions/**/*.test.ts'],
    server: {
      deps: {
        // Shopify's tester imports the screen's .tsx file itself; inlining it
        // lets that import go through the same transform as the tests.
        inline: ['@shopify/ui-extensions-tester'],
      },
    },
  },
});
