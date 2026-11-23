import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Money is integer cents. Floating-point parsing has no place here.
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Money is integer cents; use parseDollarsToCents.' },
      ],
    },
  },
];

export default config;
