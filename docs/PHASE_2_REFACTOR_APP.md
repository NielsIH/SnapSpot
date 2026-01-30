# Phase 2: Refactor SnapSpot PWA

**Status:** IN PROGRESS  
**Started:** January 30, 2026  
**Current Task:** Task 2.2

---

## Overview

**Goal:** Update the main SnapSpot PWA to use the new shared libraries from lib/

**Estimated Duration:** 2-3 days

**Key Changes:**
- ✅ ImageProcessor uses lib/snapspot-image
- ⬜ Create StorageExporterImporter using lib/snapspot-data
- ⬜ Maintain backward compatibility with wrapper
- ⬜ Update all app imports

---

## Task Checklist

### ✅ Task 2.1: Refactor ImageProcessor
**Status:** COMPLETED & TESTED  
**Estimated Time:** 2 hours  
**Actual Time:** [completed]

**Changes Made:**
- [x] Imported converter functions from lib/snapspot-image/converter.js
- [x] Replaced blobToBase64 implementation with library call
- [x] Replaced base64ToBlob implementation with library call
- [x] Kept other methods (processImage, generateThumbnailDataUrl, etc.)
- [x] Tested: Upload map ✅
- [x] Tested: Export to JSON ✅
- [x] Tested: Import from JSON ✅
- [x] Tested: View photo gallery ✅
- [x] Committed: "refactor: update ImageProcessor to use lib/snapspot-image"

---

### ⏳ Task 2.2: Create StorageExporterImporter
**Status:** IN PROGRESS  
**Estimated Time:** 8 hours  
**File:** `lib/snapspot-storage/exporter-importer.js` (NEW)

#### Subtasks
- [ ] Create directory `lib/snapspot-storage/`
- [ ] Create file `exporter-importer.js`
- [ ] Add imports from lib/snapspot-data and lib/snapspot-image
- [ ] Implement class `StorageExporterImporter`
- [ ] Migrate exportData() method
  - [ ] Use buildExport() from writer.js
  - [ ] Keep storage operations (mapStorage.*)
  - [ ] Keep file download logic
  - [ ] Handle export options (complete, by date, split)
- [ ] Migrate importData() method
  - [ ] Use parseExport() from parser.js
  - [ ] Use validateExportFile() from validator.js
  - [ ] Keep storage operations
  - [ ] Keep modal interactions
- [ ] Migrate mergeData() method
  - [ ] Use mergeExports() from merger.js
  - [ ] Keep storage operations
  - [ ] Update hash in storage
- [ ] Implement helper methods
  - [ ] _triggerDownload()
  - [ ] _prepareExportOptions()
  - [ ] _handleImageHash()
- [ ] Add JSDoc comments
- [ ] Run error check

#### Implementation Notes

**What moves to library (already done in Phase 1):**
- Data parsing → `parseExport()`
- Data writing → `buildExport()`
- Validation → `validateExportFile()`
- Merge logic → `mergeExports()`
- Splitting → `splitByDates()`
- Hash generation → `generateImageHash()`

**What stays in StorageExporterImporter:**
- All MapStorage calls (saveMap, saveMarker, savePhoto, etc.)
- Modal interactions (exportDecisionModal, importDecisionModal)
- File download triggers
- UI error handling
- Storage-specific hash updates

**Key exports() signature:**
```javascript
static async exportData(map, markers, photos, imageProcessor, options, mapStorage)
```

**Key importData() signature:**
```javascript
static async importData(jsonString, ImageProcessorClass, mapStorage)
```

**Dependencies:**
```javascript
import { parseExport } from '../snapspot-data/parser.js';
import { buildExport } from '../snapspot-data/writer.js';
import { validateExportFile } from '../snapspot-data/validator.js';
import { mergeExports } from '../snapspot-data/merger.js';
import { splitByDates, groupMarkersByDay } from '../snapspot-data/splitter.js';
import { generateImageHash } from '../snapspot-image/hasher.js';
```

---

