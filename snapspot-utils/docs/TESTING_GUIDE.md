# Testing Guide for SnapSpot Utilities

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Purpose:** Complete guide for creating and running tests across all phases

---

## Overview

All SnapSpot Utilities use a unified testing framework that:
- ✅ Runs in the browser (works with browser-only APIs)
- ✅ Provides consistent UI and console output
- ✅ Uses simple assertion helpers
- ✅ Groups tests into logical suites
- ✅ Shows detailed error messages and timing

**No build tools, no configuration - just import and test.**

---

## Quick Start

### 1. Create Your Test File

**Location:** `your-module/__tests__/tests.js`

```javascript
import { assert } from '../../../shared/test-framework.js'
import { yourFunction } from '../your-module.js'

// Test Suite 1
const featureTests = {
  name: 'Feature Tests',
  tests: [
    {
      name: 'Specific behavior to test',
      run () {
        const result = yourFunction(input)
        assert.equal(result, expected, 'Should return expected value')
      }
    },
    {
      name: 'Async operation test',
      async run () {
        const result = await asyncFunction()
        assert.ok(result, 'Should return a result')
      }
    }
  ]
}

// Export all suites
export const allTests = [featureTests]
```

### 2. Copy Test Runner Template

**Location:** `your-module/__tests__/test-runner.html`

Copy from any existing phase (e.g., Phase 1) and update:
- Page title in `<title>` tag
- `h1` text content
- `.subtitle` text content
- Import path to your `tests.js`

### 3. Run Your Tests

```bash
cd snapspot-utils
npx http-server -p 8080 --cors
# Open http://localhost:8080/your-module/__tests__/test-runner.html
```

Click **"Run All Tests"** - results appear in UI and console (F12).

---

## Test Structure

### Test Suite Format

```javascript
const testSuite = {
  name: 'Suite Name',  // Displayed in UI
  tests: [              // Array of test objects
    {
      name: 'Test description',
      run () {
        // Sync test code
      }
    },
    {
      name: 'Async test description',
      async run () {
        // Async test code
      }
    }
  ]
}

export const allTests = [testSuite]
```

**Key Points:**
- Use `run ()` for sync tests
- Use `async run ()` for async tests
- Must export `allTests` array
- Each suite needs a descriptive `name`

---

## Assertion API

```javascript
import { assert } from '../../../shared/test-framework.js'
```

### Available Assertions

```javascript
// Basic assertions
assert.ok(condition, message)
assert.equal(actual, expected, message)
assert.deepEqual(obj1, obj2, message)

// Numeric assertions
assert.closeTo(actual, expected, epsilon, message)

// Exception assertions
assert.throws(fn, message)
await assert.throwsAsync(asyncFn, message)
```

### Examples

```javascript
// Truthiness
assert.ok(result > 0, 'Result should be positive')

// Equality
assert.equal(result, 42, 'Should return 42')

// Object equality
assert.deepEqual(
  { a: 1, b: 2 },
  { a: 1, b: 2 },
  'Objects should match'
)

// Approximate equality
assert.closeTo(0.1 + 0.2, 0.3, 1e-10, 'Floating point math')

// Exceptions
assert.throws(
  () => parseData(null),
  'Should throw on null input'
)

await assert.throwsAsync(
  async () => await loadFile(null),
  'Should reject on null file'
)
```

---

## Console Output

When tests run, detailed output appears in the browser console:

```
🧪 Test Run Started
============================================================
📦 Feature Tests
✅ Specific behavior to test (0.42ms)
✅ Async operation test (5.23ms)
⏱️  Suite completed in 5.65ms
✅ 2 passed, ❌ 0 failed, 📊 2 total
============================================================
✅ All tests passed!
📊 2/2 tests passed
```

**On Failure:**
```
❌ Specific behavior to test
   Error: Expected: 42
   Actual: 43
   Stack: at run (tests.js:12:16)
```

**Always open DevTools (F12) to see full details!**

---

## Best Practices

### 1. Descriptive Test Names

```javascript
// ✅ Good
{ name: 'Handles empty input array gracefully', run () { /* ... */ } }

// ❌ Bad
{ name: 'Test 1', run () { /* ... */ } }
```

### 2. One Assertion Per Test (When Possible)

```javascript
// ✅ Good
{
  name: 'Returns correct sum',
  run () { assert.equal(add(2, 3), 5) }
}

// ⚠️ Acceptable for related checks
{
  name: 'Initializes with correct defaults',
  run () {
    const obj = new MyClass()
    assert.equal(obj.zoom, 1.0)
    assert.equal(obj.panX, 0)
    assert.equal(obj.panY, 0)
  }
}
```

### 3. Test Edge Cases

```javascript
const edgeCases = {
  name: 'Edge Cases',
  tests: [
    { name: 'Handles null', run () { /* ... */ } },
    { name: 'Handles undefined', run () { /* ... */ } },
    { name: 'Handles empty array', run () { /* ... */ } },
    { name: 'Handles large numbers', run () { /* ... */ } }
  ]
}
```

