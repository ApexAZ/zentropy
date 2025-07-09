# Test Suite Audit Findings

This document outlines findings from a full audit of the project's test suite, focusing on configuration, test discovery, and execution via the defined quality commands.

---

### Finding 1: Backend test command is overly specific and misses tests

**Observation:**
The `test` and `test:python` scripts in `package.json` explicitly list the Python test files to be executed. For example, the main `test` script only runs `tests/test_startup.py` and `tests/test_api_integration.py`.

**Configuration:**
- **`package.json` script:** `"test": "python3 -m pytest tests/test_startup.py tests/test_api_integration.py && npm run test:frontend"`
- **`pytest.ini` config:** Pytest is configured to automatically discover all files matching `test_*.py` within the `tests/` directory.

**Impact:**
The script completely bypasses pytest's own discovery mechanism. A search for all backend tests reveals that the current command executes only **2 out of 17 test files**. The remaining 15 test files, covering critical areas like OAuth, role systems, rate limiting, and security, are being ignored by the `npm run test` and `npm run quality` commands. This creates a high risk of regressions going undetected.

**Recommendation:**
Modify the script to be generic (`python3 -m pytest`) to allow pytest to handle test discovery as configured.

---

### Finding 2: Frontend test command is overly specific and misses tests

**Observation:**
The `test:frontend` script in `package.json` explicitly lists the directories for Vitest to run, overriding the superior discovery pattern configured in `vitest.config.ts`.

**Configuration:**
- **`package.json` script:** `"test:frontend": "vitest run src/client/__tests__/ src/client/components/__tests__/ src/client/services/__tests__/"`
- **`vitest.config.ts` config:** Vitest is configured to automatically discover all files matching `src/client/**/*.{test,spec}.{js,ts,tsx}`.

**Impact:**
The script prevents Vitest from looking in all the locations defined in its configuration. A search for all frontend tests reveals that **18 out of 28 test files** are currently being ignored by the `npm run test` and `npm run quality` commands. 

The following directories containing tests are entirely missed:
- `src/client/hooks/__tests__/` (4 test files)
- `src/client/pages/__tests__/` (8 test files)
- `src/client/utils/__tests__/` (1 test file)
- `src/client/components/atoms/__tests__/` (3 test files)

This means critical tests for pages, custom hooks, and atomic components are not being executed as part of the standard quality checks.

**Recommendation:**
Modify the script to be generic (`vitest run`) to allow Vitest to handle test discovery as configured.