### ⬜ Task 2.3: Update MapDataExporterImporter Wrapper
**Status:** NOT STARTED  
**Estimated Time:** 4 hours  
**File:** `js/MapDataExporterImporter.js`

#### Subtasks
- [ ] Import StorageExporterImporter
- [ ] Add deprecation notice at top of file
- [ ] Create wrapper methods that delegate to StorageExporterImporter
  - [ ] exportData() → StorageExporterImporter.exportData()
  - [ ] importData() → StorageExporterImporter.importData()
  - [ ] mergeData() → StorageExporterImporter.mergeData()
- [ ] Keep exact same method signatures (backward compatibility)
- [ ] Add console.warn() for deprecated usage
- [ ] Run error check

#### Implementation Template
```javascript
// js/MapDataExporterImporter.js
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js';

/**
 * @deprecated Use StorageExporterImporter from lib/snapspot-storage
 * This wrapper exists for backward compatibility and will be removed in Phase 4
 */
export class MapDataExporterImporter {
  static async exportData(...args) {
    console.warn('DEPRECATED: MapDataExporterImporter is deprecated. Use StorageExporterImporter from lib/snapspot-storage');
    return StorageExporterImporter.exportData(...args);
  }
  
  static async importData(...args) {
    console.warn('DEPRECATED: MapDataExporterImporter is deprecated. Use StorageExporterImporter from lib/snapspot-storage');
    return StorageExporterImporter.importData(...args);
  }
  
  // ... other methods
}
```

---

### ⬜ Task 2.4: Update app.js Imports
**Status:** NOT STARTED  
**Estimated Time:** 1 hour  
**File:** `js/app.js`

#### Subtasks
- [ ] Review current imports in app.js
- [ ] Verify MapDataExporterImporter usage (should work via wrapper)
- [ ] Check for any direct imports from old locations
- [ ] Run error check
- [ ] Verify app loads in browser

#### Notes
Since we're using a wrapper approach, app.js should continue working without changes. This task is mainly verification.

If we later decide to remove the wrapper (Phase 4), we would update:
```javascript
// OLD
import { MapDataExporterImporter } from './MapDataExporterImporter.js';

// NEW
import { StorageExporterImporter as MapDataExporterImporter } from '../lib/snapspot-storage/exporter-importer.js';
```

---

### ⬜ Task 2.5: Manual Testing Suite
**Status:** NOT STARTED  
**Estimated Time:** 4-6 hours  

---

## Manual Testing Checklist

### Prerequisites
- [ ] Open SnapSpot PWA in browser
- [ ] Open DevTools console (check for errors/warnings)
- [ ] Have test images ready (PNG, JPG)
- [ ] Have test export file ready (previous export)

---

### Test Group 1: Map Management
- [ ] **1.1 Upload New Raster Map**
  - Upload PNG/JPG map image
  - Verify map displays correctly
  - Check console for errors
  
- [ ] **1.2 Upload New SVG Map**
  - Upload SVG map image
  - Verify map displays correctly
  - Check console for errors

- [ ] **1.3 Switch Between Maps**
  - Create/load second map
  - Switch to first map
  - Switch back to second map
  - Verify correct map loads each time

- [ ] **1.4 Delete Map**
  - Delete test map
  - Verify map removed from list
  - Check console for errors

---

### Test Group 2: Marker Operations
- [ ] **2.1 Add Marker**
  - Click on map to add marker
  - Enter description
  - Save marker
  - Verify marker appears

- [ ] **2.2 Edit Marker**
  - Click existing marker
  - Edit description
  - Save changes
  - Verify description updated

- [ ] **2.3 Move Marker**
  - Drag marker to new position
  - Verify position updates

- [ ] **2.4 Delete Marker**
  - Delete marker
  - Verify marker removed
  - Check photos still accessible if shared

---

### Test Group 3: Photo Operations
- [ ] **3.1 Upload Single Photo**
  - Click marker
  - Upload photo
  - Verify thumbnail appears
  - Open photo viewer
  - Verify full image displays

