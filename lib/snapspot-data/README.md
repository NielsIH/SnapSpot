# snapspot-data

Pure data operations for SnapSpot export files.

---

## Modules

### parser.js
Parse and extract data from SnapSpot export files.

### writer.js
Generate SnapSpot export files from data.

### validator.js
Validate SnapSpot export file schema and data integrity.

### merger.js
Merge multiple SnapSpot exports intelligently.

### splitter.js
Split exports by dates or filter data.

---

## API Reference

### Parser API

#### `parseExport(jsonString)`
Parse a SnapSpot export JSON string.

**Parameters:**
- `jsonString` (string) - JSON export file content

**Returns:**
- `Promise<Object>` - Parsed export with Blob objects for images

**Example:**
```javascript
import { parseExport } from './lib/snapspot-data/parser.js'

const exportData = await parseExport(jsonFileContent)
// {
//   type: 'SnapSpotDataExport',
//   version: '1.1',
//   map: { id, name, image (Blob), ... },
//   markers: [...],
//   photos: [...]
// }
```

---

### Writer API

#### `buildExport(map, mapImage, markers, photos, options)`
Generate a SnapSpot export object.

**Parameters:**
- `map` (Object) - Map metadata
- `mapImage` (Blob) - Map image blob
- `markers` (Array) - Marker objects
- `photos` (Array) - Photo objects
- `options` (Object) - Export options

**Returns:**
- `Promise<Object>` - Export object ready for JSON serialization

**Example:**
```javascript
import { buildExport } from './lib/snapspot-data/writer.js'

const exportObj = await buildExport(
  { id: 'map1', name: 'Campus Map', width: 800, height: 600 },
  mapBlob,
  markers,
  photos,
  { includePhotos: true }
)

const json = JSON.stringify(exportObj, null, 2)
```

---

### Validator API

#### `validateExportFile(exportData)`
Validate SnapSpot export structure and data.

**Parameters:**
- `exportData` (Object) - Parsed export object

**Returns:**
- `Object` - `{ valid: boolean, errors: string[] }`

**Example:**
```javascript
import { validateExportFile } from './lib/snapspot-data/validator.js'

const result = validateExportFile(exportData)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

---

### Merger API

#### `mergeExports(targetExport, sourceExport, options)`
Merge two SnapSpot exports intelligently, including markers, photos, and metadata.

**Parameters:**
- `targetExport` (Object) - Base export to merge into
- `sourceExport` (Object) - Export to merge from
- `options` (Object) - Merge options

**Options:**
```javascript
{
  duplicateStrategy: 'coordinates',     // 'none', 'coordinates', 'label', 'photos', or 'smart'
  coordinateTolerance: 5,               // Pixel tolerance for coordinate-based matching
  photoMatchThreshold: 0.7,             // Fraction of filenames that must match (0.0-1.0)
  duplicatePhotoStrategy: 'skip',       // 'skip' or 'rename'
  preserveTimestamps: true,             // Keep original creation dates
  mergeMetadata: true,                  // Whether to merge metadata
  metadataConflictStrategy: 'skip',     // 'skip', 'overwrite', or 'keep-both'
  idGenerator: generateId               // Custom ID generator function
}
```

**Returns:**
- `Object` - New merged export

**Example:**
```javascript
import { mergeExports } from './lib/snapspot-data/merger.js'

const merged = mergeExports(existingExport, importedExport, {
  duplicateStrategy: 'smart',
  coordinateTolerance: 5,
  duplicatePhotoStrategy: 'skip',
  mergeMetadata: true,
  metadataConflictStrategy: 'keep-both'
})
```

#### `getMergeStatistics(targetExport, sourceExport, options)`
Get merge statistics without performing the actual merge.

**Parameters:**
- `targetExport` (Object) - Base export
- `sourceExport` (Object) - Export to merge
- `options` (Object) - Same options as mergeExports

**Returns:**
- `Object` - Statistics about the merge operation:
  ```javascript
  {
    duplicateMarkers: number,
    newMarkers: number,
    duplicatePhotos: number,
    newPhotos: number,
    totalSourceMarkers: number,
    totalSourcePhotos: number,
    duplicateMetadataDefinitions: number,
    newMetadataDefinitions: number,
    totalSourceMetadataDefinitions: number,
    newMetadataValues: number,
    totalSourceMetadataValues: number
  }
  ```

**Example:**
```javascript
import { getMergeStatistics } from './lib/snapspot-data/merger.js'

