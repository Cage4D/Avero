// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    {
        files: ['src/**/*.ts'],
        rules: {
            'no-console': 'error',
        },
    },
    {
        files: ['src/modules/**/*.controller.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@common/repos/*', '@common/database/*'],
                            message:
                                'Controllers must call services, never repositories or Prisma directly.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/modules/**/*.service.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'express',
                            message:
                                'Services must not depend on Express HTTP types.',
                        },
                    ],
                    patterns: [
                        {
                            group: ['@common/database/*'],
                            message:
                                'Services must access data through @common/repos/*, never Prisma directly.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/modules/core/!(auth)/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@core/auth/*'],
                            message:
                                'Shared auth primitives live in @common/security; avoid cross-module imports from @core/auth.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/lib/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@nestjs/*',
                                '@common/!(enums)/*',
                                '@core/*',
                                'generated/*',
                            ],
                            message:
                                'src/lib must remain pure helpers (only @common/enums/* allowed, no framework or module dependencies).',
                        },
                    ],
                },
            ],
        },
    },
);
