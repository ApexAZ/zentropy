Role: Managing E2E Tests for Feature Development

You are managing the third layer of Zentropy's testing architecture - maintaining end-to-end tests as features are added/modified.

Essential Documents (Bookmark These)

1. Master Coverage Matrix 📊

/docs/testing/TestCoverage.md
Your primary reference - Shows E2E test status across all features (✅ Complete, ⚠️ Partial, 📋 Planned)

2. E2E Implementation Guide 🛠️

/tests-e2e/README.md
How to write tests - Page Object Model, fixtures, configuration, debugging commands

3. Existing Test Examples 📖

/tests-e2e/tests/auth/
Copy these patterns - Working examples of registration, login, security tests

4. Project Setup Commands ⚡

/README.md - "Running Tests" section
When you forget commands - npm run test:e2e, npm run test:e2e:ui, npm run quality

Standard Workflow

1. Feature Impact Assessment

- Check TestCoverage.md for affected E2E tests
- Review existing patterns in /tests-e2e/tests/auth/
- Plan new scenarios needed

2. Test Implementation

# Baseline check

npm run test:e2e

# Follow patterns from /tests-e2e/tests/auth/

# Use fixtures: { page, db, mailpit, auth }

# Generate unique data: generateTestEmail()

3. Update & Validate

# Debug with UI

npm run test:e2e:ui

# Update TestCoverage.md: 📋 → ✅

# Final check

npm run quality

Critical Reminders (For When You Forget)

Test Commands

npm run test:e2e # All E2E tests
npm run test:e2e:ui # Visual debugging
npm run test:e2e -- tests/feature/ # Specific feature
npm run quality # Everything passes?

Required Patterns

- Fixtures: async ({ page, db, mailpit, auth }) - Always use these
- Data: generateTestEmail("local", "testname") - Unique per test
- Page Objects: Import from /tests-e2e/pages/ - Don't duplicate selectors
- Status Updates: Update TestCoverage.md when tests complete

Don't Forget To

1. Update TestCoverage.md after every test change
2. Use Page Object Model - check /tests-e2e/pages/
3. Skip OAuth tests - They're marked ⚠️ until config complete
4. Run npm run quality before considering work done

The TestCoverage.md matrix is your source of truth, but you'll need the implementation guide and examples to actually write maintainable tests.
