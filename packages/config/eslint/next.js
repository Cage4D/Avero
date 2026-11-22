// ESLint flat config for the Next.js app.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
];
