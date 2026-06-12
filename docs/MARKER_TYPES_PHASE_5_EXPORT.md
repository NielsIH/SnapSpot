# Phase 5: Custom Marker Types — Export/Import Functionality

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1 complete; Phase 3 recommended; Phase 4 recommended

---

## Goals

Implement full export and import support for marker type definitions:
1. Bump export format version to v1.3
2. Update writer to serialize `markerTypeDefinitions[]` in map exports
3. Include `markerTypeId` and `direction` on exported markers
4. Update parser to parse marker type definitions and remap type IDs
5. Update merger for marker type definition deduplication and conflict resolution
6. Implement separate marker type definitions export (from Settings)
7. Update import decision modal for marker type conflicts
8. Ensure backward compatibility with v1.1 and v1.2 exports

---

## Export Format Specification (v1.3)

### Full Map Export

```javascript
{
  version: '1.3',
  type: 'snapspot-export',
  sourceApp: 'SnapSpot',
  timestamp: '2026-06-11T12:00:00.000Z',
  map: { /* existing map data */ },
  markers: [
    {
      id: 'uuid',
      x: 100,
      y: 200,
      description: 'Arrow marker',
      photoIds: [],
      createdDate: '2026-06-11T...',
      // NEW optional fields:
      markerTypeId: 'uuid',    // Present only if marker has a custom type
      direction: 45            // Present only for arrow types
    }
  ],
  photos: [ /* existing photo data */ ],
  metadataDefinitions: [ /* existing metadata definitions */ ],
  metadataValues: [ /* existing metadata values */ ],
  markerTypeDefinitions: [     // NEW: present only if there are custom types
    {
      id: 'uuid',
      name: 'Direction Arrow',
      shape: 'arrow',
      color: '#3b82f6',
      size: 'normal',
      label: 'Dir',
      behavior: 'point',
      supportsPhotos: true,
      scope: 'global',
      isBuiltIn: false,
      isPreset: false,
      createdDate: '2026-06-12T...',
      lastModified: '2026-06-12T...'
    }
  ]
}
```

**Version auto-detection in writer:**
```javascript
let version
if (customMarkerTypes.length > 0) {
  version = '1.3'
} else if (metadataDefinitions.length > 0 || metadataValues.length > 0) {
  version = '1.2'
} else {
  version = '1.1'
}
```

### Separate Marker Type Definitions Export

From Settings → Marker Types → "Export Types":

```javascript
{
  version: '1.3',
  type: 'snapspot-marker-type-definitions',
  sourceApp: 'SnapSpot',
  timestamp: '2026-06-11T...',
  definitions: [
    {
      id: 'uuid',
      name: 'Direction Arrow',
      shape: 'arrow',
      color: '#3b82f6',
      size: 'normal',
      label: 'Dir',
      behavior: 'point',
      supportsPhotos: true,
      scope: 'global',
      isBuiltIn: false,
      isPreset: false,
      createdDate: '2026-06-11T...',
      lastModified: '2026-06-11T...'
    }
  ]
}
```

This is the same pattern as `snapspot-metadata-definitions` exports.

---

## Tasks

### ☐ Task 5.1: Update Validator for v1.3

**Actions:**
1. Already partially done in Phase 1. Verify/complete:
   - `SUPPORTED_VERSIONS` includes `'1.3'`
   - `SCHEMA.markerTypeDefinition` defined with required fields: `id`, `name`, `shape`, `color`, `scope`, `createdDate`
   - `markerTypeDefinitions` handled in root validation
   - `validateMarkerTypeDefinition()` function validates all field constraints

2. Add validation for the separate `snapspot-marker-type-definitions` export type:
   - `type` must be `'snapspot-marker-type-definitions'`
   - `definitions` array required, non-empty
   - Each definition validated by `validateMarkerTypeDefinition()`

3. Add optional marker field validation:
   - `markerTypeId`: if present, must be non-empty string
   - `direction`: if present, must be number, 0 ≤ direction ≤ 360

**Files to modify:**
- `lib/snapspot-data/validator.js`

**Files to test:**
- Run existing validator tests to ensure no regressions

**Acceptance Criteria:**
- [ ] v1.3 exports with markerTypeDefinitions pass validation
- [ ] v1.3 exports without markerTypeDefinitions (only metadata) pass validation
- [ ] v1.1 and v1.2 exports still pass validation (backward compat)
- [ ] `snapspot-marker-type-definitions` exports pass validation
- [ ] Invalid shapes, colors, scopes produce descriptive errors

---

### ☐ Task 5.2: Update Writer for Marker Type Definitions

**Actions:**
1. In `lib/snapspot-data/writer.js`, update `buildExport()`:

2. Accept new parameter: `customMarkerTypes` (array of MarkerTypeDefinition objects).