const stats = getMergeStatistics(existing, imported, { duplicateStrategy: 'smart' })
console.log(`Will add ${stats.newMarkers} markers and ${stats.newPhotos} photos`)
console.log(`Will add ${stats.newMetadataDefinitions} metadata definitions`)
```

#### Metadata Merge Strategies

**skip** (default): Skip duplicate definitions, keep existing ones
- Duplicate definitions are not imported
- Metadata values reference existing definitions

**overwrite**: Replace existing definitions with imported ones
- Existing definitions are updated with imported data
- Useful when importing updated field definitions

**keep-both**: Keep both versions of duplicate definitions
- Imported definitions get new IDs and renamed (e.g., "Field Name (imported)")
- Useful when you want to preserve both versions

---

### Splitter API

#### `splitByDates(exportData, dates)`
Split export into multiple exports by date ranges.

**Parameters:**
- `exportData` (Object) - Export to split
- `dates` (Array<string>) - ISO date strings

**Returns:**
- `Array<Object>` - Array of export objects, one per date

**Example:**
```javascript
import { splitByDates } from './lib/snapspot-data/splitter.js'

const splits = splitByDates(exportData, [
  '2026-01-15',
  '2026-01-20',
  '2026-01-25'
])
// => [export1, export2, export3]
```

#### `filterMarkersByDateRange(markers, startDate, endDate)`
Filter markers by creation date range.

**Parameters:**
- `markers` (Array) - Marker objects
- `startDate` (Date|string) - Start date
- `endDate` (Date|string) - End date

**Returns:**
- `Array` - Filtered markers

---

## Usage Patterns

### Complete Import/Export Cycle

```javascript
import { parseExport, buildExport } from './lib/snapspot-data/'

// Import
const fileContent = await file.text()
const importedData = await parseExport(fileContent)

// Process data...

// Export
const exportObj = await buildExport(
  importedData.map,
  importedData.map.image,
  importedData.markers,
  importedData.photos,
  { includePhotos: true }
)

const json = JSON.stringify(exportObj, null, 2)
```

### Merge Multiple Exports

```javascript
import { parseExport } from './lib/snapspot-data/parser.js'
import { mergeExports } from './lib/snapspot-data/merger.js'

const export1 = await parseExport(file1Content)
const export2 = await parseExport(file2Content)

const merged = mergeExports(export1, export2, {
  coordinateTolerance: 10
})
```

### Split by Date

```javascript
import { splitByDates } from './lib/snapspot-data/splitter.js'

const splits = splitByDates(exportData, [
  '2026-01-01',
  '2026-01-15',
  '2026-01-30'
])

splits.forEach((splitExport, index) => {
  const json = JSON.stringify(splitExport, null, 2)
  downloadFile(`export_split_${index}.json`, json)
})
```

---

## Design Philosophy

### Pure Functions
All functions are pure - same input always produces same output, no side effects.

### Immutability
Functions return new objects instead of modifying inputs.

### No Dependencies
- No DOM access
- No storage access
- No external dependencies (except image utilities)

### Comprehensive Validation
Every function validates inputs and throws descriptive errors.

---

## Error Handling

```javascript
import { parseExport } from './lib/snapspot-data/parser.js'

try {
  const data = await parseExport(invalidJson)
} catch (error) {
  if (error.message.includes('Invalid JSON')) {
    // Handle parse error
  } else if (error.message.includes('Unsupported version')) {
    // Handle version mismatch
  }
}
```
