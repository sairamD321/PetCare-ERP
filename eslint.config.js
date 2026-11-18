import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // Clean architecture: inner layers never import outer ones.
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/application/*', '@/infrastructure/*', '@/presentation/*', '@/app/*', 'react', 'react-*', '@mantine/*'], message: 'domain must stay framework-free and depend on nothing outside domain.' },
      ] }],
    },
  },
  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/infrastructure/*', '@/presentation/*', '@/app/*', 'react', 'react-*', '@mantine/*'], message: 'application may depend only on domain.' },
      ] }],
    },
  },
  {
    files: ['src/infrastructure/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/presentation/*', '@/app/*', 'react', 'react-*', '@mantine/*'], message: 'infrastructure must not depend on the UI.' },
      ] }],
    },
  },
  {
    files: ['src/presentation/**/*.{ts,tsx}'],
    ignores: ['src/presentation/components/icons.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/infrastructure/*', '@/app/*'], message: 'presentation gets infrastructure through the services container (useServices), never directly.' },
        ],
        paths: [
          { name: '@tabler/icons-react', message: "Import icons from '@/presentation/components/icons' (the barrel loads all 6,500 icons in dev)." },
        ],
      }],
    },
  },
])