3. In the export output, conditionally add `markerTypeDefinitions`:
```javascript
if (customMarkerTypes && customMarkerTypes.length > 0) {
  exportData.markerTypeDefinitions = customMarkerTypes.map(typeDef => ({
    id: typeDef.id,
    name: typeDef.name,
    shape: typeDef.shape,
    color: typeDef.color,
    size: typeDef.size || 'normal',
    label: typeDef.label || '',
    behavior: typeDef.behavior,
    supportsPhotos: typeDef.supportsPhotos,
    scope: typeDef.scope,
    isBuiltIn: typeDef.isBuiltIn || false,
    isPreset: typeDef.isPreset || false,
    createdDate: typeDef.createdDate,
    lastModified: typeDef.lastModified
  }))
}
```

4. For each marker, conditionally add `markerTypeId` and `direction`:
```javascript
markers: markers.map(marker => ({
  id: marker.id,
  x: marker.x,
  y: marker.y,
  description: marker.description,
  photoIds: marker.photoIds || [],
  createdDate: marker.createdDate,
  ...(marker.type ? { type: marker.type } : {}),
  ...(marker.lineGroupId ? { lineGroupId: marker.lineGroupId } : {}),
  ...(marker.lineColor ? { lineColor: marker.lineColor } : {}),
  ...(marker.lineCaption ? { lineCaption: marker.lineCaption } : {}),
  ...(marker.markerTypeId ? { markerTypeId: marker.markerTypeId } : {}),
  ...(marker.direction != null ? { direction: marker.direction } : {})
}))
```

5. Version detection: set to `'1.3'` if there are custom marker types, otherwise use existing logic.

6. Handle the separate definitions-only export (for Settings → Export Types):
   - Similar to `snapspot-metadata-definitions` pattern
   - Export only marker type definitions (no maps, markers, photos, metadata)

**Files to modify:**
- `lib/snapspot-data/writer.js`

**Acceptance Criteria:**
- [ ] Map export with custom types includes `markerTypeDefinitions` array
- [ ] Markers with custom type include `markerTypeId` and `direction` fields
- [ ] Markers without custom type (legacy) do NOT include `markerTypeId`
- [ ] Version set to '1.3' when custom types present
- [ ] Version set to '1.2' when only metadata present (no custom types)
- [ ] Version set to '1.1' when neither present
- [ ] Separate definitions export has correct format

---

### ☐ Task 5.3: Update Parser for Marker Type Definitions

**Actions:**
1. In `lib/snapspot-data/parser.js`, update `parseExport()`:

2. Extract `markerTypeDefinitions` from the export data:
```javascript
const markerTypeDefinitions = exportData.markerTypeDefinitions || []
```

3. Parse markers with new fields:
   - Pass through `markerTypeId` and `direction` as-is on markers
   - No remapping needed at parse stage (remapping happens during import)

4. Return `markerTypeDefinitions` in the parser output:
```javascript
return {
  map: { ... },
  mapImage: blob,
  markers: exportData.markers,
  photos: exportData.photos || [],
  metadataDefinitions: exportData.metadataDefinitions || [],
  metadataValues: exportData.metadataValues || [],
  markerTypeDefinitions: markerTypeDefinitions,  // NEW
  metadata: { version, type, sourceApp, exportDate },
  warnings: [...]
}
```

5. Add warnings:
   - If a marker references a `markerTypeId` that doesn't exist in `markerTypeDefinitions`, add a warning
   - If direction is out of range (shouldn't happen with valid exports, but be defensive)

**Files to modify:**
- `lib/snapspot-data/parser.js`

**Acceptance Criteria:**
- [ ] v1.3 exports with markerTypeDefinitions parse correctly
- [ ] v1.3 exports without markerTypeDefinitions parse correctly
- [ ] v1.1 and v1.2 exports still parse correctly
- [ ] Unknown markerTypeId generates a warning
- [ ] Parser output includes markerTypeDefinitions array

---

### ☐ Task 5.4: Update StorageExporterImporter

**Actions:**
1. In `lib/snapspot-storage/exporter-importer.js`, update methods:

2. **Export:** Pass marker type definitions to the writer:
   - Get all marker type definitions scoped to the current map (global + map-specific)
   - Pass them to `buildExport()` as `customMarkerTypes`

3. **Import:** Handle marker type definitions during import:
   - For each imported definition: check if a definition with same name+scope already exists
   - If exists: use the existing definition's ID (don't create duplicate)
   - If doesn't exist: create new definition in storage
   - Build a `typeIdMapping: Map<oldId, newId>` for remapping marker references
   - Remap `markerTypeId` on imported markers using the mapping
   - Skip built-in definitions on import (they already exist in every DB)

4. **Import decision modal:** Show marker type definition count:
   - "This export contains N marker type definitions"
   - If conflicts exist, show options (use existing / overwrite / skip)

