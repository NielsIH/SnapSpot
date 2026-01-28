# Unified Test Framework

**Version:** 1.0.0
**Purpose:** Consistent testing across all SnapSpot Utilities phases

---

## Overview

This framework provides a simple, consistent way to write and run tests for all phases. All tests use the same structure, run in the browser, and display results in a unified UI.

---

## Quick Start

### 1. Create Your Test File

Create `your-module/__tests__/tests.js`:

```javascript
import { assert } from '../../../shared/test-framework.js'
import { yourFunction } from '../your-module.js'

const suite1 = {
  name: 'Suite Name',
  tests: [
    {
      name: 'Test description',
      run() {
        const result = yourFunction(input)
        assert.equal(result, expected)
      }
    }
  ]
}

export const allTests = [suite1]
```

### 2. Create Your Test Runner

Copy `shared/test-runner-template.html` to `your-module/__tests__/test-runner.html`

Update the import path:
```javascript
import { allTests } from './tests.js'
```

Update the title and subtitle:
```javascript
document.getElementById('pageTitle').textContent = 'Your Module Tests'
document.getElementById('pageSubtitle').textContent = 'Testing your module functionality'
```

### 3. Run Your Tests

```bash
npx http-server -p 8080 --cors
# Open http://localhost:8080/your-module/__tests__/test-runner.html
```

---

## API Reference

### `assert` - Assertion Helpers

#### `assert.ok(condition, message)`
Assert that a condition is true.

```javascript
assert.ok(result > 0, 'Result should be positive')
```

#### `assert.equal(actual, expected, message)`
Assert strict equality (`===`).

```javascript
assert.equal(result, 42, 'Should return 42')
```

#### `assert.deepEqual(actual, expected, message)`
Assert deep equality using JSON comparison.

```javascript
assert.deepEqual(
  { a: 1, b: 2 },
  { a: 1, b: 2 },
  'Objects should match'
)
```

#### `assert.closeTo(actual, expected, epsilon, message)`
Assert that numbers are close (within epsilon).

```javascript
assert.closeTo(0.1 + 0.2, 0.3, 1e-10, 'Floating point math')
```

#### `assert.throws(fn, message)`
Assert that a function throws an error.

```javascript
assert.throws(
  () => { throw new Error('Oops') },
  'Should throw error'
)
```

#### `assert.throwsAsync(fn, message)`
Assert that an async function throws an error.

```javascript
await assert.throwsAsync(
  async () => { throw new Error('Async oops') },
  'Should throw async error'
)
```

---

## Test Structure

### Test Suite Object

```javascript
{
  name: 'Suite Name',  // Displayed in UI
  tests: [...]         // Array of test objects
}
```

### Test Object

```javascript
{
  name: 'Test description',  // What you're testing
  run() {                     // Sync or async function
    // Test code here
    assert.equal(actual, expected)
  }
}

// Or async:
{
  name: 'Async test',
  async run() {
    const result = await someAsyncFunction()
    assert.equal(result, expected)
  }
}
```

---

## Complete Example

```javascript
import { assert } from '../../../shared/test-framework.js'
import { calculateSum, asyncFetch } from '../math.js'

const mathTests = {
  name: 'Math Operations',
  tests: [
    {
      name: 'Addition works correctly',
      run() {
        assert.equal(calculateSum(2, 3), 5)
      }
    },
    {
      name: 'Handles negative numbers',
      run() {
        assert.equal(calculateSum(-1, -1), -2)
      }
    }
  ]
}

const asyncTests = {
  name: 'Async Operations',
  tests: [
    {
      name: 'Fetches data correctly',
      async run() {
        const data = await asyncFetch('/api/data')
        assert.ok(data !== null, 'Data should not be null')
      }
    }
  ]
}

export const allTests = [mathTests, asyncTests]
```

---

## UI Output

Tests display in a clean UI with:
- **Total tests** - How many tests ran
- **Passed tests** - How many succeeded (green)
- **Failed tests** - How many failed (red)
- **Per-suite breakdown** - Results grouped by suite
- **Per-test timing** - How long each test took

---

## Console Output

Detailed information is logged to the browser console:

```
🧪 Test Run Started
============================================================
📦 Math Operations
✅ Addition works correctly (0.12ms)
✅ Handles negative numbers (0.08ms)
⏱️  Suite completed in 0.20ms
✅ 2 passed, ❌ 0 failed, 📊 2 total

📦 Async Operations
❌ Fetches data correctly
   Error: Data should not be null
   Stack: ...
⏱️  Suite completed in 5.43ms
✅ 1 passed, ❌ 1 failed, 📊 2 total

============================================================
❌ Some tests failed
📊 3/4 tests passed
```

**Open console (F12) to see:**
- Which tests passed/failed
- Error messages for failures
- Stack traces for debugging
- Timing information

---

## Best Practices

### 1. Organize by Feature

Group related tests into suites:

```javascript
export const allTests = [
  validationTests,
  parsingTests,
  transformationTests
]
```

### 2. Write Descriptive Names

```javascript
// Good
name: 'Handles empty input array gracefully'

// Bad
name: 'Test 1'
```

### 3. One Assertion Per Test

```javascript
// Good
{
  name: 'Returns correct sum',
  run() {
    assert.equal(add(2, 3), 5)
  }
},
{
  name: 'Returns correct product',
  run() {
    assert.equal(multiply(2, 3), 6)
  }
}

// Bad
{
  name: 'Math operations',
  run() {
    assert.equal(add(2, 3), 5)
    assert.equal(multiply(2, 3), 6)  // If this fails, we don't know which one
  }
}
```

### 4. Test Edge Cases

```javascript
const edgeCaseTests = {
  name: 'Edge Cases',
  tests: [
    { name: 'Handles null input', run() { /* ... */ } },
    { name: 'Handles undefined input', run() { /* ... */ } },
    { name: 'Handles empty array', run() { /* ... */ } },
    { name: 'Handles very large numbers', run() { /* ... */ } }
  ]
}
```

### 5. Use Meaningful Error Messages

```javascript
// Good
assert.equal(result, expected, 'Sum should equal 5 for inputs [2, 3]')

// Bad
assert.equal(result, expected)
```

---

## Files

- `shared/test-framework.js` - Core framework
- `shared/test-runner-template.html` - HTML template
- `shared/test-template.js` - Test file template
- `shared/TEST_FRAMEWORK.md` - This documentation

---

## Adding Tests for a New Phase

See [WORKFLOW.md](../docs/WORKFLOW.md) for complete instructions on integrating tests when completing a phase.

---

## Migration from Old Tests

If you have existing tests in a different format:

1. Create new `tests.js` following the template
2. Convert each test to the suite structure
3. Replace the test runner HTML with the template
4. Update the unified test hub to link to your new runner

---

## FAQ

**Q: Can I run tests from the command line?**
A: Not currently. Tests are browser-based and require a web server. Use `npx http-server`.

**Q: Why browser-based?**
A: Many modules use browser APIs (crypto, FileReader, Blob) that don't exist in Node.

**Q: Can I customize the UI?**
A: Yes, copy `test-runner-template.html` and modify the styles.

**Q: How do I test async code?**
A: Use `async run()` and `await` inside your test function.

**Q: What if my test needs setup/teardown?**
A: Run setup code at the start of your test function, teardown at the end.

```javascript
{
  name: 'Test with setup',
  async run() {
    // Setup
    const resource = await createResource()

    // Test
    assert.ok(resource)

    // Teardown
    await resource.cleanup()
  }
}
```

---

## Support

For questions or issues with the test framework, see the main project documentation or check existing test files for examples.