### 4. Use Meaningful Error Messages

```javascript
// ✅ Good
assert.equal(result, 5, 'Sum of [2, 3] should equal 5')

// ⚠️ Acceptable (has default)
assert.equal(result, 5)
```

### 5. Clean Up After Tests

```javascript
{
  name: 'Test with DOM',
  run () {
    const el = document.createElement('div')
    document.body.appendChild(el)
    
    // Test...
    
    document.body.removeChild(el)  // Cleanup
  }
}
```

---

## Adding Tests When Completing a Phase

### Step 1: Create Test File

Create `your-module/__tests__/tests.js` following the examples above.

### Step 2: Copy Test Runner

Copy `test-runner.html` from Phase 1, 2, or 3 and update the title and subtitle.

### Step 3: Run Tests Locally

```bash
npx http-server -p 8080 --cors
# Open test runner, click "Run All Tests"
# Fix any failures
```

### Step 4: Add to Test Hub

Edit `tests/test-runner.html` and add your phase card:

```html
<a href="../your-module/__tests__/test-runner.html" target="_blank" class="test-card">
  <div class="test-header">
    <div class="test-icon">🔧</div>
    <div class="test-info">
      <h2>Phase X</h2>
      <div class="test-phase">Module Name</div>
    </div>
  </div>
  <div class="test-description">
    Brief description of tested functionality.
  </div>
  <div class="test-stats">
    <div class="stat">
      <div class="stat-value">27</div>
      <div class="stat-label">Tests</div>
    </div>
    <div class="stat">
      <div class="stat-value">2</div>
      <div class="stat-label">Suites</div>
    </div>
    <div class="stat">
      <div class="stat-value">✅</div>
      <div class="stat-label">Status</div>
    </div>
  </div>
</a>
```

Also update the total test count in the Quick Start box.

### Step 5: Update index.html

Update the test count in `index.html`:

```html
<span class="tile-status status-active">XX Tests</span>
```

### Step 6: Document in Phase Doc

In `IMPLEMENTATION_PHASE_X.md`:

```markdown
## Test Results

**Total Tests:** 27
**Passed:** 27 ✅
**Failed:** 0

**Test Suites:**
- Suite 1: 12 tests ✅
- Suite 2: 15 tests ✅

All tests passing.
```

---

## Completion Checklist

When finishing phase tests:

- [ ] Created `__tests__/tests.js` with all suites
- [ ] Created `__tests__/test-runner.html` from template
- [ ] All tests pass in browser
- [ ] Console output is clean
- [ ] Added card to `tests/test-runner.html`
- [ ] Updated test count in hub
- [ ] Updated `index.html` test count
- [ ] Documented results in phase document

---

## Example: Complete Test File

```javascript
import { assert } from '../../../shared/test-framework.js'
import { CanvasRenderer } from '../canvas-helpers.js'

const constructorTests = {
  name: 'Constructor',
  tests: [
    {
      name: 'Initializes with correct defaults',
      run () {
        const canvas = document.createElement('canvas')
        const renderer = new CanvasRenderer(canvas)
        
        assert.equal(renderer.state.zoom, 1.0)
        assert.equal(renderer.state.panX, 0)
        assert.equal(renderer.state.panY, 0)
      }
    },
    {
      name: 'Throws on null canvas',
      run () {
        assert.throws(
          () => new CanvasRenderer(null),
          'Should throw for null canvas'
        )
      }
    }
  ]
}

const renderingTests = {
  name: 'Rendering',
  tests: [
    {
      name: 'Clears canvas',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)
        
        renderer.clear()
        
        const ctx = canvas.getContext('2d')
        const data = ctx.getImageData(0, 0, 800, 600).data
        const allZero = data.every((v, i) => i % 4 === 3 ? v === 0 : true)
        assert.ok(allZero, 'Canvas should be cleared')
      }
    }
  ]
}

export const allTests = [constructorTests, renderingTests]
```

---

## Reference Files

- **Framework:** [shared/test-framework.js](../shared/test-framework.js)
- **Phase 1 Tests:** [core/transformation/__tests__/tests.js](../core/transformation/__tests__/tests.js)
- **Phase 2 Tests:** [core/formats/snapspot/__tests__/tests.js](../core/formats/snapspot/__tests__/tests.js)
- **Phase 3 Tests:** [shared/utils/__tests__/tests.js](../shared/utils/__tests__/tests.js)

---

## Troubleshooting

**Tests don't run:**
- Open DevTools (F12) to see errors
- Check import paths
- Use HTTP server, not file://

**Module import errors:**
- Use `npx http-server -p 8080 --cors`
- Verify relative import paths

**Hard to debug failures:**
- Add `console.log()` before assertions
- Use descriptive error messages
- Break complex tests into smaller ones

---

## Summary

✅ **Simple** - Import, write, run  
✅ **Consistent** - Same pattern everywhere  
✅ **Clear** - Detailed output  
✅ **Powerful** - Full assertion API  
✅ **Browser-native** - No build required

**For examples:** See Phases 1-3 test files.
