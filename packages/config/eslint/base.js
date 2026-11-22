// Shared ESLint flat config for TypeScript packages.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/generated/**', '**/.turbo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
