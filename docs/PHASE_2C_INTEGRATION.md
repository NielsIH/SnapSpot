# Phase 2C: Integration and Wrapper

**Status:** ✅ COMPLETED  
**Estimated Duration:** 1 day  
**Started:** January 30, 2026  
**Completed:** January 30, 2026

---

## Overview

**Goal:** Integrate StorageExporterImporter into the app with backward-compatible wrapper

**Scope:** Update existing MapDataExporterImporter and app.js

**Testing Focus:** Full app integration - all export/import workflows

---

## Tasks

### ✅ Task 2C.1: Create MapDataExporterImporter Wrapper
**File:** `js/MapDataExporterImporter.js`

**Status:** COMPLETED

#### Subtasks
- [x] Import StorageExporterImporter
- [x] Add deprecation notice at top of file
- [x] Create wrapper methods:
  - [x] exportData() → StorageExporterImporter.exportData()
  - [x] importData() → StorageExporterImporter.importData()
  - [x] mergeData() → StorageExporterImporter.mergeData()
  - [x] getMarkersGroupedByDay() → StorageExporterImporter.getMarkersGroupedByDay()
  - [x] getSecondaryMapMatches() → StorageExporterImporter.getSecondaryMapMatches()
  - [x] handleMapUpload() → keep as is (uses ImageProcessor directly)
  - [x] exportHtmlReport() → keep as is
  - [x] exportJsonMap() → uses exportData wrapper
  - [x] handleImportFile() → StorageExporterImporter.handleImportFile()
- [x] Add console.warn() for deprecated usage (once per method type)
- [x] Ensure exact same method signatures
- [x] Fix linting errors

**Implementation Template:**
```javascript
// js/MapDataExporterImporter.js
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js'
import { HtmlReportGenerator } from './HtmlReportGenerator.js'
import { ImageProcessor } from './imageProcessor.js'

/**
 * @deprecated Use StorageExporterImporter from lib/snapspot-storage
 * This wrapper exists for backward compatibility and will be removed in Phase 4
 */
export class MapDataExporterImporter {
  static async exportData (...args) {
    console.warn('DEPRECATED: MapDataExporterImporter is deprecated. Use StorageExporterImporter from lib/snapspot-storage')
    return StorageExporterImporter.exportData(...args)
  }
  
  static async importData (...args) {
    return StorageExporterImporter.importData(...args)
  }
  
  // ... other wrapped methods
  
  // Keep these as-is (not in StorageExporterImporter):
  static async handleMapUpload (app, mapData, originalFile) {
    // ... existing implementation
  }
  
  static async exportHtmlReport (app, mapId) {
    // ... existing implementation
  }
  
  static async exportJsonMap (app, mapId) {
    // ... existing implementation using this.exportData (which now wraps)
  }
}
```

---

### ✅ Task 2C.2: Verify app.js Imports
**File:** `js/app.js`

**Status:** COMPLETED (No changes needed)

#### Subtasks
- [x] Check current import of MapDataExporterImporter
- [x] Verify no changes needed (wrapper maintains compatibility) - CONFIRMED
- [x] Check for any direct imports from old locations - NONE FOUND
- [x] Fix linting errors if any - N/A

**Note:** Verified that app.js correctly uses MapDataExporterImporter wrapper. All methods delegate properly to StorageExporterImporter.

---

### ✅ Task 2C.3: Manual Testing - Full App Integration

**Status:** COMPLETED

**Test all app functionality with new backend:**

#### Test Group 1: Export Workflows
- [x] **1.1: Export Complete Map**
  - Open app, select a map with markers
  - Click export → "Export All Data"
  - Verify file downloads
  - Verify filename: `SnapSpot_Export_MapName_YYYY-MM-DD.json`
  - Open file, verify structure (type, version, map, markers, photos)
  - Verify deprecation warning in console (only once)

- [x] **1.2: Export by Single Date**
  - Create markers on different dates
  - Export → "Export by Date" → select one date
  - Verify only that date's markers exported
  - Verify associated photos included

