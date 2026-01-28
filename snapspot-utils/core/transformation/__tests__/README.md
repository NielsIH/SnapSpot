# Phase 1: Core Transformation - Tests

## Current Test Architecture (Unified Framework)

The tests use the **unified test framework** from `shared/test-framework.js`.

### Test Files

- **`tests.js`** - Main entry point that combines all test suites
- **`affine-transform-tests.js`** - Affine transformation tests (23 tests, 9 suites)
- **`transform-validator-tests.js`** - Transform validator tests (21 tests, 5 suites)
- **`test-runner.html`** - Browser-based test runner UI
- **`README.md`** - This file

### Total Tests: 44 tests across 14 suites

### Running Tests

1. Start a local server:
   ```bash
   cd snapspot-utils
   npx http-server -p 8080 --cors
   ```

2. Open in browser:
   ```
   http://localhost:8080/core/transformation/__tests__/test-runner.html
   ```

3. Click "Run All Tests" to execute all tests

## Test Framework

All tests use the unified test framework which provides:

- ✅ Consistent assertion API (`assert.ok`, `assert.equal`, `assert.closeTo`, etc.)
- ✅ Browser-based UI with clear pass/fail indicators
- ✅ Detailed console logging
- ✅ Suite organization
- ✅ Performance timing

See `shared/test-framework.js` for full API documentation.
