import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    // Global ignores
    ignores: [
      // Build output
      'dist/',
      'node_modules/',
      // IDE files
      '.vscode/',
      '.idea/',
      // OS files
      '.DS_Store',
      'Thumbs.db',
      // Logs
      '*.log',
      'npm-debug.log*',
      // Environment files
      '.env',
      '.env.local',
      '.env.production'
    ]
  },
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      // Basic rules that don't require TypeScript project configuration
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];