- [ ] **3.2 Upload Multiple Photos**
  - Upload 3+ photos to marker
  - Verify all thumbnails appear
  - Navigate between photos in viewer

- [ ] **3.3 Delete Photo**
  - Delete photo from marker
  - Verify photo removed
  - Check other photos unaffected

- [ ] **3.4 Photo Gallery**
  - Open photo gallery modal
  - Verify all photos display
  - Navigate between photos
  - Close gallery

---

### Test Group 4: Export Functionality
**⚠️ CRITICAL - Tests new StorageExporterImporter**

- [ ] **4.1 Export Complete Map**
  - Open export modal
  - Select "Export All Data"
  - Click Export
  - Verify file downloads
  - Verify filename format: `MapName_snapshot_YYYYMMDD_HHMMSS.json`
  - Open file in text editor
  - Verify JSON structure
  - Check for required fields:
    - type: "SnapSpotDataExport"
    - version: "1.1"
    - map object with id, name, image, hash
    - markers array
    - photos array
  - Verify image data is base64
  - Verify hash is 64-character hex string

- [ ] **4.2 Export By Date (Single File)**
  - Add markers with different dates
  - Open export modal
  - Select "Export by Date"
  - Choose single date range
  - Export
  - Verify file downloads
  - Open file
  - Verify only markers in date range exported
  - Verify associated photos included

- [ ] **4.3 Export By Date (Split Files)**
  - Add markers across multiple days
  - Open export modal
  - Select "Export by Date"
  - Check "Split into multiple files"
  - Select date range spanning 3+ days
  - Export
  - Verify ZIP file downloads
  - Extract ZIP
  - Verify one JSON file per day
  - Verify each file contains only that day's markers
  - Verify map data duplicated in each file

- [ ] **4.4 Export Options**
  - Open export modal
  - Verify compression option appears
  - Toggle compression on/off
  - Export with compression ON
  - Verify file size smaller
  - Re-import (test in 5.1)

---

### Test Group 5: Import Functionality
**⚠️ CRITICAL - Tests new StorageExporterImporter**

- [ ] **5.1 Import New Map (No Hash Match)**
  - Delete all maps or use fresh browser profile
  - Open import modal
  - Select export file
  - Click Import
  - Verify import completes
  - Verify map appears in map list
  - Verify markers appear on map
  - Click markers to verify photos loaded
  - Check console for errors

- [ ] **5.2 Import Matching Map (Hash Match) - New Markers**
  - Export current map (creates backup)
  - Add 2-3 new markers
  - Export again (new file with new markers)
  - Delete the new markers from app
  - Import the second export file
  - **Expected:** Import decision modal appears
  - Select "Merge with existing data"
  - Verify new markers added
  - Verify existing markers unchanged
  - Verify no duplicates

- [ ] **5.3 Import Matching Map (Hash Match) - Replace**
  - Export current map
  - Delete some markers
  - Import the export file
  - **Expected:** Import decision modal appears
  - Select "Replace all data"
  - Verify all original markers restored
  - Verify deleted markers back

- [ ] **5.4 Import With Merge Conflicts**
  - Export map with marker A at position (100, 100)
  - Move marker A to (200, 200)
  - Import original export
  - Select "Merge"
  - **Expected:** Marker remains at (200, 200) OR conflict modal appears
  - Verify no data loss
  - Verify merge handled gracefully

- [ ] **5.5 Import Secondary Matching (Filename Fallback)**
  - Create map "TestMap" with unique image
  - Export → "TestMap_snapshot.json"
  - Delete map from app
  - Modify exported JSON: Change map.hash to "0000000000..." (fake hash)
  - Import modified file
  - **Expected:** Secondary matching by filename triggers
  - Verify import decision modal appears
  - Select merge or replace
  - Verify import completes

- [ ] **5.6 Import Invalid File**
  - Create text file with invalid JSON
  - Import file
  - **Expected:** Error message appears
  - Verify app doesn't crash
  - Verify error message helpful