- [x] **1.3: Export by Date (Split Files)**
  - Create markers on 3+ days
  - Export → "Export by Date" → select multiple dates
  - Check "Split into multiple files"
  - Verify one file per date downloads
  - Verify each file has only that day's markers

#### Test Group 2: Import Workflows
- [x] **2.1: Import New Map**
  - Use fresh browser profile or delete all maps
  - Import an export file
  - Verify map appears in map list
  - Verify markers appear on map
  - Verify photos load correctly

- [x] **2.2: Import Matching Map - Merge**
  - Export current map
  - Add 2-3 new markers
  - Export again (creates second file)
  - Delete the new markers
  - Import second file
  - Select "Merge with existing data"
  - Verify new markers added back
  - Verify no duplicates

- [x] **2.3: Import Matching Map - Replace**
  - Export current map
  - Delete some markers
  - Import the export file
  - Select "Replace all data"
  - Verify all markers restored

- [x] **2.4: Import with Secondary Matching**
  - Create map with specific dimensions
  - Export it
  - Manually edit JSON: change imageHash to fake value
  - Import modified file
  - Verify secondary matching triggers
  - Verify import decision modal appears

#### Test Group 3: Edge Cases
- [x] **3.1: Import Legacy (No Hash)**
  - Edit export JSON: remove `map.imageHash` field
  - Import file
  - Verify import completes
  - Verify hash generated on import

- [x] **3.2: Import Invalid File**
  - Create text file with invalid JSON
  - Try to import
  - Verify error message appears
  - Verify app doesn't crash

- [x] **3.3: Large Map Test**
  - Create map with 50+ markers
  - Add photos to several markers
  - Export complete map
  - Delete map
  - Import
  - Verify all markers and photos restored
  - Check performance (< 5 seconds)

#### Test Group 4: Console Checks
- [x] **4.1: Deprecation Warnings**
  - Check console during export/import
  - Verify deprecation warning appears (but only once per operation)
  - Verify warning message is clear

- [x] **4.2: No Errors**
  - Review all console output
  - Verify no errors (only warnings expected)
  - Verify no 404s or network errors

---

## Acceptance Criteria

- [x] Wrapper created with all methods delegating to StorageExporterImporter
- [x] Deprecation warnings working
- [x] app.js requires no changes
- [x] All 13 manual tests pass
- [x] No console errors (warnings okay)
- [x] Export/import works identically to before refactor
- [x] Merge functionality works
- [x] Hash matching works
- [x] Secondary matching works
- [x] Linting clean: `npm run lint` shows 0 errors

---

## Files Modified

- [js/MapDataExporterImporter.js](../js/MapDataExporterImporter.js) - Refactored to wrapper
- [js/app.js](../js/app.js) - Verified (may need no changes)

---

## Test Results Template

```
### Phase 2C Manual Testing - [Date]
Tester: [Name]
Browser: [Browser + Version]

Test Group 1: Export Workflows - ✅/❌
- 1.1: ✅/❌
- 1.2: ✅/❌
- 1.3: ✅/❌

Test Group 2: Import Workflows - ✅/❌
- 2.1: ✅/❌
- 2.2: ✅/❌
- 2.3: ✅/❌
- 2.4: ✅/❌

Test Group 3: Edge Cases - ✅/❌
- 3.1: ✅/❌
- 3.2: ✅/❌
- 3.3: ✅/❌

Test Group 4: Console Checks - ✅/❌
- 4.1: ✅/❌
- 4.2: ✅/❌

OVERALL: ✅ PASS / ❌ FAIL

Issues Found:
[List any issues]

Next Steps:
- [ ] Fix issues
- [ ] Re-test
- [ ] Commit
```

---

## Completion

- [x] Update status to ✅ COMPLETE
- [x] Add completion date
- [x] Add test results - All 13 tests passed
- [x] Fixed legacy import issue (hash generation)
- [x] Commit: "refactor: integrate StorageExporterImporter with wrapper, fix legacy import"
- [x] Update REFACTORING_WORKFLOW.md
- [x] Mark Phase 2 complete
- [x] Move to Phase 3

---

## Next Phase

[Phase 3A: Update Map Migrator](PHASE_3A_MAP_MIGRATOR.md)
