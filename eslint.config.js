// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
const tseslint = require('typescript-eslint');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintConfigLove = require('eslint-config-love').default || require('eslint-config-love');
const eslintConfigPrettier = require('eslint-config-prettier');
const eslintPluginHeader = require('eslint-plugin-header');
const eslintPluginNoNull = require('eslint-plugin-no-null');
const eslintPluginTsdoc = require('eslint-plugin-tsdoc');
const importPlugin = require('eslint-plugin-import');

module.exports = tseslint.config(
    {
        ignores: [
            'node_modules/**',
            '**/*.json',
            '**/*.gen.ts',
            'dist/**',
            'types/*.d.ts',
            'out/**',
            '*.js', // Ignore all JS files at root level
        ],
    },
    eslintConfigLove,
    eslintConfigPrettier,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
            header: eslintPluginHeader,
            'no-null': eslintPluginNoNull,
            tsdoc: eslintPluginTsdoc,
            prettier: eslintPluginPrettier,
            import: importPlugin,
        },
        rules: {
            curly: 2,
            'tsdoc/syntax': 'warn',
            'no-async-promise-executor': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/typedef': 'warn',
            '@typescript-eslint/prefer-regexp-exec': 'off',
            '@typescript-eslint/consistent-type-assertions': 'off',
            '@typescript-eslint/ban-ts-ignore': 'off',
            '@typescript-eslint/class-name-casing': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/camelcase': 'off',
            'no-useless-escape': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-namespace': 'off',
            'no-inner-declarations': 'off',
            'no-extra-semi': 'off',
            'no-null/no-null': 'error',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'no-constant-condition': ['error', { checkLoops: false }],
            'no-empty': 'off',
            // Additional overrides for eslint-config-love compatibility
            '@typescript-eslint/naming-convention': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off',
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/array-type': 'off',
            '@typescript-eslint/no-base-to-string': 'off',
            '@typescript-eslint/promise-function-async': 'off',
            '@typescript-eslint/prefer-promise-reject-errors': 'off',
            '@typescript-eslint/return-await': 'off',
            '@typescript-eslint/prefer-optional-chain': 'off',
            '@typescript-eslint/lines-between-class-members': 'off',
            '@typescript-eslint/no-confusing-void-expression': 'off',
            eqeqeq: 'off',
            'object-shorthand': 'off',
            'no-useless-return': 'off',
            'no-template-curly-in-string': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/prefer-readonly': 'off',
            '@typescript-eslint/method-signature-style': 'off',
            // Additional overrides for new rules in eslint-config-love@140.0.0
            '@typescript-eslint/no-magic-numbers': 'off',
            '@typescript-eslint/max-params': 'off',
            '@typescript-eslint/no-unnecessary-template-expression': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/prefer-for-of': 'off',
            '@typescript-eslint/prefer-destructuring': 'off',
            '@typescript-eslint/init-declarations': 'off',
            'no-plusplus': 'off',
            'no-param-reassign': 'off',
            radix: 'off',
            'no-await-in-loop': 'off',
            'logical-assignment-operators': 'off',
            'no-console': 'off',
            'no-useless-assignment': 'off',
            'import/enforce-node-protocol-usage': 'off',
            'prefer-named-capture-group': 'off',
            'promise/avoid-new': 'off',
            complexity: 'off',
            'arrow-body-style': 'off',
            'max-depth': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'eslint-comments/require-description': 'off',
            '@typescript-eslint/no-unsafe-type-assertion': 'off',
            'no-negated-condition': 'off',
            '@typescript-eslint/class-methods-use-this': 'off',
            'max-lines': 'off',
            'guard-for-in': 'off',
            'sort-imports': [
                'error',
                {
                    ignoreCase: false,
                    ignoreDeclarationSort: true,
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
                    allowSeparatedGroups: true,
                },
            ],
            'import/no-unresolved': 'off',
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        ['sibling', 'parent'],
                        'index',
                        'unknown',
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
    }
);
