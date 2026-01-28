# Testing Instructions for Phase Implementation

This document describes how to create and integrate tests when implementing a phase.

---

## Step 1: Create Your Test File

**Location:** `your-module/__tests__/tests.js`

Use the unified test framework pattern:

```javascript
import { assert } from '../../../shared/test-framework.js'
import { yourFunction } from '../your-module.js'

// Test Suite 1
const suite1 = {
  name: 'Feature Name Tests',
  tests: [
    {
      name: 'Specific behavior test',
      run() {
        const result = yourFunction(input)
        assert.equal(result, expected, 'Explanation of what should happen')
      }
    },
    {
      name: 'Async test example',
      async run() {
        const result = await asyncFunction()
        assert.ok(result, 'Result should exist')
      }
    }
  ]
}

// Test Suite 2
const suite2 = {
  name: 'Edge Cases',
  tests: [
    // ... more tests
  ]
}

// Export all suites
export const allTests = [suite1, suite2]
```

**See:** `shared/test-template.js` for a complete template
**Docs:** `shared/TEST_FRAMEWORK.md` for full API reference

---

## Step 2: Create Your Test Runner

**Location:** `your-module/__tests__/test-runner.html`

1. **Copy the template:**
   ```bash
   cp shared/test-runner-template.html your-module/__tests__/test-runner.html
   ```

2. **Customize the title** in the HTML:
   ```javascript
   // Add this in the <script> section after imports
   document.getElementById('pageTitle').textContent = 'Phase X: Module Name'
   document.getElementById('pageSubtitle').textContent = 'Testing module features'
   ```

3. **Verify the import path** to `tests.js` is correct:
   ```javascript
   import { allTests } from './tests.js'
   ```

That's it! The template handles all the UI and test running.

---

## Step 3: Run Your Tests

```bash
cd snapspot-utils
npx http-server -p 8080 --cors
# Open http://localhost:8080/your-module/__tests__/test-runner.html
```

Click "Run All Tests" to execute tests and view results.

**Console Output:** Open DevTools (F12) to see detailed output including:
- Which tests passed/failed
- Error messages and stack traces
- Timing information

---

## Step 4: Add to Test Hub

When phase is complete, add a card to `tests/test-runner.html`:

```html
<!-- Phase X Tests -->
<a href="../your-module/__tests__/test-runner.html" target="_blank" class="test-card">
  <div class="test-header">
    <div class="test-icon">🔧</div>
    <div class="test-info">
      <h2>Phase X</h2>
      <div class="test-phase">Module Name</div>
    </div>
  </div>
  <div class="test-description">
    Brief description of what this phase tests.
  </div>
  <div class="test-stats">
    <div class="stat">
      <div class="stat-value">XX</div>
      <div class="stat-label">Tests</div>
    </div>
    <div class="stat">
      <div class="stat-value">Y</div>
      <div class="stat-label">Suites</div>
    </div>
    <div class="stat">
      <div class="stat-value">✅</div>
      <div class="stat-label">Status</div>
    </div>
  </div>
</a>
```

Update the "Total Coverage" in the Quick Start box:
```html
<strong>Total Coverage:</strong> XXX tests across Y phases<br>
```

---

## Step 5: Update Documentation

In your phase document (`IMPLEMENTATION_PHASE_X.md`), add:

```markdown
## Test Results

**Total Tests:** XX
**Test Suites:** Y
**All Passing:** ✅

| Suite | Tests | Description |
|-------|-------|-------------|
| Suite 1 | 10 | Feature validation |
| Suite 2 | 5 | Edge cases |

**To run tests:**
\`\`\`bash
cd snapspot-utils
npx http-server -p 8080 --cors
# Open http://localhost:8080/your-module/__tests__/test-runner.html
\`\`\`
```

---

## Assertion Reference

### Basic Assertions
- `assert.ok(condition, message)` - Assert true
- `assert.equal(actual, expected, message)` - Assert equality
- `assert.deepEqual(actual, expected, message)` - Assert object equality

### Numeric Assertions
- `assert.closeTo(actual, expected, epsilon, message)` - Assert approximate equality

### Exception Assertions
- `assert.throws(fn, message)` - Assert function throws
- `await assert.throwsAsync(fn, message)` - Assert async function throws

**Full API:** See `shared/TEST_FRAMEWORK.md`

---

## Example: Complete Phase Test Setup

```
your-module/
├── __tests__/
│   ├── tests.js          # Your test suites
│   ├── test-runner.html  # Copied from template
│   └── fixtures/         # Test data files (if needed)
├── your-module.js
└── README.md
```

**tests.js:**
```javascript
import { assert } from '../../../shared/test-framework.js'
import { calculate, validate } from '../your-module.js'

const calculationTests = {
  name: 'Calculation Tests',
  tests: [
    {
      name: 'Basic calculation works',
      run() {
        assert.equal(calculate(2, 3), 5)
      }
    }
  ]
}

const validationTests = {
  name: 'Validation Tests',
  tests: [
    {
      name: 'Validates correct input',
      run() {
        assert.ok(validate('valid'))
      }
    }
  ]
}

export const allTests = [calculationTests, validationTests]
```

**test-runner.html:**
```html
<!-- Copy from shared/test-runner-template.html -->
<!-- Only changes needed: -->
<script type="module">
  import { testRunner, updateUI } from '../../../shared/test-framework.js'
  import { allTests } from './tests.js'

  // Customize title
  document.getElementById('pageTitle').textContent = 'Phase X: Your Module'
  document.getElementById('pageSubtitle').textContent = 'Testing calculations and validation'

  // Rest is the same as template...
</script>
```

---

## Best Practices

1. **Write tests as you implement** - Don't wait until the end
2. **One assertion per test** - Makes failures clearer
3. **Descriptive test names** - "Handles empty array" not "Test 1"
4. **Test edge cases** - null, undefined, empty, very large, etc.
5. **Use meaningful error messages** - Helps with debugging
6. **Group related tests** - Use multiple suites for organization
7. **Check console** - Always review console output during development

---

## Checklist

When implementing tests for your phase:

- [ ] Created `__tests__/tests.js` with test suites
- [ ] Created `__tests__/test-runner.html` from template
- [ ] Customized runner title and subtitle
- [ ] All tests pass when run in browser
- [ ] Added test card to `tests/test-runner.html`
- [ ] Updated `index.html` with test count
- [ ] Documented test results in phase document
- [ ] Verified console output is clean and helpful

---

## Help

- **Framework docs:** `shared/TEST_FRAMEWORK.md`
- **Template:** `shared/test-template.js`
- **Examples:** See Phase 1 and Phase 2 test files for working examples

---

## Summary

The unified test framework provides:
✅ Consistent testing across all phases
✅ Clear UI showing pass/fail counts
✅ Detailed console logging for debugging
✅ Easy to create new tests
✅ Simple to add to test hub
✅ Browser-based (works with all APIs)
