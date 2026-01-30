# Phase 3: Refactor snapspot-utils

**Status:** NOT STARTED  
**Estimated Duration:** 2-3 days

---

## Overview

**Goal:** Update snapspot-utils to use shared libraries and deprecate local copies

**Key Changes:**
- Update map-migrator to import from lib/
- Deprecate snapspot-utils/core/formats/snapspot/
- Add new merge tool using lib/snapspot-data/merger.js
- Update all tests
- Update documentation

---

## Task Checklist

### ⬜ Task 3.1: Update Map Migrator
**Status:** NOT STARTED  
**Estimated Time:** 2 hours  
**File:** `snapspot-utils/tools/map-migrator/migrator.js`

#### Subtasks
- [ ] Open migrator.js
- [ ] Update imports to use lib/
  ```javascript
  // OLD
  import { parseExport } from '../../core/formats/snapspot/parser.js';
  import { buildExport } from '../../core/formats/snapspot/writer.js';
  
  // NEW
  import { parseExport } from '../../../lib/snapspot-data/parser.js';
  import { buildExport } from '../../../lib/snapspot-data/writer.js';
  import { validateExportFile } from '../../../lib/snapspot-data/validator.js';
  ```
- [ ] Update all relative paths
- [ ] Run error check
- [ ] Test map-migrator tool (see test section below)

---

### ⬜ Task 3.2: Deprecate Old Format Handlers
**Status:** NOT STARTED  
**Estimated Time:** 1 hour  
**Files:** 
- `snapspot-utils/core/formats/snapspot/parser.js`
- `snapspot-utils/core/formats/snapspot/writer.js`
- `snapspot-utils/core/formats/snapspot/validator.js`

#### Subtasks
- [ ] Add deprecation notice to parser.js
- [ ] Add deprecation notice to writer.js
- [ ] Add deprecation notice to validator.js
- [ ] Re-export from lib/ for backward compatibility
- [ ] Update README.md in formats/snapspot/ directory

#### Implementation Template
```javascript
// snapspot-utils/core/formats/snapspot/parser.js
/**
 * @deprecated This module has been moved to lib/snapspot-data/parser.js
 * Please update your imports to use the new location.
 * This re-export will be removed in Phase 4.
 */

console.warn(
  'DEPRECATED: snapspot-utils/core/formats/snapspot/parser.js is deprecated.\n' +
  'Use lib/snapspot-data/parser.js instead.'
);

export * from '../../../../lib/snapspot-data/parser.js';
```

---

### ⬜ Task 3.3: Update Utils Tests
**Status:** NOT STARTED  
**Estimated Time:** 2 hours  
**Files:** `snapspot-utils/core/formats/snapspot/__tests__/`

#### Subtasks
- [ ] Update test imports to use lib/
- [ ] Verify all tests still pass
- [ ] Create new test file for lib/ if needed
- [ ] Check test runner still works
- [ ] Run all tests and verify

---

### ⬜ Task 3.4: Add Export Merger Tool (NEW)
**Status:** NOT STARTED  
**Estimated Time:** 8 hours  
**Directory:** `snapspot-utils/tools/export-merger/` (NEW)

#### Subtasks
- [ ] Create directory `snapspot-utils/tools/export-merger/`
- [ ] Create `index.html` (UI)
- [ ] Create `merger.js` (business logic)
- [ ] Create `merger-ui.js` (UI controller)
- [ ] Create `styles.css`
- [ ] Implement file upload (multiple files)
- [ ] Implement merge preview
- [ ] Implement conflict resolution UI
- [ ] Implement merged export download
- [ ] Add documentation
- [ ] Test merger tool (see test section below)

#### Features to Implement
1. **File Upload:**
   - Drag & drop multiple JSON files
   - OR file picker (multiple selection)
   - Display list of loaded files
   - Show file metadata (map name, marker count, date range)

2. **Merge Preview:**
   - Show combined statistics:
     - Total markers
     - Date range
     - Detected conflicts
   - List conflicts:
     - Duplicate markers (same coordinates)
     - Same marker IDs with different data

3. **Conflict Resolution:**
   - For duplicate markers:
     - [ ] Keep first
     - [ ] Keep last
     - [ ] Merge photos from both
   - For duplicate photos:
     - [ ] Keep first
     - [ ] Keep last

4. **Export:**
   - Generate merged export using `mergeExports()`
   - Download as JSON
   - Filename: `merged_export_YYYYMMDD_HHMMSS.json`

#### Dependencies
```javascript
import { parseExport } from '../../../lib/snapspot-data/parser.js';
import { mergeExports } from '../../../lib/snapspot-data/merger.js';
import { buildExport } from '../../../lib/snapspot-data/writer.js';
import { validateExportFile } from '../../../lib/snapspot-data/validator.js';
```

---

### ⬜ Task 3.5: Update Utils Documentation
**Status:** NOT STARTED  
**Estimated Time:** 3 hours

#### Subtasks
- [ ] Update `snapspot-utils/README.md`
  - Add section on shared libraries
  - Update import examples
  - Add deprecation notices
- [ ] Update `snapspot-utils/docs/SPECIFICATIONS.md`
  - Reference lib/ architecture
  - Update code examples
- [ ] Update `snapspot-utils/docs/ARCHITECTURE.md`
  - Add library dependency diagram
  - Document new structure
- [ ] Create `snapspot-utils/tools/export-merger/README.md`
  - Document merger tool
  - Usage examples
  - Screenshots

