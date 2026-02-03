# snapspot-storage

Storage-aware export/import operations for SnapSpot PWA.

---

## Overview

This module integrates the pure data operations from `snapspot-data` with browser storage (IndexedDB) and UI operations specific to the SnapSpot PWA.

**Dependencies:**
- `snapspot-data` - For parsing, writing, validation, merging, splitting
- `snapspot-image` - For image conversion and hashing
- MapStorage - For IndexedDB operations
- ModalManager - For user interaction dialogs

**Note:** This module is PWA-specific and uses browser APIs. It's not suitable for Node.js environments.

---

## API Reference

### StorageExporterImporter

#### `exportData(map, allMarkers, allPhotos, imageProcessor, options, mapStorage)`

Exports a map's data (map, markers, photos) to JSON file(s).

**Parameters:**
- `map` (Object) - The map object from storage (includes imageData Blob)
- `allMarkers` (Array) - All marker objects for the map
- `allPhotos` (Array) - All photo objects for the markers
- `imageProcessor` (Object) - Instance of ImageProcessor class
- `options` (Object) - Optional export options
  - `datesToExport` (string[]) - Array of YYYY-MM-DD date strings to filter markers
  - `splitByDate` (boolean) - If true, generates separate file for each date
- `mapStorage` (MapStorage) - Instance of MapStorage to update imageHash if needed

**Returns:** `Promise<void>` - Downloads file(s) to user's device

**Example:**
```javascript
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js'

await StorageExporterImporter.exportData(
  map,
  markers,
  photos,
  imageProcessor,
  { splitByDate: true, datesToExport: ['2026-02-01', '2026-02-02'] },
  mapStorage
)
```

---

#### `importData(jsonString, ImageProcessorClass, mapStorage)`

Imports map data from a JSON string. Handles new imports, hash-based matching, and secondary matching.

**Parameters:**
- `jsonString` (string) - The JSON string content from the import file
- `ImageProcessorClass` (Class) - The ImageProcessor CLASS for base64 conversions
- `mapStorage` (MapStorage) - Instance of MapStorage for querying

**Returns:** `Promise<Object>` - Import result with importType and data
  - `importType` - 'new' or 'decision_required'
  - `importObject` - Parsed data
  - `existingMaps` - Array of maps with matching hash (if any)
  - `secondaryMatches` - Array of maps with similar metadata (if any)

**Throws:** Error if JSON parsing or validation fails

**Example:**
```javascript
const importResult = await StorageExporterImporter.importData(
  jsonString,
  ImageProcessor,
  mapStorage
)

if (importResult.importType === 'new') {
  // No conflicts, ready to save
  const { map, markers, photos } = importResult
}
```

---

#### `mergeData(existingMapId, importedObject, ImageProcessorClass, mapStorage, options)`

Merge imported data into an existing map using intelligent duplicate detection.

**Parameters:**
- `existingMapId` (string) - ID of the existing map to merge into
- `importedObject` (Object) - The raw parsed import data
- `ImageProcessorClass` (Class) - ImageProcessor CLASS for conversions
- `mapStorage` (MapStorage) - Storage instance
- `options` (Object) - Merge options
  - `duplicateStrategy` (string) - 'coordinates', 'label', 'photos', 'smart', or 'none' (default: 'coordinates')
  - `coordinateTolerance` (number) - Pixel tolerance for coordinate matching (default: 5)
  - `photoMatchThreshold` (number) - Fraction of photo filenames that must match (default: 0.7)

**Returns:** `Promise<Object>` - Merged data result with stats
  - `map` - The existing map
  - `markers` - All markers (existing + new)
  - `photos` - All photos (existing + new)
  - `stats` - Merge statistics (newMarkers, updatedMarkers, newPhotos)

**Example:**
```javascript
const mergedData = await StorageExporterImporter.mergeData(
  existingMapId,
  importedObject,
  ImageProcessor,
  mapStorage,
  { duplicateStrategy: 'coordinates', coordinateTolerance: 5 }
)

console.log(`Added ${mergedData.stats.newMarkers} markers`)
```

---

#### `getMarkersGroupedByDay(mapId, mapStorage)`

Get markers grouped by day for a map.

**Parameters:**
- `mapId` (string) - The map ID
- `mapStorage` (MapStorage) - Storage instance

**Returns:** `Promise<Object>` - Markers grouped by YYYY-MM-DD date keys

**Example:**
```javascript
const grouped = await StorageExporterImporter.getMarkersGroupedByDay(
  mapId,
  mapStorage
)
// { '2026-02-01': [marker1, marker2], '2026-02-02': [marker3] }
```

---

#### `getSecondaryMapMatches(importedMap, mapStorage, tolerance)`

Get secondary map matches based on metadata when imageHash doesn't match.

**Parameters:**
- `importedMap` (Object) - The imported map object
- `mapStorage` (MapStorage) - Storage instance
- `tolerance` (number) - Matching tolerance (default: 0.05 = 5%)

**Returns:** `Promise<Array>` - Potential matching maps with markerCount

**Example:**
```javascript
const matches = await StorageExporterImporter.getSecondaryMapMatches(
  importedMap,
  mapStorage,
  0.05
)
```

---

#### `handleImportFile(app, file)`

Handle file import with full UI integration (wrapper for app integration).

**Parameters:**
- `app` (Object) - SnapSpotApp instance
- `file` (File) - The JSON file to import

**Returns:** `Promise<Object|null>` - Imported map or null if cancelled

**Example:**
```javascript
const importedMap = await StorageExporterImporter.handleImportFile(app, file)
if (importedMap) {
  console.log(`Imported: ${importedMap.name}`)
}
```

---

## Design Decisions

### Why Separate from snapspot-data?

1. **Browser Dependencies:** Uses browser-specific APIs (IndexedDB, FileReader, Blob URLs, DOM)
2. **UI Integration:** Shows modals for user decisions
3. **Storage Coupling:** Directly integrates with MapStorage class
4. **PWA-Specific:** Not reusable in Node.js environments like snapspot-utils

### Relationship to Other Libraries

```
StorageExporterImporter (this module)
    ↓ uses
snapspot-data (parser, writer, merger, splitter, validator)
    ↓ uses
snapspot-image (converter, hasher)
```

---

## Usage in SnapSpot PWA

The PWA uses this module through `app.js`:

```javascript
// app.js
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js'

// Export JSON
await StorageExporterImporter.exportData(map, markers, photos, imageProcessor, options, storage)

// Import JSON with decision handling
const importedMap = await StorageExporterImporter.handleImportFile(this, file)
```

---

## Error Handling

All methods throw descriptive errors:

```javascript
try {
  await StorageExporterImporter.importData(jsonString, ImageProcessor, storage)
} catch (error) {
  if (error.message.includes('Failed to parse JSON')) {
    // Handle JSON parse error
  } else if (error.message.includes('Validation')) {
    // Handle validation error
  }
}
```

---

## Related Documentation

- [snapspot-data/README.md](../snapspot-data/README.md) - Pure data operations
- [snapspot-image/README.md](../snapspot-image/README.md) - Image utilities
- [lib/README.md](../README.md) - Library overview

---

**Last Updated:** February 3, 2026
