# SnapSpot Library Refactoring Plan

**Version:** 1.0  
**Created:** January 30, 2026  
**Status:** Planning Phase  
**Goal:** Extract shared functionality into reusable libraries for both SnapSpot PWA and snapspot-utils

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current State Analysis](#current-state-analysis)
- [Target Architecture](#target-architecture)
- [Refactoring Phases](#refactoring-phases)
- [Detailed Task List](#detailed-task-list)
- [Testing Strategy](#testing-strategy)
- [Rollback Plan](#rollback-plan)

---

## Executive Summary

### Problem
Currently, SnapSpot PWA and snapspot-utils duplicate significant functionality:
- Blob ↔ Base64 conversion
- Export file parsing and validation
- Export file generation
- Hash calculation
- ID generation
- Data structure manipulation

This duplication leads to:
- ❌ Maintenance burden (bugs must be fixed in two places)
- ❌ Inconsistent behavior between app and utils
- ❌ Difficulty adding new features (must implement twice)
- ❌ Code bloat (~400-500 lines of duplicate code)

### Solution
Extract shared functionality into standalone, reusable libraries:

```
lib/
├── snapspot-data/          ← Pure data operations (NEW)
│   ├── parser.js           ← Import from snapspot-utils
│   ├── writer.js           ← Import from snapspot-utils
│   ├── validator.js        ← Import from snapspot-utils
│   └── merger.js           ← Extract from MapDataExporterImporter
├── snapspot-image/         ← Image processing utilities (NEW)
│   └── converter.js        ← Extract from ImageProcessor
└── snapspot-storage/       ← Storage integration (REFACTOR)
    └── exporter-importer.js ← Slim version of MapDataExporterImporter
```

### Benefits
- ✅ Single source of truth for data operations
- ✅ Consistent behavior across app and utils
- ✅ Easier testing (pure functions, no DOM/storage dependencies)
- ✅ Future-proof (easy to add GeoJSON, CSV, etc.)
- ✅ Reduced code size (~30-40% reduction in duplication)

---

## Current State Analysis

### Duplicate Code Inventory

#### 1. Blob/Base64 Conversion

**Location 1:** `js/imageProcessor.js`
```javascript
class ImageProcessor {
  async blobToBase64(imageBlob)      // Instance method
  static base64ToBlob(base64String)  // Static method
}
```

**Location 2:** `snapspot-utils/core/formats/snapspot/parser.js`
```javascript
export function base64ToBlob(dataUri)
```

**Location 3:** `snapspot-utils/core/formats/snapspot/writer.js`
```javascript
export function blobToBase64(blob)
```

**Issues:**
- Three separate implementations
- Different parameter names/signatures
- Utils version is more robust (better error handling)

---

#### 2. Export File Parsing

**Location 1:** `js/MapDataExporterImporter.js`
```javascript
static async importData(jsonString, ImageProcessorClass, mapStorage)
  // ~200 lines
  // Tightly coupled to storage and UI (modals)
  // Handles business logic (merge/replace decisions)
```

**Location 2:** `snapspot-utils/core/formats/snapspot/parser.js`
```javascript
export async function parseExport(jsonString)
  // ~80 lines
  // Pure function, no dependencies
  // Well-tested
```

**Issues:**
- Main app has complex logic mixed with data parsing
- Utils version is cleaner but app doesn't use it

---

#### 3. Export File Writing

**Location 1:** `js/MapDataExporterImporter.js`
```javascript
static async exportData(map, markers, photos, imageProcessor, options, mapStorage)
  // ~100 lines
  // Handles both data serialization and file download
  // Coupled to storage for imageHash calculation
```

**Location 2:** `snapspot-utils/core/formats/snapspot/writer.js`
```javascript
export async function buildExport(map, mapImage, markers, photos, options)
  // ~60 lines
  // Pure function, returns JSON string
  // No side effects
```

**Issues:**
- App version mixes business logic with data serialization
- Utils version is more focused and testable

---

#### 4. Validation

**Location 1:** `js/MapDataExporterImporter.js`
```javascript
// No dedicated validation, inline checks during import
if (importObject.type !== 'SnapSpotDataExport' || (!importObject.map...)) {
  throw new Error(...)
}
```

**Location 2:** `snapspot-utils/core/formats/snapspot/validator.js`
```javascript
export function validateExportFile(exportData)
  // ~150 lines
  // Comprehensive schema validation
  // Well-structured with detailed error messages
```

**Issues:**
- App has minimal validation
- Utils has better validation but app doesn't use it

---

#### 5. Hash Calculation

**Location 1:** `js/MapDataExporterImporter.js`
```javascript
static _arrayBufferToHex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), (x) =>
    ('00' + x.toString(16)).slice(-2)
  ).join('')
}
// Used inline with crypto.subtle.digest('SHA-256', arrayBuffer)
```

**Location 2:** `snapspot-utils/core/formats/snapspot/writer.js`
```javascript
export async function generateMapHash(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
```

**Issues:**
- Two implementations of hex conversion
- Utils version is more complete (includes arrayBuffer extraction)

---

#### 6. ID Generation

**Location 1:** `js/MapDataExporterImporter.js`
```javascript
// Uses crypto.randomUUID() directly inline
const newId = crypto.randomUUID()
```

**Location 2:** `snapspot-utils/core/formats/snapspot/writer.js`
```javascript
export function generateId(prefix = 'id') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}
```

**Issues:**
- App uses UUID (modern, better)
- Utils uses timestamp+random (legacy pattern)
- Inconsistent ID formats

---

#### 7. Merge Logic

**Location 1:** `js/MapDataExporterImporter.js`
```javascript
static async mergeData(existingMapId, importedObject, ImageProcessorClass, mapStorage)
  // ~150 lines
  // Complex marker/photo deduplication
  // Coupled to storage operations
```

**Location 2:** `snapspot-utils/` - **MISSING**
- Utils could benefit from this for combining multiple exports

**Issues:**
- Valuable logic trapped in main app
- Utils can't merge exports without reimplementing

---

### Functionality Matrix

| Feature | Main App | Utils | Shared Needed? |
|---------|----------|-------|----------------|
| Blob ↔ Base64 | ✅ (ImageProcessor) | ✅ (parser/writer) | **YES** |
| Parse Export | ✅ (importData) | ✅ (parseExport) | **YES** |
| Write Export | ✅ (exportData) | ✅ (buildExport) | **YES** |
| Validate Schema | ⚠️ (minimal) | ✅ (validator) | **YES** |
| Hash Calculation | ✅ (inline) | ✅ (generateMapHash) | **YES** |
| ID Generation | ✅ (UUID) | ✅ (timestamp) | **YES** |
| Merge Data | ✅ (complex) | ❌ | **YES** |
| Split by Date | ✅ | ❌ | **YES** |
| Storage Operations | ✅ | ❌ | **NO** (app-only) |
| UI Workflows | ✅ | ❌ | **NO** (app-only) |
| File Download | ✅ | ⚠️ (in tools) | **PARTIAL** |

---

## Target Architecture

### Library Structure

```
c:\Users\Niels\source\SnapSpot\
├── lib/                                    ← NEW: Shared libraries
│   ├── snapspot-data/                      ← Pure data operations
│   │   ├── parser.js                       ← Parse SnapSpot exports
│   │   ├── writer.js                       ← Generate SnapSpot exports
│   │   ├── validator.js                    ← Schema validation
│   │   ├── merger.js                       ← Merge/combine logic (NEW)
│   │   ├── splitter.js                     ← Split by date/criteria (NEW)
│   │   └── __tests__/
│   │       └── data-operations.test.js
│   ├── snapspot-image/                     ← Image utilities
│   │   ├── converter.js                    ← Blob/Base64 conversion
│   │   ├── hasher.js                       ← Hash calculation
│   │   └── __tests__/
│   │       └── image-utils.test.js
│   └── snapspot-storage/                   ← Storage integration (app-only)
│       └── exporter-importer.js            ← Refactored MapDataExporterImporter
├── js/                                     ← Main app code
│   ├── app.js
│   ├── imageProcessor.js                   ← REFACTOR: use lib/snapspot-image
│   ├── MapDataExporterImporter.js          ← REFACTOR: use lib/snapspot-data
│   └── storage.js
├── snapspot-utils/                         ← Utils suite
│   ├── core/
│   │   ├── formats/
│   │   │   └── snapspot/
│   │   │       ├── parser.js               ← DEPRECATED: moved to lib
│   │   │       ├── writer.js               ← DEPRECATED: moved to lib
│   │   │       └── validator.js            ← DEPRECATED: moved to lib
│   │   └── transformation/
│   │       └── affine-transform.js
│   └── tools/
│       └── map-migrator/
│           └── migrator.js                 ← REFACTOR: use lib/snapspot-data
└── docs/
    └── LIBRARY_REFACTORING_PLAN.md         ← This document
```

### Module Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                    Main SnapSpot App                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  app.js                                          │  │
│  │  ├─ imports lib/snapspot-storage/                │  │
│  │  └─ imports js/imageProcessor.js (refactored)    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  js/imageProcessor.js (REFACTORED)               │  │
│  │  └─ imports lib/snapspot-image/converter.js      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  lib/snapspot-storage/exporter-importer.js       │  │
│  │  └─ imports lib/snapspot-data/* (all modules)    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Both use
                           ▼
┌─────────────────────────────────────────────────────────┐
│               lib/snapspot-data/ (SHARED)               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  parser.js      ← parseExport()                  │  │
│  │  writer.js      ← buildExport()                  │  │
│  │  validator.js   ← validateExportFile()           │  │
│  │  merger.js      ← mergeExports()                 │  │
│  │  splitter.js    ← splitByDate(), filterMarkers() │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Both use
                           ▼
┌─────────────────────────────────────────────────────────┐
│              lib/snapspot-image/ (SHARED)               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  converter.js   ← blobToBase64(), base64ToBlob() │  │
│  │  hasher.js      ← generateHash()                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Uses
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  snapspot-utils Suite                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  tools/map-migrator/migrator.js                  │  │
│  │  └─ imports lib/snapspot-data/*                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### API Design Principles

1. **Pure Functions First**
   - No DOM manipulation in library code
   - No storage operations in data libraries
   - All functions testable in isolation

2. **Clear Separation of Concerns**
   - `lib/snapspot-data/`: Data structure operations (no images, no storage)
   - `lib/snapspot-image/`: Image utilities (no data knowledge)
   - `lib/snapspot-storage/`: Storage integration (app-specific, uses both above)

3. **Backward Compatibility**
   - Keep existing public APIs during transition
   - Use adapters/wrappers where needed
   - Deprecate gradually, not immediately

4. **Error Handling**
   - Libraries throw descriptive errors
   - Apps handle errors with UI feedback
   - No silent failures

---

## Refactoring Phases

### Phase 1: Create Shared Libraries (Week 1)
**Goal:** Extract and consolidate shared code without breaking anything

**Steps:**
1. Create library directories
2. Move utils code to lib/ (canonical version)
3. Add comprehensive tests
4. Document APIs

**Deliverables:**
- `lib/snapspot-data/` module (4 files)
- `lib/snapspot-image/` module (2 files)
- Test suite passing
- API documentation

**Risk:** Low (no existing code changed yet)

---

### Phase 2: Refactor SnapSpot App (Week 2)
**Goal:** Main app uses new libraries, all functionality preserved

**Steps:**
1. Update ImageProcessor to use lib/snapspot-image
2. Refactor MapDataExporterImporter to use lib/snapspot-data
3. Create lib/snapspot-storage wrapper
4. Update all imports in app files
5. Manual testing of all workflows

**Deliverables:**
- App using shared libraries
- No functionality broken
- All manual tests pass

**Risk:** Medium (requires careful testing)

---

### Phase 3: Refactor snapspot-utils (Week 3)
**Goal:** Utils use lib/ instead of local copies

**Steps:**
1. Update utils to import from lib/
2. Deprecate local format handlers
3. Add merge functionality to utils
4. Update tests

**Deliverables:**
- Utils using shared libraries
- Deprecated files removed
- New features available in utils

**Risk:** Low (utils already have good tests)

---

### Phase 4: Documentation & Cleanup (Week 4)
**Goal:** Finalize, document, optimize

**Steps:**
1. Update all documentation
2. Add usage examples
3. Performance optimization
4. Remove deprecated code

**Deliverables:**
- Complete documentation
- Clean codebase
- Performance benchmarks

**Risk:** Low

---

## Detailed Task List

### Phase 1: Create Shared Libraries

#### Task 1.1: Setup Library Structure
- [ ] Create `lib/` directory in project root
- [ ] Create `lib/snapspot-data/` subdirectory
- [ ] Create `lib/snapspot-image/` subdirectory
- [ ] Create `lib/snapspot-storage/` subdirectory (placeholder)
- [ ] Add README.md to each library explaining purpose

**Estimated time:** 1 hour

---

#### Task 1.2: Create lib/snapspot-image/converter.js
**Source:** Extract from `js/imageProcessor.js` and `snapspot-utils/core/formats/snapspot/`

**Functions to implement:**
```javascript
/**
 * Convert Blob to base64 data URI
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} Data URI string
 */
export async function blobToBase64(blob)

/**
 * Convert base64 data URI to Blob
 * @param {string} dataUri - Data URI string (e.g., 'data:image/jpeg;base64,...')
 * @param {string} [mimeType] - Optional MIME type override
 * @returns {Blob} Image blob
 */
export function base64ToBlob(dataUri, mimeType = null)
```

**Implementation notes:**
- Use utils version as base (better error handling)
- Add comprehensive input validation
- Support both static and async usage patterns

**Testing:**
- Manual testing via PWA workflows (export/import)
- Automated tests in snapspot-utils

**Estimated time:** 3 hours

---

#### Task 1.3: Create lib/snapspot-image/hasher.js
**Source:** Extract from `js/MapDataExporterImporter.js` and `snapspot-utils/core/formats/snapspot/writer.js`

**Functions to implement:**
```javascript
/**
 * Generate SHA-256 hash of image data
 * @param {Blob} blob - Image blob to hash
 * @returns {Promise<string>} Hex string hash (64 characters)
 */
export async function generateImageHash(blob)

/**
 * Convert ArrayBuffer to hex string (internal utility)
 * @private
 * @param {ArrayBuffer} buffer - Buffer to convert
 * @returns {string} Hex string
 */
function arrayBufferToHex(buffer)
```

**Implementation notes:**
- Use crypto.subtle.digest for hashing
- Ensure consistent hex format (lowercase, 64 chars)
- Add validation for Blob input

**Testing:**
- Manual testing via PWA export workflows
- Automated tests in snapspot-utils

**Estimated time:** 2 hours

---

#### Task 1.4: Create lib/snapspot-data/parser.js
**Source:** Copy from `snapspot-utils/core/formats/snapspot/parser.js`

**Functions to export:**
```javascript
export async function parseExport(jsonString)
export function parseExportMetadata(jsonString)
export function extractMapImage(mapObject)
export function validateMarkerCoordinates(markers, mapWidth, mapHeight)
export function clampMarkerToBounds(marker, mapWidth, mapHeight)
```

**Changes from utils version:**
- Import `base64ToBlob` from `lib/snapspot-image/converter.js`
- Update JSDoc to reference new location
- Keep all existing functionality

**Testing:**
- Existing automated tests in snapspot-utils will be updated
- Manual testing via PWA import workflows

**Estimated time:** 2 hours

---

#### Task 1.5: Create lib/snapspot-data/writer.js
**Source:** Copy from `snapspot-utils/core/formats/snapspot/writer.js`

**Functions to export:**
```javascript
export function generateId(prefix = 'id')
export async function buildExport(map, mapImage, markers, photos, options)
export async function updateMarkersInExport(originalExport, newMarkers, options)
export function createMinimalExport(overrides)
```

**Changes from utils version:**
- Import `blobToBase64` from `lib/snapspot-image/converter.js`
- Import `generateImageHash` from `lib/snapspot-image/hasher.js`
- Update ID generation to use crypto.randomUUID() by default
- Add backward compatibility option for timestamp-based IDs

**Testing:**
- Existing automated tests in snapspot-utils will be updated
- Manual testing via PWA export workflows

**Estimated time:** 3 hours

---

#### Task 1.6: Create lib/snapspot-data/validator.js
**Source:** Copy from `snapspot-utils/core/formats/snapspot/validator.js`

**Functions to export:**
```javascript
export const SUPPORTED_VERSIONS = ['1.1']
export const SCHEMA = { root, map, marker, photo }
export function isSupportedVersion(version)
export function validateExportFile(exportData)
export function validateExportFileDetailed(exportData)
```

**Changes from utils version:**
- No changes needed (already pure)
- Copy as-is

**Testing:**
- Existing automated tests in snapspot-utils

**Estimated time:** 1 hour

---

#### Task 1.7: Create lib/snapspot-data/merger.js (NEW)
**Source:** Extract from `js/MapDataExporterImporter.js` → `mergeData()`

**Functions to implement:**
```javascript
/**
 * Merge two SnapSpot exports
 * Combines markers and photos, handling duplicates
 * @param {Object} targetExport - Existing export to merge into
 * @param {Object} sourceExport - New export to merge from
 * @param {Object} options - Merge options
 * @returns {Object} Merged export data
 */
export function mergeExports(targetExport, sourceExport, options = {})

/**
 * Find duplicate markers by coordinates
 * @param {Array} existingMarkers - Markers in target export
 * @param {Object} candidateMarker - Marker to check
 * @param {number} tolerance - Pixel tolerance for matching (default: 0)
 * @returns {Object|null} Matching marker or null
 */
export function findDuplicateMarker(existingMarkers, candidateMarker, tolerance = 0)

/**
 * Merge marker photo lists, avoiding duplicates
 * @param {Array} existingPhotoIds - Existing marker's photo IDs
 * @param {Array} newPhotoIds - New photo IDs to add
 * @returns {Array} Merged photo ID list
 */
export function mergePhotoIds(existingPhotoIds, newPhotoIds)

/**
 * Detect duplicate photos by filename and marker
 * @param {Array} existingPhotos - Photos in target export
 * @param {Object} candidatePhoto - Photo to check
 * @returns {boolean} True if duplicate exists
 */
export function isDuplicatePhoto(existingPhotos, candidatePhoto)
```

**Implementation notes:**
- Extract pure logic from MapDataExporterImporter.mergeData()
- Remove all storage operations (MapStorage calls)
- Work with plain export objects (from parser)
- Return new export object (immutable)
- No DOM/UI dependencies

**Options object:**
```javascript
{
  coordinateTolerance: 0,        // Pixel tolerance for marker matching
  duplicatePhotoStrategy: 'skip', // 'skip' | 'rename' | 'replace'
  generateNewIds: false,         // Generate new IDs for all merged items
  preserveTimestamps: true       // Keep original creation dates
}
```

**Testing:**
- Manual testing via PWA import with merge decisions
- Automated tests in snapspot-utils

**Estimated time:** 6 hours

---

#### Task 1.8: Create lib/snapspot-data/splitter.js (NEW)
**Source:** Extract from `js/MapDataExporterImporter.js` → `_exportSplitByDate()`

**Functions to implement:**
```javascript
/**
 * Split export by date ranges
 * @param {Object} exportData - Full export to split
 * @param {Array<string>} dates - Array of YYYY-MM-DD date strings
 * @returns {Array<Object>} Array of export objects, one per date
 */
export function splitByDates(exportData, dates)

/**
 * Filter markers by date range
 * @param {Array} markers - Markers to filter
 * @param {string} startDate - YYYY-MM-DD start date (inclusive)
 * @param {string} endDate - YYYY-MM-DD end date (inclusive)
 * @returns {Array} Filtered markers
 */
export function filterMarkersByDateRange(markers, startDate, endDate)

/**
 * Group markers by day
 * @param {Array} markers - Markers to group
 * @returns {Object} Object with YYYY-MM-DD keys and marker arrays
 */
export function groupMarkersByDay(markers)

/**
 * Filter photos by marker IDs
 * @param {Array} photos - All photos
 * @param {Set} markerIds - Set of marker IDs to include
 * @returns {Array} Filtered photos
 */
export function filterPhotosByMarkers(photos, markerIds)
```

**Implementation notes:**
- Pure functions, no side effects
- Work with parsed export objects
- Return new objects (immutable)
- Handle edge cases (invalid dates, empty arrays)

**Testing:**
- Manual testing via PWA export by date
- Automated tests in snapspot-utils

**Estimated time:** 4 hours

---

#### Task 1.9: Update Utils Tests for Library Modules
**Update:** `snapspot-utils/core/formats/snapspot/__tests__/`

**Changes:**
- Update existing tests to import from `lib/snapspot-data/` and `lib/snapspot-image/`
- Add new test files for merger.js and splitter.js
- Ensure all tests pass with new library structure

**Test files to update/create:**
1. Update existing parser tests
2. Update existing writer tests
3. Update existing validator tests
4. Create new merger.test.js
5. Create new splitter.test.js

**Estimated time:** 6 hours (includes writing new tests)

---

#### Task 1.10: Document Library APIs
**Create:**
- `lib/README.md` - Overview of all libraries
- `lib/snapspot-data/README.md` - Data operations API
- `lib/snapspot-image/README.md` - Image utilities API

**Include:**
- Purpose and scope
- API reference (all exported functions)
- Usage examples
- Integration guide

**Estimated time:** 4 hours

---

### Phase 2: Refactor SnapSpot App

#### Task 2.1: Refactor ImageProcessor
**File:** `js/imageProcessor.js`

**Changes:**
1. Import from lib/snapspot-image:
```javascript
import { blobToBase64, base64ToBlob } from '../lib/snapspot-image/converter.js'
```

2. Replace methods:
```javascript
// OLD
async blobToBase64(imageBlob) { /* implementation */ }
static base64ToBlob(base64String, mimeType) { /* implementation */ }

// NEW
async blobToBase64(imageBlob) {
  return blobToBase64(imageBlob) // Use library version
}
static base64ToBlob(base64String, mimeType) {
  return base64ToBlob(base64String, mimeType) // Use library version
}
```

3. Keep other methods (processImage, generateThumbnailDataUrl, prepareMapsForDisplay)

**Testing:**
- Manual test: Upload a map
- Manual test: Export map to JSON
- Manual test: Import map from JSON
- Manual test: View photo gallery

**Estimated time:** 2 hours

---

#### Task 2.2: Create lib/snapspot-storage/exporter-importer.js
**Purpose:** Refactored MapDataExporterImporter that uses lib/snapspot-data

**Structure:**
```javascript
import { parseExport } from '../snapspot-data/parser.js'
import { buildExport } from '../snapspot-data/writer.js'
import { validateExportFile } from '../snapspot-data/validator.js'
import { mergeExports } from '../snapspot-data/merger.js'
import { splitByDates, groupMarkersByDay } from '../snapspot-data/splitter.js'
import { generateImageHash } from '../snapspot-image/hasher.js'

/**
 * Storage-aware export/import operations
 * Integrates lib/snapspot-data with MapStorage
 */
export class StorageExporterImporter {
  /**
   * Export map data to JSON with storage integration
   * @param {Object} map - Map from storage
   * @param {Array} markers - Markers from storage
   * @param {Array} photos - Photos from storage
   * @param {ImageProcessor} imageProcessor - For blob conversion
   * @param {Object} options - Export options
   * @param {MapStorage} mapStorage - Storage instance
   */
  static async exportData(map, markers, photos, imageProcessor, options, mapStorage)
  
  /**
   * Import data with storage integration
   * @param {string} jsonString - JSON export string
   * @param {Class} ImageProcessorClass - ImageProcessor class
   * @param {MapStorage} mapStorage - Storage instance
   * @returns {Promise<Object>} Import result with type (new/merge/replace)
   */
  static async importData(jsonString, ImageProcessorClass, mapStorage)
  
  /**
   * Merge imported data into existing map
   * @param {string} existingMapId - Target map ID
   * @param {Object} importedObject - Parsed import data
   * @param {Class} ImageProcessorClass - ImageProcessor class
   * @param {MapStorage} mapStorage - Storage instance
   */
  static async mergeData(existingMapId, importedObject, ImageProcessorClass, mapStorage)
  
  // ... other storage-aware methods
}
```

**Implementation approach:**
1. Copy MapDataExporterImporter methods
2. Replace data operations with library calls
3. Keep storage operations (saveMap, saveMarker, etc.)
4. Keep UI integration (modals, file download)

**What moves to library:**
- Data parsing: Use `parseExport()`
- Data writing: Use `buildExport()`
- Validation: Use `validateExportFile()`
- Merging logic: Use `mergeExports()`
- Splitting: Use `splitByDates()`

**What stays in StorageExporterImporter:**
- `mapStorage.saveMap()`, `saveMarker()`, `savePhoto()`
- `mapStorage.getMap()`, `getMarkersForMap()`, etc.
- Modal interactions (`modalManager.createExportDecisionModal()`)
- File download triggers (`_triggerDownload()`)
- Hash updates in storage

**Estimated time:** 8 hours

---

#### Task 2.3: Update MapDataExporterImporter → StorageExporterImporter
**File:** `js/MapDataExporterImporter.js`

**Option A: Replace entirely**
- Rename file to `StorageExporterImporter.js`
- Update all imports in app.js

**Option B: Wrapper (backward compatibility)**
- Keep MapDataExporterImporter.js
- Import StorageExporterImporter
- Create wrapper methods that delegate

**Recommended: Option B (safer)**
```javascript
// js/MapDataExporterImporter.js
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js'

/**
 * @deprecated Use StorageExporterImporter from lib/snapspot-storage
 * This wrapper exists for backward compatibility during transition
 */
export class MapDataExporterImporter {
  static async exportData(...args) {
    return StorageExporterImporter.exportData(...args)
  }
  
  static async importData(...args) {
    return StorageExporterImporter.importData(...args)
  }
  
  // ... other delegated methods
}
```

**Testing:**
- Manual test: Export complete map
- Manual test: Export by date (single and split)
- Manual test: Import new map
- Manual test: Import with merge decision
- Manual test: Import with replace
- Manual test: Secondary matching

**Estimated time:** 4 hours

---

#### Task 2.4: Update app.js Imports
**File:** `js/app.js`

**Changes:**
```javascript
// OLD
import { MapDataExporterImporter } from './MapDataExporterImporter.js'

// NEW (if using wrapper)
import { MapDataExporterImporter } from './MapDataExporterImporter.js' // No change needed

// OR (if replacing)
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js'
// Then update all `MapDataExporterImporter.` → `StorageExporterImporter.`
```

**Estimated time:** 1 hour

---

#### Task 2.5: Manual Testing - Complete Suite
**Test all app functionality:**

1. **Map Management:**
   - [ ] Upload new map (raster and SVG)
   - [ ] View map list
   - [ ] Switch between maps
   - [ ] Delete map

2. **Marker Operations:**
   - [ ] Add marker to map
   - [ ] Edit marker details
   - [ ] Delete marker
   - [ ] View marker list

3. **Photo Operations:**
   - [ ] Upload photos to marker
   - [ ] View photo gallery
   - [ ] Open photo viewer modal
   - [ ] Delete photo

4. **Export (all variations):**
   - [ ] Export complete map
   - [ ] Export single date
   - [ ] Export multiple dates (combined)
   - [ ] Export multiple dates (split files)
   - [ ] Export HTML report

5. **Import (all scenarios):**
   - [ ] Import new map (no hash match)
   - [ ] Import with hash match → merge
   - [ ] Import with hash match → replace
   - [ ] Import with hash match → new
   - [ ] Import with secondary match (fuzzy)
   - [ ] Import legacy format (no hash)

6. **Search:**
   - [ ] Search markers by description
   - [ ] Search results display
   - [ ] Jump to marker from search

7. **Settings:**
   - [ ] Change compression settings
   - [ ] Export settings
   - [ ] Import settings

**Test data:**
- Create test map with 20+ markers
- Add photos to several markers
- Export and re-import
- Test merge with overlapping data

**Estimated time:** 6 hours

---

### Phase 3: Refactor snapspot-utils

#### Task 3.1: Update Map Migrator to Use lib/
**File:** `snapspot-utils/tools/map-migrator/migrator.js`

**Changes:**
```javascript
// OLD
import { parseExport } from '../../core/formats/snapspot/parser.js'
import { buildExport } from '../../core/formats/snapspot/writer.js'

// NEW
import { parseExport } from '../../../lib/snapspot-data/parser.js'
import { buildExport } from '../../../lib/snapspot-data/writer.js'
```

**Update relative paths throughout**

**Testing:**
- Run map migrator tool
- Load export file
- Transform markers
- Generate new export

**Estimated time:** 2 hours

---

#### Task 3.2: Deprecate snapspot-utils/core/formats/snapspot/
**Files to update:**

1. Add deprecation notices:
```javascript
// snapspot-utils/core/formats/snapspot/parser.js
/**
 * @deprecated This module has been moved to lib/snapspot-data/parser.js
 * Please update imports to use the shared library instead.
 * This file will be removed in a future version.
 */
console.warn('DEPRECATED: snapspot-utils/core/formats/snapspot/parser.js is deprecated. Use lib/snapspot-data/parser.js')

export * from '../../../lib/snapspot-data/parser.js'
```

2. Update README:
```markdown
# ⚠️ DEPRECATED

This directory has been moved to `lib/snapspot-data/`.

Please update your imports:
```javascript
// OLD
import { parseExport } from './core/formats/snapspot/parser.js'

// NEW
import { parseExport } from '../../lib/snapspot-data/parser.js'
```

**Testing:**
- Verify utils still work with re-exports
- Check for console warnings

**Estimated time:** 1 hour

---

#### Task 3.3: Update Utils Tests to Use lib/
**Files:**
- `snapspot-utils/core/formats/snapspot/__tests__/integration.test.js`

**Changes:**
Update all imports to reference lib/

**Create new test:**
- `lib/__tests__/integration-test.html` (combined test runner)

**Estimated time:** 2 hours

---

#### Task 3.4: Add Merge Functionality to Utils
**Goal:** Utils can now merge multiple export files

**New tool or feature:**
Option A: Add to map-migrator
Option B: Create new `tools/export-merger/` tool

**Recommended: Option B (separate tool)**
```
snapspot-utils/tools/export-merger/
├── index.html
├── merger-ui.js
├── merger.js
└── styles.css
```

**Features:**
- Load multiple export files
- Preview merge conflicts
- Generate merged export
- Uses lib/snapspot-data/merger.js

**Estimated time:** 8 hours

---

#### Task 3.5: Update Utils Documentation
**Files to update:**
- `snapspot-utils/README.md`
- `snapspot-utils/docs/SPECIFICATIONS.md`
- `snapspot-utils/docs/ARCHITECTURE.md`

**Add:**
- Reference to shared libraries
- Migration guide
- Updated import examples

**Estimated time:** 3 hours

---

### Phase 4: Documentation & Cleanup

#### Task 4.1: Update Main Documentation
**Files:**
- `README.md` (project root)
- `docs/Instructions.md`

**Add section:**
```markdown
## Library Architecture

SnapSpot uses shared libraries for data operations:

- `lib/snapspot-data/`: Parse, write, validate, merge, split export files
- `lib/snapspot-image/`: Image conversion and hashing utilities
- `lib/snapspot-storage/`: Storage integration (app-only)

See [lib/README.md](lib/README.md) for details.
```

**Estimated time:** 2 hours

---

#### Task 4.2: Create Migration Examples
**New file:** `docs/LIBRARY_MIGRATION_GUIDE.md`

**Content:**
- Before/after code examples
- Common patterns
- Tips for using libraries
- Troubleshooting

**Estimated time:** 3 hours

---

#### Task 4.3: Remove Deprecated Code
**After thorough testing:**
1. Remove `snapspot-utils/core/formats/snapspot/` directory
2. Remove wrapper in `js/MapDataExporterImporter.js` (if using wrapper approach)
3. Clean up unused imports

**Verification:**
- Run all tests
- Manual testing
- Check for broken imports

**Estimated time:** 2 hours

---

#### Task 4.4: Performance Benchmarking
**Create:** `lib/__tests__/performance.test.html`

**Benchmarks:**
- Parse large export (10,000 markers)
- Build large export
- Merge two large exports
- Split by 30 dates

**Targets:**
- Parse: <500ms for 10k markers
- Build: <1s for 10k markers
- Merge: <2s for 2x 5k marker exports

**Estimated time:** 4 hours

---

#### Task 4.5: Final Review & Optimization
**Activities:**
1. Code review of all library modules
2. JSDoc completeness check
3. Error handling review
4. Edge case testing

**Estimated time:** 4 hours

---

## Testing Strategy

### Overview

**SnapSpot PWA:** Manual testing only. No automated test suite.

**snapspot-utils:** Automated testing using the existing test framework.

### Automated Testing (Utils Only)

#### Unit Tests
**Coverage target:** 90%+ for library code

**Test files:**
- All functions in lib/snapspot-data/
- All functions in lib/snapspot-image/
- Use snapspot-utils test framework

**Run:**
```bash
# Open in browser
open lib/__tests__/test-runner.html
```

#### Integration Tests
**Test scenarios:**
- Round-trip: export → parse → build → same data
- Merge: two exports → merged export → validate
- Split → merge → original data

---

### Manual Testing

#### Critical Paths (must verify after each phase)

**Phase 2 checklist:**
- [ ] Upload map works
- [ ] Add marker works
- [ ] Add photo works
- [ ] Export complete map
- [ ] Import new map
- [ ] Import and merge
- [ ] Search works
- [ ] Settings work

**Phase 3 checklist:**
- [ ] Map migrator loads exports
- [ ] Transformation works
- [ ] Generated export is valid
- [ ] (New) Merge tool works

---

### Regression Testing

**Test matrix:**

| Feature | Before Refactor | After Phase 2 | After Phase 3 |
|---------|----------------|---------------|---------------|
| Map upload | ✅ | ⚠️ Test | - |
| Export | ✅ | ⚠️ Test | - |
| Import | ✅ | ⚠️ Test | - |
| Merge | ✅ | ⚠️ Test | - |
| Migrator | ✅ | - | ⚠️ Test |

---

## Rollback Plan

### If Issues Arise in Phase 2

**Rollback steps:**
1. Revert commits in main app
2. Keep library development in separate branch
3. Continue using old MapDataExporterImporter
4. Debug library issues separately

**Safety measures:**
- Create `refactor-phase2` branch before starting
- Commit granularly (one task at a time)
- Tag stable points: `v1.0-pre-refactor`, `v1.1-post-refactor`

---

### If Issues Arise in Phase 3

**Rollback steps:**
1. Revert utils imports to local versions
2. Keep lib/ but don't use it yet
3. Debug in isolation

**Safety measures:**
- Keep deprecated files until Phase 4
- Use console warnings (non-breaking)

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All library files created
- ✅ All tests passing (100% suite)
- ✅ API documentation complete
- ✅ No errors/warnings in test runner

### Phase 2 Complete When:
- ✅ App uses libraries for all data operations
- ✅ All manual tests pass
- ✅ No new bugs introduced
- ✅ Performance same or better

### Phase 3 Complete When:
- ✅ Utils use libraries
- ✅ Deprecated code marked (not removed)
- ✅ New merge tool functional
- ✅ All utils tests pass

### Phase 4 Complete When:
- ✅ Documentation updated
- ✅ Deprecated code removed
- ✅ Performance benchmarks meet targets
- ✅ Zero known bugs

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 5 days | None |
| Phase 2 | 5 days | Phase 1 complete |
| Phase 3 | 4 days | Phase 2 complete |
| Phase 4 | 3 days | Phase 3 complete |
| **Total** | **17 days** (~3.5 weeks) | |

**Note:** Assumes 1 developer working full-time

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking app functionality | Medium | High | Comprehensive manual testing, gradual rollout |
| Performance regression | Low | Medium | Benchmarking, profiling |
| Merge logic bugs | Medium | High | Extensive unit tests, edge case testing |
| Import failures | Low | High | Validation tests with real exports |
| Utils incompatibility | Low | Low | Keep deprecated files during transition |

---

## Open Questions

1. **ID Generation Strategy**
   - Should we standardize on UUIDs everywhere?
   - Or support both UUID and timestamp-based IDs?
   - **Decision needed before Task 1.5**

2. **Merge Conflict Resolution**
   - UI for manual conflict resolution?
   - Or always use automatic strategies?
   - **Consider for Phase 4 enhancement**

3. **Library Versioning**
   - Should libraries have separate version numbers?
   - Or use app version?
   - **Decision needed before Phase 4**

4. **Future Format Support**
   - GeoJSON, CSV, KML adapters?
   - Should we plan architecture now?
   - **Optional Phase 5 consideration**

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Create GitHub issues** for each task
3. **Set up project board** for tracking
4. **Begin Phase 1** with Task 1.1

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Initial | Created comprehensive refactoring plan |

