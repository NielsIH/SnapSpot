# Phase 3B: Deprecate Old Format Handlers  

**Status:** ⬜ NOT STARTED  
**Estimated Duration:** 0.5 days

---

## Overview

**Goal:** Deprecate local format handlers with re-exports for backward compatibility

**Scope:** Update existing files with deprecation notices

**Testing Focus:** Verify backward compatibility with deprecation warnings

---

## Tasks

### ⬜ Task 3B.1: Add Deprecation Notices

#### File 1: snapspot-utils/core/formats/snapspot/parser.js
- [ ] Add deprecation warning:
  ```javascript
  /**
   * @deprecated Moved to lib/snapspot-data/parser.js
   * Please update imports. This re-export will be removed in Phase 4.
   */
  console.warn(
    'DEPRECATED: snapspot-utils/core/formats/snapspot/parser.js\n' +
    'Use lib/snapspot-data/parser.js instead.'
  )
  
  export * from '../../../../lib/snapspot-data/parser.js'
  ```

#### File 2: snapspot-utils/core/formats/snapspot/writer.js
- [ ] Add deprecation warning (same pattern as parser)
- [ ] Re-export from lib/

#### File 3: snapspot-utils/core/formats/snapspot/validator.js
- [ ] Add deprecation warning (same pattern)
- [ ] Re-export from lib/

#### File 4: Update README
- [ ] Update `snapspot-utils/core/formats/snapspot/README.md`:
  ```markdown
  # ⚠️ DEPRECATED
  
  This directory has been moved to `lib/snapspot-data/`.
  
  Please update your imports:
  \`\`\`javascript
  // OLD
  import { parseExport } from './core/formats/snapspot/parser.js'
  
  // NEW
  import { parseExport } from '../../lib/snapspot-data/parser.js'
  \`\`\`
  
  These re-exports will be removed in Phase 4.
  ```

- [ ] Fix linting errors

---

### ⬜ Task 3B.2: Manual Testing - Backward Compatibility

**Verify old imports still work with warnings:**

#### Test 1: Old Import Path
- [ ] Create test HTML file in `snapspot-utils/tools/test/`:
  ```html
  <!DOCTYPE html>
  <html>
  <head><title>Deprecation Test</title></head>
  <body>
    <h1>Open Console</h1>
    <script type="module">
      // Use OLD path
      import { parseExport } from '../../core/formats/snapspot/parser.js'
      
      console.log('Test: Using deprecated import path')
      console.log('parseExport function:', typeof parseExport)
    </script>
  </body>
  </html>
  ```
- [ ] Open in browser
- [ ] Check console:
  - ✅ Deprecation warning appears
  - ✅ Function still works (typeof === 'function')
  - ✅ Warning message is clear and helpful

#### Test 2: New Import Path
- [ ] Modify test file to use NEW path:
  ```javascript
  import { parseExport } from '../../../lib/snapspot-data/parser.js'
  ```
- [ ] Reload browser
- [ ] Check console:
  - ✅ NO deprecation warning
  - ✅ Function works

#### Test 3: Utils Tests Still Pass
- [ ] Open `snapspot-utils/tests/test-runner.html`
- [ ] Run all tests
- [ ] Verify all tests still pass
- [ ] Check for deprecation warnings (may appear if tests use old paths)

---

## Acceptance Criteria

- [ ] All three format handler files have deprecation notices
- [ ] All files re-export from lib/
- [ ] README updated with migration instructions
- [ ] Backward compatibility test passes
- [ ] Forward compatibility test passes (new path)
- [ ] Deprecation warnings are clear and helpful
- [ ] Linting clean: `npm run lint` shows 0 errors

---

## Files Modified

- [snapspot-utils/core/formats/snapspot/parser.js](../../snapspot-utils/core/formats/snapspot/parser.js)
- [snapspot-utils/core/formats/snapspot/writer.js](../../snapspot-utils/core/formats/snapspot/writer.js)
- [snapspot-utils/core/formats/snapspot/validator.js](../../snapspot-utils/core/formats/snapspot/validator.js)
- [snapspot-utils/core/formats/snapspot/README.md](../../snapspot-utils/core/formats/snapspot/README.md)

---

## Completion

When all tests pass:
- [ ] Update status to ✅ COMPLETE
- [ ] Add completion date
- [ ] Delete test HTML file (cleanup)
- [ ] Commit: "refactor: deprecate old format handlers with re-exports"
- [ ] Update workflow
- [ ] Move to Phase 3C

---

## Next Phase

[Phase 3C: Create Export Merger Tool](PHASE_3C_MERGER_TOOL.md)