---

### ⬜ Task 3.6: Manual Testing
**Status:** NOT STARTED  
**Estimated Time:** 3 hours

---

## Manual Testing Checklist

### Test 1: Map Migrator Tool
**File:** `snapspot-utils/tools/map-migrator/index.html`

- [ ] **1.1 Load Tool**
  - Open index.html in browser
  - Verify UI loads
  - Check console for errors
  - Verify no deprecation warnings (should use lib/ now)

- [ ] **1.2 Load Export File**
  - Click "Load Export File"
  - Select valid SnapSpot export
  - Verify map preview appears
  - Verify marker count displays

- [ ] **1.3 Apply Transformation**
  - Enter transformation parameters (scale, rotate, translate)
  - Click "Apply Transform"
  - Verify marker positions update in preview
  - Verify transformation matrix displays

- [ ] **1.4 Export Transformed Data**
  - Click "Export"
  - Verify file downloads
  - Open exported file
  - Verify markers have new coordinates
  - Verify map data unchanged
  - Verify photos intact

- [ ] **1.5 Re-import to App**
  - Import transformed export into SnapSpot PWA
  - Verify markers at new positions
  - Verify photos still attached
  - Verify map displays correctly

---

### Test 2: Export Merger Tool (NEW)
**File:** `snapspot-utils/tools/export-merger/index.html`

- [ ] **2.1 Load Tool**
  - Open index.html in browser
  - Verify UI loads
  - Check console for errors

- [ ] **2.2 Load Multiple Files**
  - Create 2-3 test export files with overlapping data:
    - Export 1: Map A, Markers 1-10
    - Export 2: Map A (same hash), Markers 8-15 (overlap 8-10)
    - Export 3: Map A, Markers 20-25
  - Drag & drop all three files
  - Verify all files load
  - Verify file list displays with metadata

- [ ] **2.3 Merge Preview**
  - Click "Preview Merge"
  - Verify statistics:
    - Total markers: 25 (1-15, 20-25)
    - Conflicts detected: 3 (markers 8, 9, 10)
  - Verify conflict list displays
  - Verify each conflict shows:
    - Marker ID
    - Coordinates
    - Source files

- [ ] **2.4 Resolve Conflicts**
  - For each conflict, select resolution strategy:
    - Keep first
    - Keep last
    - Merge photos
  - Verify preview updates
  - Verify statistics update

- [ ] **2.5 Export Merged Data**
  - Click "Export Merged"
  - Verify file downloads
  - Open merged file
  - Verify:
    - All 25 unique markers present
    - No duplicate markers
    - Photos merged correctly
    - Map data correct

- [ ] **2.6 Import to App**
  - Import merged export into SnapSpot PWA
  - Verify all markers appear
  - Verify merged photos correct
  - Verify no duplicates

- [ ] **2.7 Edge Cases**
  - [ ] Load files with different maps (different hashes)
    - Expected: Error or warning about incompatible maps
  - [ ] Load 10+ files
    - Verify performance acceptable
  - [ ] Load invalid file
    - Expected: Error message, tool doesn't crash

---

### Test 3: Backward Compatibility
**Verify old imports still work (temporarily)**

- [ ] **3.1 Old Import Path**
  - Create test HTML file
  - Import from old path:
    ```javascript
    import { parseExport } from './core/formats/snapspot/parser.js';
    ```
  - Verify deprecation warning in console
  - Verify function still works
  - Check console message is helpful

---

### Test 4: All Utils Tests Pass

- [ ] **4.1 Run Test Suite**
  - Open `snapspot-utils/tests/test-runner.html`
  - Run all tests
  - Verify all tests pass ✅
  - Check for any warnings

- [ ] **4.2 Individual Module Tests**
  - Open test runners for each module
  - Verify tests using new lib/ imports
  - Verify all pass

---

## Test Results Template

```
### Phase 3 Manual Testing - [Date]
Tester: [Name]
Browser: [Browser + Version]

Test 1: Map Migrator - ✅/❌
- 1.1: ✅/❌
- 1.2: ✅/❌
- 1.3: ✅/❌
- 1.4: ✅/❌
- 1.5: ✅/❌

Test 2: Export Merger (NEW) - ✅/❌ ⚠️ CRITICAL
- 2.1: ✅/❌
- 2.2: ✅/❌
- 2.3: ✅/❌
- 2.4: ✅/❌
- 2.5: ✅/❌
- 2.6: ✅/❌
- 2.7: ✅/❌

Test 3: Backward Compatibility - ✅/❌
- 3.1: ✅/❌

Test 4: All Utils Tests - ✅/❌
- 4.1: ✅/❌
- 4.2: ✅/❌

OVERALL: ✅ PASS / ❌ FAIL

Issues Found:
1. [Description]

Next Steps:
- [ ] Fix issues
- [ ] Re-test
- [ ] Commit
```

---

## Completion Criteria

Phase 3 is complete when:
- [ ] All tasks checked (3.1 - 3.6)
- [ ] All manual tests pass
- [ ] Map migrator works with lib/
- [ ] New merger tool works
- [ ] All utils tests pass
- [ ] Documentation updated
- [ ] Code committed: "refactor: update utils to use shared libraries, add merger tool"
- [ ] REFACTORING_WORKFLOW.md updated

---

## Next Phase

After Phase 3 completion → [Phase 4: Documentation & Cleanup](PHASE_4_CLEANUP.md)
