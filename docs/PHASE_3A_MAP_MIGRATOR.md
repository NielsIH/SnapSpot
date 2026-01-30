# Phase 3A: Update Map Migrator

**Status:** ⬜ NOT STARTED  
**Estimated Duration:** 0.5 days

---

## Overview

**Goal:** Update map-migrator tool to use lib/ instead of local format handlers

**Scope:** Single tool update with focused testing

**Testing Focus:** Map migrator functionality only

---

## Tasks

### ⬜ Task 3A.1: Update Map Migrator Imports
**File:** `snapspot-utils/tools/map-migrator/migrator.js`

#### Subtasks
- [ ] Update import paths:
  ```javascript
  // OLD
  import { parseExport } from '../../core/formats/snapspot/parser.js'
  import { buildExport } from '../../core/formats/snapspot/writer.js'
  
  // NEW
  import { parseExport } from '../../../lib/snapspot-data/parser.js'
  import { buildExport } from '../../../lib/snapspot-data/writer.js'
  import { validateExportFile } from '../../../lib/snapspot-data/validator.js'
  ```
- [ ] Update all relative paths throughout file
- [ ] Fix linting errors

---

### ⬜ Task 3A.2: Manual Testing - Map Migrator Tool

**Test the map-migrator tool:**

#### Test 1: Load Tool
- [ ] Open `snapspot-utils/tools/map-migrator/index.html` in browser
- [ ] Verify UI loads without errors
- [ ] Check console - should have NO deprecation warnings (using lib/ now)

#### Test 2: Load Export File
- [ ] Click "Load Export File"
- [ ] Select a valid SnapSpot export
- [ ] Verify map preview appears
- [ ] Verify marker count displays correctly
- [ ] Verify map dimensions show

#### Test 3: Apply Transformation
- [ ] Enter transformation parameters:
  - Scale: 1.5
  - Rotate: 45 degrees
  - Translate X: 100, Y: 50
- [ ] Click "Apply Transform"
- [ ] Verify marker positions update in preview
- [ ] Verify transformation matrix displays

#### Test 4: Export Transformed Data
- [ ] Click "Export"
- [ ] Verify file downloads
- [ ] Open exported file in text editor
- [ ] Verify:
  - Markers have new coordinates
  - Map data unchanged
  - Photos intact
  - Valid JSON structure

#### Test 5: Re-import to Main App
- [ ] Open SnapSpot PWA
- [ ] Import transformed export
- [ ] Verify markers at new positions
- [ ] Verify photos still attached
- [ ] Verify map displays correctly

---

## Acceptance Criteria

- [ ] Map migrator uses lib/ imports only
- [ ] All 5 manual tests pass
- [ ] No console errors
- [ ] No deprecation warnings
- [ ] Transformations work correctly
- [ ] Linting clean: `npm run lint` shows 0 errors for migrator.js

---

## Files Modified

- [snapspot-utils/tools/map-migrator/migrator.js](../../snapspot-utils/tools/map-migrator/migrator.js)

---

## Completion

When all tests pass:
- [ ] Update status to ✅ COMPLETE
- [ ] Add completion date
- [ ] Add test results
- [ ] Commit: "refactor: update map-migrator to use lib/snapspot-data"
- [ ] Update workflow
- [ ] Move to Phase 3B

---

## Next Phase

[Phase 3B: Deprecate Old Format Handlers](PHASE_3B_DEPRECATE.md)