- [ ] **5.7 Import Legacy Format (No Hash)**
  - Use export file from older SnapSpot version (if available)
  - OR manually edit export: Remove map.hash field
  - Import file
  - Verify import completes
  - Verify hash generated on import
  - Check console for warnings (expected)

---

### Test Group 6: Search Functionality
- [ ] **6.1 Search Markers by Description**
  - Open search modal
  - Enter search term
  - Verify matching markers appear
  - Click result
  - Verify map jumps to marker
  - Verify marker highlighted

- [ ] **6.2 Search Photos**
  - Search for marker with photos
  - Verify photos appear in results
  - Click photo
  - Verify photo viewer opens

---

### Test Group 7: Settings
- [ ] **7.1 Change Compression Settings**
  - Open settings modal
  - Toggle compression
  - Save settings
  - Export map
  - Verify compression applied (check file size)

- [ ] **7.2 Export Settings**
  - Configure custom settings
  - Export settings
  - Verify settings file downloads

- [ ] **7.3 Import Settings**
  - Modify settings in app
  - Import previous settings file
  - Verify settings restored

---

### Test Group 8: Error Handling & Edge Cases
- [ ] **8.1 Export Empty Map**
  - Create map with no markers
  - Export
  - Verify export completes
  - Verify empty markers array in JSON

- [ ] **8.2 Export Map With Marker (No Photos)**
  - Create marker without photos
  - Export
  - Verify marker exported
  - Verify empty photoIds array

- [ ] **8.3 Import Export Multiple Times**
  - Export map
  - Import same file
  - Export again
  - Import again
  - Verify no errors
  - Verify no data corruption

- [ ] **8.4 Large Map Test**
  - Create map with 50+ markers
  - Add 5+ photos to several markers
  - Export
  - Delete map
  - Import
  - Verify all markers and photos restored
  - Check performance (should complete in <5 seconds)

---

### Test Group 9: Console & Deprecation Warnings
- [ ] **9.1 Check Console**
  - Open DevTools console
  - Perform various operations
  - **Expected:** Deprecation warnings for MapDataExporterImporter
  - **Not Expected:** Any errors
  - Verify warnings are clear and helpful

- [ ] **9.2 Network Tab**
  - Open Network tab
  - Perform export/import
  - Verify no unexpected network requests
  - Verify file downloads appear

---

## Test Results Template

```
### Phase 2 Manual Testing - [Date]
Tester: [Name]
Browser: [Chrome/Firefox/Edge + Version]
OS: [Windows/Mac/Linux]

Test Group 1: Map Management - ✅/❌
- 1.1: ✅/❌ [notes if failed]
- 1.2: ✅/❌
- 1.3: ✅/❌
- 1.4: ✅/❌

Test Group 2: Marker Operations - ✅/❌
[...]

Test Group 4: Export Functionality - ✅/❌ ⚠️ CRITICAL
- 4.1: ✅/❌ [notes]
- 4.2: ✅/❌
- 4.3: ✅/❌
- 4.4: ✅/❌

Test Group 5: Import Functionality - ✅/❌ ⚠️ CRITICAL
- 5.1: ✅/❌ [notes]
- 5.2: ✅/❌
- 5.3: ✅/❌
[...]

OVERALL: ✅ PASS / ❌ FAIL

Issues Found:
1. [Description]
2. [Description]

Next Steps:
- [ ] Fix issues
- [ ] Re-test failed cases
- [ ] Commit if all pass
```

---

## Completion Criteria

Phase 2 is complete when:
- [x] All tasks checked (2.1 - 2.5)
- [ ] All manual tests pass
- [ ] No console errors (warnings okay)
- [ ] Export/import works perfectly
- [ ] Merge functionality works
- [ ] Split export works
- [ ] Code committed with message: "refactor: update app to use shared libraries"
- [ ] REFACTORING_WORKFLOW.md updated with completion status

---

## Next Phase

After Phase 2 completion → [Phase 3: Refactor snapspot-utils](PHASE_3_REFACTOR_UTILS.md)
