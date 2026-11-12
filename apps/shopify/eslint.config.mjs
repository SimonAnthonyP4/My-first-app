import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The .jsx screens use Shopify's `shopify` global and web components; they
  // are linted by the configuration Shopify CLI generates, not this one.
  { ignores: ['node_modules', 'dist', '**/*.jsx', '.shopify'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
);
