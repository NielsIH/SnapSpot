# SnapSpot Format Handlers

**Phase 2: Format Handlers**

Parser, writer, and validator for SnapSpot export file format (v1.1).

---

## Modules

### 📋 validator.js

Validates SnapSpot export file structure and schema compliance.

**Functions:**
- `isSupportedVersion(version)` - Check if version is supported
- `validateExportFile(exportData)` - Validate complete export structure
- `validateExportFileDetailed(exportData)` - Validate with additional warnings

**Example:**
```javascript
import { validateExportFile } from './validator.js'

const result = validateExportFile(exportData)
if (!result.isValid) {
  console.error('Validation errors:', result.errors)
}
```

---

### 📖 parser.js

Parse SnapSpot export JSON files and extract structured data.

**Functions:**
- `parseExport(jsonString)` - Parse complete export file
- `parseExportMetadata(jsonString)` - Quick parse for preview
- `base64ToBlob(dataUri)` - Convert data URI to Blob
- `extractMapImage(mapObject)` - Extract map image from export
- `validateMarkerCoordinates(markers, mapWidth, mapHeight)` - Find out-of-bounds markers
- `clampMarkerToBounds(marker, mapWidth, mapHeight)` - Clamp marker to bounds

**Example:**
```javascript
import { parseExport } from './parser.js'

const parsed = await parseExport(jsonString)
console.log(`Loaded: ${parsed.map.name}`)
console.log(`Markers: ${parsed.markers.length}`)

// Use map image
const imageUrl = URL.createObjectURL(parsed.mapImage)
imgElement.src = imageUrl
```

---

### ✍️ writer.js

Generate valid SnapSpot export JSON files from structured data.

**Functions:**
- `buildExport(map, mapImage, markers, photos, options)` - Build complete export
- `updateMarkersInExport(originalExport, newMarkers, options)` - Update markers in export
- `generateId(prefix)` - Generate unique ID
- `blobToBase64(blob)` - Convert Blob to base64 data URI
- `generateMapHash(blob)` - Calculate SHA-256 hash
- `createMinimalExport(overrides)` - Create minimal export for testing

**Example:**
```javascript
import { buildExport } from './writer.js'

const exportJson = await buildExport(
  { name: 'My Map', width: 1000, height: 800 },
  mapBlob,
  markers,
  photos,
  { mapNameSuffix: ' - Migrated' }
)

// Download export
const blob = new Blob([exportJson], { type: 'application/json' })
saveAs(blob, 'map-export.json')
```

---

## Export Format Schema

### Root Structure

```json
{
  "version": "1.1",
  "type": "snapspot-export",
  "sourceApp": "SnapSpot v1.0",
  "exportDate": "2026-01-28T12:00:00.000Z",
  "map": { ... },
  "markers": [ ... ],
  "photos": [ ... ]
}
```

### Map Object

```json
{
  "id": "map_1706443200000_abc123",
  "name": "My Map",
  "imageData": "data:image/jpeg;base64,...",
  "width": 1000,
  "height": 800,
  "hash": "sha256-hash-string",
  "created": "2026-01-27T10:00:00.000Z",
  "modified": "2026-01-28T12:00:00.000Z"
}
```

### Marker Object

```json
{
  "id": "marker_1706443200001_def456",
  "x": 100,
  "y": 150,
  "label": "Marker 1",
  "created": "2026-01-27T10:30:00.000Z"
}
```

### Photo Object

```json
{
  "id": "photo_1706443200001_ghi789",
  "markerId": "marker_1706443200001_def456",
  "imageData": "data:image/jpeg;base64,...",
  "caption": "Photo caption",
  "created": "2026-01-27T12:00:00.000Z"
}
```

---

## Complete Workflow Example

### Parse → Transform → Write

```javascript
import { parseExport } from './parser.js'
import { buildExport } from './writer.js'
import { calculateAffineMatrix, batchTransform } from '../../transformation/affine-transform.js'

// 1. Parse original export
const originalJson = await fetch('original-map.json').then(r => r.text())
const parsed = await parseExport(originalJson)

// 2. Calculate transformation from control points
const sourcePoints = [
  { x: 100, y: 100 },
  { x: 500, y: 100 },
  { x: 100, y: 400 }
]

const targetPoints = [
  { x: 50, y: 50 },
  { x: 450, y: 80 },
  { x: 70, y: 380 }
]

const { matrix } = calculateAffineMatrix(sourcePoints, targetPoints)

// 3. Transform all markers
const transformedMarkers = parsed.markers.map(marker => {
  const sourcePoint = { x: marker.x, y: marker.y }
  const transformed = batchTransform([sourcePoint], matrix)[0]

  return {
    ...marker,
    x: transformed.x,
    y: transformed.y
  }
})

// 4. Build new export with transformed markers
const migratedJson = await buildExport(
  parsed.map,
  parsed.mapImage,
  transformedMarkers,
  parsed.photos,
  { mapNameSuffix: ' - Migrated' }
)

// 5. Download
const blob = new Blob([migratedJson], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'migrated-map.json'
a.click()
```

---

## Testing

### Run Tests

```bash
cd snapspot-utils
npx http-server -p 8080 --cors
# Open http://localhost:8080/core/formats/snapspot/__tests__/test-runner.html
```

### Test Coverage

**Total Tests:** 22

| Suite | Tests | Coverage |
|-------|-------|----------|
| Validator | 7 | Schema validation, version checks, error handling |
| Parser | 9 | JSON parsing, data extraction, coordinate validation |
| Writer | 4 | Export generation, ID generation, hash calculation |
| Integration | 4 | Round-trip integrity, performance (500 markers) |

---

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Parse export (3 markers) | <100ms | ✅ |
| Build export (3 markers) | <200ms | ✅ |
| Parse large (500 markers) | <1s | ✅ |
| Build large (500 markers) | <2s | ✅ |
| Round-trip data integrity | 100% | ✅ |

---

## Dependencies

- **Zero external dependencies** (pure ES6 modules)
- Uses native browser APIs:
  - `FileReader` for Blob/base64 conversion
  - `crypto.subtle.digest` for SHA-256 hashing
  - `atob/btoa` for base64 encoding/decoding

---

## Browser Compatibility

- Chrome 60+
- Firefox 57+
- Safari 11.1+
- Edge 79+

Requires support for:
- ES6 modules
- `crypto.subtle` (HTTPS required)
- FileReader API
- Blob/ArrayBuffer

---

## Error Handling

All functions throw descriptive errors:

```javascript
try {
  const parsed = await parseExport(jsonString)
} catch (error) {
  if (error.message.includes('Unsupported export version')) {
    // Handle version mismatch
  } else if (error.message.includes('Failed to parse JSON')) {
    // Handle invalid JSON
  } else {
    // Handle other errors
  }
}
```

---

## API Reference

See JSDoc comments in source files for complete API documentation:

- [validator.js](validator.js) - Schema validation
- [parser.js](parser.js) - Export parsing
- [writer.js](writer.js) - Export generation

---

## Phase 2 Status

✅ **COMPLETE**

- [x] Schema validator implemented
- [x] Export parser implemented
- [x] Export writer implemented
- [x] Test fixtures created
- [x] Integration tests passing (22/22)
- [x] Performance targets met
- [x] Zero dependencies
- [x] Browser-based test runner

**Next:** Phase 3 - Shared Utilities
