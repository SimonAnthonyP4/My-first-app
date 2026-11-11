import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Money is integer cents. Floating-point parsing has no place here.
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Money is integer cents; use parseDollarsToCents.' },
      ],
    },
  },
);
