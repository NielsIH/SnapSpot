# Phase 2: Format Handlers

**Estimated Duration:** 2-3 days  
**Dependencies:** Phase 1 complete  
**Goal:** Build SnapSpot export file parser and writer

## Deliverables

- `core/formats/snapspot/parser.js`
- `core/formats/snapspot/writer.js`
- `core/formats/snapspot/validator.js`
- Integration tests

---

## Tasks

### 2.1 Schema Validator

**File:** `core/formats/snapspot/validator.js`

- [ ] Define SnapSpot export schema constants
  - Supported versions: `['1.1']`
  - Required fields per object type

- [ ] Implement `validateExportFile(exportData)`
  - Check `version`, `type`, `sourceApp` fields
  - Validate map object structure
  - Validate markers array
  - Validate photos array
  - Return `{isValid: boolean, errors: Array<string>}`

- [ ] Implement `isSupportedVersion(version)`
  - Check against supported versions list

**Testing:**
```javascript
// Valid export
valid = validateExportFile(sampleExport)
expect(valid.isValid === true)

// Missing required field
invalid = {...sampleExport, map: undefined}
result = validateExportFile(invalid)
expect(result.errors.includes('map object required'))
```

---

### 2.2 Export Parser

**File:** `core/formats/snapspot/parser.js`

- [ ] Implement `parseExport(jsonString)`
  - Parse JSON string with error handling
  - Validate using `validator.js`
  - Extract and structure: `{map, markers, photos, metadata}`
  - Return standardized object

- [ ] Implement `extractMapImage(mapObject)`
  - Parse `imageData` data URI
  - Extract MIME type and base64
  - Convert to Blob
  - Return `{blob, width, height, hash}`

- [ ] Implement `base64ToBlob(dataUri)`
  - Parse data URI format: `data:image/jpeg;base64,...`
  - Decode base64 to binary
  - Create Blob with correct MIME type

- [ ] Add error handling for:
  - Invalid JSON syntax
  - Unsupported export version
  - Missing required fields
  - Corrupted base64 data

**Testing:**
```javascript
// Parse valid export
parsed = await parseExport(validJsonString)
expect(parsed.map.id).toBeDefined()
expect(parsed.markers.length > 0)

// Invalid JSON
await expect(parseExport('invalid')).rejects.toThrow()

// Unsupported version
v10Export = {...sample, version: '1.0'}
await expect(parseExport(JSON.stringify(v10Export))).rejects.toThrow()
```

---

### 2.3 Export Writer

**File:** `core/formats/snapspot/writer.js`

- [ ] Implement `generateId(prefix)`
  - Format: `{prefix}_{timestamp}_{random}`
  - Use `Date.now()` and `Math.random()`

- [ ] Implement `generateMapHash(imageData)`
  - Convert Blob to ArrayBuffer
  - Calculate SHA-256 using `crypto.subtle.digest`
  - Return hex string

- [ ] Implement `blobToBase64(blob)`
  - Use FileReader to read as data URL
  - Return Promise<string>

- [ ] Implement `buildExport(map, markers, photos, options)`
  - Create export structure with metadata
  - Generate new map ID if needed
  - Convert image Blob to base64
  - Calculate image hash
  - Set timestamps (current time)
  - Stringify with formatting
  - Return JSON string

**Options:**
```javascript
{
  preserveMapId: false,  // Keep original map ID
  mapNameSuffix: ' - Migrated',  // Append to map name
  sourceApp: 'SnapSpot Map Migrator v1.0'
}
```

**Testing:**
```javascript
// Build and parse round-trip
exported = await buildExport(map, markers, photos)
parsed = await parseExport(exported)
expect(parsed.markers).toEqual(markers)

// ID generation
id1 = generateId('map')
id2 = generateId('map')
expect(id1 !== id2)
expect(id1).toMatch(/^map_\d+_[a-z0-9]+$/)
```

---

### 2.4 Helper Utilities

**File:** `core/formats/snapspot/parser.js` (add to exports)

- [ ] Implement `validateMarkerCoordinates(markers, mapWidth, mapHeight)`
  - Check all `x` in `[0, mapWidth]`
  - Check all `y` in `[0, mapHeight]`
  - Return array of out-of-bounds markers

- [ ] Implement `clampMarkerToBounds(marker, mapWidth, mapHeight)`
  - Clamp x and y to valid range
  - Return clamped coordinates

---

### 2.5 Integration Testing

**Create:** `core/formats/snapspot/__tests__/integration.test.js`

- [ ] Test parser + writer round-trip
  - Parse original → write → parse again
  - Verify data integrity

- [ ] Test with real SnapSpot export files
  - Load fixture files from `__tests__/fixtures/`
  - Parse and validate

- [ ] Test error recovery
  - Malformed JSON
  - Missing images
  - Invalid base64

- [ ] Test large files
  - 1000+ markers
  - 10MB+ images
  - Measure performance

---

## Test Fixtures

**Create:** `core/formats/snapspot/__tests__/fixtures/`

- [ ] `minimal-export.json` - Bare minimum valid export
- [ ] `full-export.json` - Export with map, markers, photos
- [ ] `large-export.json` - 500+ markers for performance testing
- [ ] `invalid-version.json` - Unsupported version
- [ ] `corrupted.json` - Missing required fields

---

## Acceptance Criteria

- [ ] Can parse SnapSpot v1.1 export files
- [ ] Can generate valid SnapSpot v1.1 export files
- [ ] Round-trip preserves all data (parse → write → parse)
- [ ] Proper error messages for invalid files
- [ ] SHA-256 hash calculation works correctly
- [ ] All integration tests pass
- [ ] Handles files up to 50MB

---

## Notes

- **Base64 Encoding:** Use native `atob/btoa` or FileReader API
- **SHA-256:** Use `crypto.subtle.digest()` (async)
- **Large Files:** Test with 10MB+ exports to verify memory handling
- **Error Messages:** User-friendly, actionable (not just "invalid")