5. **Separate definitions import:** Handle `snapspot-marker-type-definitions` type:
   - Import definitions into storage
   - Skip built-in definitions
   - Handle name conflicts (same as metadata definitions import)

**Files to modify:**
- `lib/snapspot-storage/exporter-importer.js`
- `js/app-settings.js` (export/import button handlers)
- `js/ui/modals.js` (import decision modal updates)

**Acceptance Criteria:**
- [ ] Export includes all relevant marker type definitions
- [ ] Import creates new definitions for ones that don't exist
- [ ] Import reuses existing definitions when name+scope match
- [ ] Marker references are correctly remapped to new/stored IDs
- [ ] Built-in definitions are never imported (skipped)
- [ ] Import decision modal shows marker type count
- [ ] Separate definitions-only import works from Settings

---

### ☐ Task 5.5: Update Merger for Marker Type Definitions

**Actions:**
1. In `lib/snapspot-data/merger.js`, add marker type definition merging:

2. **Deduplication strategy:**
   - Match by `name + scope` (same as metadata definition merging)
   - If a definition with the same name and scope exists in the target, keep the existing one
   - Map old IDs to new IDs for marker reference remapping

3. **Conflict resolution:**
   - If name+scope matches but shape differs: keep target's shape, warn user
   - If name+scope matches but color differs: keep target's color (don't overwrite)
   - Built-in definitions always kept from target

4. **Marker reference remapping:**
   - After merging definitions, walk through imported markers
   - Remap `markerTypeId` from old (import) ID to new (target) ID

5. **Integration:** The merger already handles metadata definitions merging — follow the same pattern for marker type definitions.

**Files to modify:**
- `lib/snapspot-data/merger.js`

**Acceptance Criteria:**
- [ ] Marker type definitions merged by name+scope
- [ ] Duplicate definitions map IDs correctly
- [ ] Marker references remapped to correct IDs
- [ ] Built-in definitions never overwritten
- [ ] Existing merge tests still pass
- [ ] Warnings generated for shape conflicts

---

## Manual Testing Checklist

### Test 1: Export with Custom Marker Types
- [ ] Create a custom marker type (e.g., "Direction Arrow")
- [ ] Place several markers using this type, set directions
- [ ] Export the map
- [ ] Inspect the JSON file:
  - [ ] Version is "1.3"
  - [ ] `markerTypeDefinitions` array contains the custom type
  - [ ] Markers have `markerTypeId` and `direction` fields
  - [ ] Legacy markers without custom type do NOT have `markerTypeId`

### Test 2: Export Without Custom Types
- [ ] Use a map with only legacy photo markers and line markers
- [ ] Export the map
- [ ] Verify version is "1.2" (or "1.1" if no metadata)
- [ ] Verify `markerTypeDefinitions` is NOT present
- [ ] Verify markers do NOT have `markerTypeId` or `direction`

### Test 3: Import Custom Marker Types
- [ ] Take a v1.3 export with custom types
- [ ] Import into a fresh SnapSpot instance
- [ ] Verify the custom type definition appears in Settings → Marker Types
- [ ] Verify markers render with correct shape, color, and direction
- [ ] Verify direction arrows point the right way

### Test 4: Import Duplicate Types (ID Remapping)
- [ ] Create "Direction Arrow" type in SnapSpot
- [ ] Import a v1.3 export that also has "Direction Arrow" (different ID)
- [ ] Verify only ONE "Direction Arrow" exists after import
- [ ] Verify imported markers reference the existing type
- [ ] Verify no duplicate type definitions

### Test 5: Backward Compatibility
- [ ] Import a v1.1 export (pre-metadata)
- [ ] Verify it imports correctly (no errors)
- [ ] Import a v1.2 export (with metadata, no marker types)
- [ ] Verify it imports correctly, metadata intact
- [ ] Verify both render markers as before

### Test 6: Separate Definitions Export
- [ ] Go to Settings → Marker Types → Export Types
- [ ] Verify downloaded JSON is `snapspot-marker-type-definitions` type
- [ ] Go to another map → Settings → Import Types
- [ ] Select the exported definitions file
- [ ] Verify types appear in the list

### Test 7: Merge with Marker Types
- [ ] Create Map A with custom type "Arrow" (blue)
- [ ] Create Map B with custom type "Arrow" (green) — same name, different color
- [ ] Export both, then merge
- [ ] Verify merge result has ONE "Arrow" type (keeps existing color)
- [ ] Verify markers from both maps reference the correct type

### Test 8: Built-in Skip on Import
- [ ] Export a map that has built-in "Photo Marker" referenced
- [ ] Verify built-in definitions are NOT included in the export
- [ ] (Or if included with isBuiltIn:true, verify they're skipped on import)

### Test 9: Safari iOS
- [ ] Export on desktop, import on Safari iOS
- [ ] Verify all types and markers render correctly
- [ ] Verify IndexedDB handles the additional store without issues
