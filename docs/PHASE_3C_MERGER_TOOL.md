# Phase 3C: Create Export Merger Tool

**Status:** ⬜ NOT STARTED  
**Estimated Duration:** 2 days

---

## Overview

**Goal:** Create new tool to merge multiple SnapSpot export files

**Scope:** New standalone tool using lib/snapspot-data/merger.js

**Testing Focus:** Merge functionality with UI

---

## Tasks

### ⬜ Task 3C.1: Create Tool Structure
- [ ] Create directory `snapspot-utils/tools/export-merger/`
- [ ] Create `index.html` (UI)
- [ ] Create `merger.js` (business logic)
- [ ] Create `merger-ui.js` (UI controller)
- [ ] Create `styles.css`

---

### ⬜ Task 3C.2: Implement Business Logic
**File:** `merger.js`

#### Subtasks
- [ ] Import from lib/snapspot-data:
  ```javascript
  import { parseExport } from '../../../lib/snapspot-data/parser.js'
  import { mergeExports } from '../../../lib/snapspot-data/merger.js'
  import { buildExport } from '../../../lib/snapspot-data/writer.js'
  import { validateExportFile } from '../../../lib/snapspot-data/validator.js'
  ```
- [ ] Implement `loadExportFile(file)` - parse and validate
- [ ] Implement `mergeMultipleExports(exports, options)` - use mergeExports()
- [ ] Implement `detectConflicts(exports)` - find duplicate markers
- [ ] Implement `generateMergedExport(mergedData)` - use buildExport()
- [ ] Add error handling
- [ ] Fix linting

---

### ⬜ Task 3C.3: Implement UI
**Files:** `index.html`, `merger-ui.js`, `styles.css`

#### Features to Implement
- [ ] **File Upload UI:**
  - Drag & drop zone
  - File picker (multiple selection)
  - File list display with metadata (name, markers, date range)
  - Remove file button

- [ ] **Merge Preview:**
  - Show combined statistics (total markers, date range)
  - List detected conflicts
  - Show conflict details (coordinates, source files)

- [ ] **Conflict Resolution:**
  - Radio buttons for each conflict:
    - Keep first
    - Keep last
    - Merge photos from both
  - Apply resolution button

- [ ] **Export:**
  - Generate merged export button
  - Download as JSON
  - Filename: `merged_export_YYYYMMDD_HHMMSS.json`

- [ ] Fix linting

---

### ⬜ Task 3C.4: Add Documentation
- [ ] Create `README.md` in `tools/export-merger/`:
  - Purpose and use cases
  - How to use
  - Conflict resolution strategies
  - Example workflow
  - Screenshots (if available)

---

### ⬜ Task 3C.5: Manual Testing - Export Merger Tool

**Prepare test data:**
1. Create Export 1: Map A, Markers 1-10
2. Create Export 2: Map A (same hash), Markers 8-15 (overlaps 8-10)
3. Create Export 3: Map A, Markers 20-25

#### Test 1: Load Files
- [ ] Open `snapspot-utils/tools/export-merger/index.html`
- [ ] Drag & drop all three export files
- [ ] Verify:
  - All files appear in list
  - Metadata shows (marker count, etc.)
  - No console errors

#### Test 2: Preview Merge
- [ ] Click "Preview Merge"
- [ ] Verify statistics:
  - Total markers: 25 (1-15, 20-25)
  - Conflicts detected: 3 (markers 8, 9, 10)
- [ ] Verify conflict list shows:
  - Marker IDs/coordinates
  - Source files for each conflict

#### Test 3: Resolve Conflicts
- [ ] For each conflict, select resolution:
  - Marker 8: Keep first
  - Marker 9: Keep last  
  - Marker 10: Merge photos
- [ ] Click "Apply Resolution"
- [ ] Verify preview updates with resolved conflicts

#### Test 4: Export Merged Data
- [ ] Click "Export Merged"
- [ ] Verify file downloads
- [ ] Open merged file in text editor
- [ ] Verify:
  - All 25 unique markers present
  - No duplicate markers
  - Photos merged correctly (marker 10 has photos from both)
  - Map data correct
  - Valid JSON structure

#### Test 5: Import to App
- [ ] Open SnapSpot PWA
- [ ] Import merged export
- [ ] Verify:
  - All 25 markers appear on map
  - Merged photos correct (marker 10)
  - No duplicates
  - No console errors

#### Test 6: Edge Cases
- [ ] **Different Maps:**
  - Try to merge exports with different imageHash
  - Verify error/warning about incompatible maps

- [ ] **Large Files:**
  - Merge 10+ export files
  - Verify performance acceptable (< 5 seconds)
  - Verify UI remains responsive

- [ ] **Invalid File:**
  - Try to load invalid JSON
  - Verify error message appears
  - Verify tool doesn't crash

---

## Acceptance Criteria

- [ ] Tool loads and displays correctly
- [ ] File upload works (drag & drop and picker)
- [ ] Merge preview shows correct statistics
- [ ] Conflict detection works
- [ ] Conflict resolution applies correctly
- [ ] Export generates valid merged file
- [ ] All 6 manual tests pass
- [ ] No console errors
- [ ] UI is intuitive and responsive
- [ ] Documentation complete
- [ ] Linting clean: `npm run lint` shows 0 errors

---

## Files Created

- [snapspot-utils/tools/export-merger/index.html](../../snapspot-utils/tools/export-merger/index.html)
- [snapspot-utils/tools/export-merger/merger.js](../../snapspot-utils/tools/export-merger/merger.js)
- [snapspot-utils/tools/export-merger/merger-ui.js](../../snapspot-utils/tools/export-merger/merger-ui.js)
- [snapspot-utils/tools/export-merger/styles.css](../../snapspot-utils/tools/export-merger/styles.css)
- [snapspot-utils/tools/export-merger/README.md](../../snapspot-utils/tools/export-merger/README.md)

---

## Completion

When all tests pass:
- [ ] Update status to ✅ COMPLETE
- [ ] Add completion date
- [ ] Add test results
- [ ] Update `snapspot-utils/index.html` with new tool tile
- [ ] Update `snapspot-utils/README.md` with new tool
- [ ] Commit: "feat: add export merger tool using lib/snapspot-data"
- [ ] Update workflow
- [ ] Mark Phase 3 complete
- [ ] Move to Phase 4

---

## Next Phase

[Phase 4: Documentation & Cleanup](PHASE_4_CLEANUP.md)
