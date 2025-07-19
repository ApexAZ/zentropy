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
      'react-hooks/exhaustive-deps': 'warn',
      // Custom Tailwind CSS checks
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/bg-opacity-\\d+.*bg-/]',
          message: 'Use bg-color/opacity syntax instead of bg-opacity-* with bg-color (e.g., bg-black/50 instead of bg-opacity-50 bg-black)'
        }
      ]
    }
  },
  {
    // Global Mock Architecture guidance for test files
    files: [
      'src/client/**/*.test.{ts,tsx}',
      'src/client/**/__tests__/**/*.{ts,tsx}'
    ],
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
      // Inherit base rules
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Allow explicit any for mock type assertions
      '@typescript-eslint/no-explicit-any': 'off',
      
      // Performance-Optimized Testing Patterns
      'no-restricted-syntax': [
        'warn',
        // Global Mock Architecture guidance
        {
          selector: 'AssignmentExpression[left.type="MemberExpression"][left.object.name="global"][left.property.name="fetch"]',
          message: '💡 Consider using module-level service mocking instead of global.fetch. See Global Mock Architecture in tests/README.md for better patterns.'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="mockResolvedValueOnce"] Property[key.name="json"]',
          message: '🚀 Consider using service mock scenarios (e.g., TeamServiceScenarios.standardTeam()) instead of manual fetch response mocking for cleaner tests.'
        },
        // Timer and Performance Optimization
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="vi"][callee.property.name="useRealTimers"]',
          message: '⚡ Consider using vi.useFakeTimers() throughout your test for predictable timing and faster execution. Only use vi.useRealTimers() in afterEach cleanup.'
        },
        {
          selector: 'CallExpression[callee.name="waitFor"] > ArrowFunctionExpression, CallExpression[callee.name="waitFor"] > FunctionExpression',
          message: '🚀 Consider using act() with fastStateSync() instead of waitFor for immediate state updates. waitFor should only be used for truly async external dependencies.'
        },
        {
          selector: 'AwaitExpression[argument.callee.name="waitFor"]',
          message: '⚡ Consider replacing await waitFor() with await fastStateSync() for 99%+ performance improvement. Use waitFor only for external async dependencies.'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="userEvent"][callee.property.name="setup"]',
          message: '🚀 Consider using fastUserActions (fireEvent-based) instead of userEvent.setup() for immediate interactions. userEvent is 100x+ slower and can cause timeouts with fake timers.'
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="screen"][callee.property.name="debug"]',
          message: '🧹 Remember to remove screen.debug() before committing - this is for debugging only.'
        },
        // CRITICAL: Manual OAuth timer polling detection
        {
          selector: 'CallExpression[callee.name="setTimeout"] Property[key.name="useGoogleOAuth"]',
          message: '🚨 CRITICAL: Manual OAuth timer polling detected! Use environment-aware OAuth hooks (useGoogleOAuth) which auto-detect test environment for immediate responses. This pattern causes 30-second test timeouts.'
        },
        // MEMORY LEAK: Missing cleanup in useEffect
        {
          selector: 'CallExpression[callee.name="useEffect"] ArrowFunctionExpression[body.type="BlockStatement"]:not(:has(ReturnStatement))',
          message: '🔒 MEMORY LEAK: useEffect missing cleanup return function. Add cleanup like: return () => clearTimeout(timer);'
        },
        // MOCK CLEANUP: Missing vi.clearAllMocks in beforeEach
        {
          selector: 'CallExpression[callee.name="beforeEach"]:not(:has(CallExpression[callee.type="MemberExpression"][callee.object.name="vi"][callee.property.name="clearAllMocks"]))',
          message: '🧹 MOCK CLEANUP: Add vi.clearAllMocks() to beforeEach for test isolation and preventing mock state bleeding.'
        },
        // DEBUG: console.log in tests
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.object.name="console"][callee.property.name=/log|debug|info/]',
          message: '🧹 DEBUG: Remove console.log statements from tests. Use screen.debug() for temporary debugging or proper test assertions.'
        },
        // ARCHITECTURE: Direct global.fetch assignment
        {
          selector: 'AssignmentExpression[left.type="MemberExpression"][left.object.name="global"][left.property.name="fetch"]',
          message: '🏗️ ARCHITECTURE: Use service mocking (e.g., UserService.getCurrentUser = vi.fn()) instead of global.fetch assignment for better test isolation.'
        }
      ],
      
      // High-Performance Testing Patterns
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '@testing-library/react',
              importNames: ['render'],
              message: '⚡ Consider using renderWithFullEnvironment from testRenderUtils for better test infrastructure and 99%+ performance improvement.'
            },
            {
              name: '@testing-library/react',
              importNames: ['waitFor'],
              message: '🚀 Consider using act() with fastStateSync() instead of waitFor for 19ms vs 2000ms+ performance improvement. Only use waitFor for truly async external dependencies.'
            },
            {
              name: '@testing-library/user-event',
              importNames: ['default'],
              message: '⚡ Consider using fireEvent with fastUserActions for immediate interactions (19ms vs 2000ms+ timeouts). Only use userEvent for complex user behavior simulation.'
            }
          ]
        }
      ],
      
      // Timer and Performance Optimization
      'no-restricted-globals': [
        'warn',
        {
          name: 'setTimeout',
          message: '🎯 If mocking OAuth timers, consider using environment-aware OAuth hooks (useGoogleOAuth) which auto-detect test environment for immediate responses. For other timers, use vi.useFakeTimers() and vi.advanceTimersByTime().'
        },
        {
          name: 'setInterval',
          message: '⏰ Use vi.useFakeTimers() and vi.advanceTimersByTime() instead of raw setInterval for predictable test timing and faster execution.'
        },
        {
          name: 'alert',
          message: '🚫 Use toast notifications via useToast() instead of alert() for better user experience and testability.'
        },
        {
          name: 'confirm',
          message: '🚫 Use confirmation modals via components instead of confirm() for better user experience and testability.'
        }
      ]
    }
  }
];