# Phase 2: SnapSpot Format Handlers - Tests

## Current Test Architecture (Unified Framework)

The tests have been migrated to use the **unified test framework** from `shared/test-framework.js`.

### Active Test Files

- **`integration.test.js`** - All test suites for validator, parser, writer, and integration
- **`test-runner.html`** - Browser-based test runner UI
- **`fixtures/`** - Test data files (JSON exports)

### Test Suites

1. **Validator** - 7 tests
   - Version support validation
   - Export structure validation
   - Dimension validation

2. **Parser** - 9 tests
   - Base64/Blob conversion
   - Export parsing
   - Metadata extraction
   - Coordinate validation

3. **Writer** - 5 tests
   - ID generation
   - Hash generation
   - Export building

4. **Integration** - 4 tests
   - Round-trip parsing and rebuilding
   - Data integrity checks
   - Performance tests (500 markers)

### Total Tests: 25 tests across 4 suites

### Running Tests

1. Start a local server:
   ```bash
   cd snapspot-utils
   npx http-server -p 8080 --cors
   ```

2. Open in browser:
   ```
   http://localhost:8080/core/formats/snapspot/__tests__/test-runner.html
   ```

3. Click "Run All Tests" to execute all tests

## Test Framework

All tests use the unified test framework which provides:

- ✅ Consistent assertion API (`assert.ok`, `assert.equal`, `assert.throws`, etc.)
- ✅ Async test support (`assert.throwsAsync`)
- ✅ Browser-based UI with clear pass/fail indicators
- ✅ Detailed console logging
- ✅ Suite organization
- ✅ Performance timing

See `shared/test-framework.js` for full API documentation.

## Test Utilities

The `TestUtils` object in `integration.test.js` provides:
- `loadFixture(filename)` - Load test fixtures from multiple possible paths
