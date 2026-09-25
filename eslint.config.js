// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/**', '.expo/**', 'android/**', 'ios/**', 'coverage/**'],
  },
  {
    files: ['src/features/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/**', '**/presentation/**'],
              message: 'domain must not import data or presentation.',
            },
            {
              group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'],
              message: 'domain must be framework-free.',
            },
            {
              group: ['@supabase/*', '@tanstack/*', 'zustand', 'nativewind'],
              message: 'domain must not depend on backend/state/UI libraries.',
            },
            {
              group: [
                '@/core/*',
                '!@/core/errors',
                '!@/core/errors/*',
                '!@/core/time',
                '!@/core/time/*',
              ],
              message: 'domain may only import @/core/errors and @/core/time from core.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
