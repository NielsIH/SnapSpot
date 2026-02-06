# Phase 4: Metadata Export/Import Functionality

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1, 2, and 3 complete

---

## Goals

Implement export and import functionality for metadata:
1. Update export writer to include metadata in map exports
2. Update export parser to handle metadata imports
3. Add options to export decision modal (include/exclude metadata)
4. Implement separate metadata definitions export
5. Handle import conflicts and merging
6. Update import decision modal for metadata scenarios

---

## Export Format Specification

### Full Map Export (v1.2) with Metadata

```javascript
{
  version: '1.2',
  type: 'snapspot-export',
  sourceApp: 'SnapSpot',
  timestamp: '2026-02-05T12:34:56.789Z',
  map: {
    id: 'uuid',
    name: 'Site Map',
    imageData: 'data:image/png;base64,...',
    width: 1920,
    height: 1080,
    imageHash: 'sha256...',
    rotation: 0,
    createdDate: '2026-02-05T...',
    lastModified: '2026-02-05T...'
  },
  markers: [
    {
      id: 'uuid',
      mapId: 'uuid',
      x: 100,
      y: 200,
      description: 'Inscription 1',
      photoIds: ['uuid'],
      createdDate: '2026-02-05T...',
      number: 1
    }
  ],
  photos: [
    {
      id: 'uuid',
      markerId: 'uuid',
      imageData: 'data:image/jpeg;base64,...',
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 123456,
      createdDate: '2026-02-05T...'
    }
  ],
  metadataDefinitions: [
    {
      id: 'uuid',
      name: 'Inscription Author',
      fieldType: 'text',
      scope: 'global',  // or mapId
      appliesTo: ['marker', 'photo'],
      required: false,
      options: [],
      description: 'Author of the inscription',
      order: 0,
      createdDate: '2026-02-05T...',
      lastModified: '2026-02-05T...'
    }
  ],
  metadataValues: [
    {
      id: 'uuid',
      definitionId: 'uuid',
      entityType: 'marker',
      entityId: 'uuid',
      value: 'John Doe',
      createdDate: '2026-02-05T...',
      lastModified: '2026-02-05T...'
    }
  ]
}
```

### Metadata Definitions Only Export

```javascript
{
  version: '1.2',
  type: 'snapspot-metadata-definitions',
  sourceApp: 'SnapSpot',
  timestamp: '2026-02-05T12:34:56.789Z',
  definitions: [
    {
      id: 'uuid',
      name: 'Inscription Author',
      fieldType: 'text',
      scope: 'global',
      appliesTo: ['marker', 'photo'],
      required: false,
      options: [],
      description: 'Author of the inscription',
      order: 0,
      createdDate: '2026-02-05T...',
      lastModified: '2026-02-05T...'
    }
  ]
}
```

---

## Tasks

### ☐ Task 4.1: Update Writer to Export Metadata

**Actions:**
1. Update `lib/snapspot-data/writer.js`:
   - Add `metadataDefinitions` parameter to `buildExport()`
   - Add `metadataValues` parameter to `buildExport()`
   - Include metadata arrays in export object (if provided)
   - Maintain backward compatibility (optional parameters)

2. Update function signature:
   ```javascript
   export async function buildExport (
     map,
     mapImage,
     markers,
     photos,
     options = {},
     metadataDefinitions = [],
     metadataValues = []
   )
   ```

3. Add to export object:
   ```javascript
   if (metadataDefinitions.length > 0) {
     exportObj.metadataDefinitions = metadataDefinitions
   }
   if (metadataValues.length > 0) {
     exportObj.metadataValues = metadataValues
   }
   ```

4. Filter metadata by scope:
   - Only include global definitions OR definitions with scope matching exported mapId
   - Only include values for entities in this export (map, markers, photos)

**Files to modify:**
- `lib/snapspot-data/writer.js`
- `lib/snapspot-data/README.md` (update API docs)

**Acceptance Criteria:**
- [ ] Writer accepts metadata parameters
- [ ] Metadata included in export when provided
- [ ] Backward compatible (works without metadata)
- [ ] Only relevant metadata included (scope filtering)
- [ ] JSDoc comments updated

---

### ☐ Task 4.2: Update Parser to Import Metadata

**Actions:**
1. Update `lib/snapspot-data/parser.js`:
   - Parse `metadataDefinitions` array if present
   - Parse `metadataValues` array if present
   - Return metadata in parsed export object
   - Handle missing metadata gracefully (v1.1 files)

2. Return structure:
   ```javascript
   return {
     type: data.type,
     version: data.version,
     sourceApp: data.sourceApp,
     timestamp: data.timestamp,
     map: { /* ... */ },
     markers: [ /* ... */ ],
     photos: [ /* ... */ ],
     metadataDefinitions: data.metadataDefinitions || [],
     metadataValues: data.metadataValues || []
   }
   ```

**Files to modify:**
- `lib/snapspot-data/parser.js`
- `lib/snapspot-data/README.md`

**Acceptance Criteria:**
- [ ] Parser extracts metadata if present
- [ ] Returns empty arrays if metadata missing (v1.1)
- [ ] No errors on files without metadata
- [ ] JSDoc updated

--- ### ☐ Task 4.3: Update Validator for Metadata

**Actions:**
*Note: This was partially done in Phase 1, Task 1.5. Complete it here.*

1. Ensure `lib/snapspot-data/validator.js` fully validates metadata:
   - Schema for metadataDefinition objects
   - Schema for metadataValue objects
   - Optional arrays (not required for v1.1 compatibility)

2. Add validation for metadata-specific rules:
   - fieldType must be valid
   - appliesTo must be non-empty array
   - For values: type must match definition fieldType
   - For select values: value must be in options

3. Validate referential integrity:
   - metadataValue.definitionId should reference a definition in the export
   - metadataValue.entityId should reference an entity (map/marker/photo) in export
   - *Note: This is a warning, not a hard error (allow partial imports)*

**Files to modify:**
- `lib/snapspot-data/validator.js`

**Acceptance Criteria:**
- [ ] Metadata schema validation complete
- [ ] Validates field types and constraints
- [ ] Warns on referential integrity issues
- [ ] Doesn't break on valid v1.1 or v1.2 files

---

### ☐ Task 4.4: Add Export Options to StorageExporterImporter

**Actions:**
1. Update `lib/snapspot-storage/exporter-importer.js`:
   - Add `includeMetadata` option (default: true)
   - Fetch metadata definitions when exporting
   - Fetch metadata values when exporting
   - Pass to writer if `includeMetadata === true`

2. Update `exportData()` method:
   ```javascript
   async exportData(map, markers, photos, imageProcessor, options = {}, mapStorage = null) {
     const {
       includePhotos = true,
       includeMetadata = true,  // NEW
       ...otherOptions
     } = options
     
     let metadataDefinitions = []
     let metadataValues = []
     
     if (includeMetadata && mapStorage) {
       // Fetch global definitions
       metadataDefinitions = await mapStorage.getMetadataDefinitionsByScope('global')
       
       // Fetch map-specific definitions
       const mapDefs = await mapStorage.getMetadataDefinitionsByScope(map.id)
       metadataDefinitions = [...metadataDefinitions, ...mapDefs]
       
       // Fetch all values for map, markers, photos
       const mapValues = await mapStorage.getMetadataValuesForEntity('map', map.id)
       const markerValues = ... // fetch for all markers
       const photoValues = ... // fetch for all photos
       metadataValues = [...mapValues, ...markerValues, ...photoValues]
     }
     
     return buildExport(
       map, mapBlob, markers, photos, otherOptions,
       metadataDefinitions,
       metadataValues
     )
   }
   ```

**Files to modify:**
- `lib/snapspot-storage/exporter-importer.js`
- `lib/snapspot-storage/README.md`

**Acceptance Criteria:**
- [ ] `includeMetadata` option works
- [ ] Fetches and includes metadata when true
- [ ] Excludes metadata when false
- [ ] No errors when mapStorage not provided

---

### ☐ Task 4.5: Update Export Decision Modal

**Actions:**
1. Update export decision modal (wherever it exists in UI):
   - Add checkbox: "☐ Include custom metadata fields"
   - Default: checked
   - Place near "Include photos" option

2. Pass `includeMetadata` option to export function:
   ```javascript
   const options = {
     includePhotos: includePhotosChecked,
     includeMetadata: includeMetadataChecked
   }
   ```

3. Update modal description:
   - Explain what metadata includes (definitions and values)
   - Note: excluding metadata means recipients can't see custom fields

**Files to modify:**
- `js/ui/modals.js` or wherever export decision modal is implemented
- `css/modals/export-decision.css`

**Acceptance Criteria:**
- [ ] Checkbox appears in export modal
- [ ] Option passes through to export function
- [ ] Works correctly (verified in testing)
- [ ] UI is clear about what's included/excluded

---

### ☐ Task 4.6: Implement Metadata Definitions Export

**Actions:**
1. Add new export option in Settings → Metadata tab:
   - Button: "Export Field Definitions"
   - Exports only global metadata definitions (not values)
   - Format: `snapspot-metadata-definitions` type
   - Filename: `snapspot-metadata-definitions-YYYY-MM-DD.json`

2. Create export function:
   ```javascript
   async exportMetadataDefinitions() {
     const definitions = await app.storage.getAllMetadataDefinitions()
     const globalDefs = definitions.filter(d => d.scope === 'global')
     
     const exportObj = {
       version: '1.2',
       type: 'snapspot-metadata-definitions',
       sourceApp: 'SnapSpot',
       timestamp: new Date().toISOString(),
       definitions: globalDefs
     }
     
     const json = JSON.stringify(exportObj, null, 2)
     downloadFile(`snapspot-metadata-definitions-${dateStamp}.json`, json)
   }
   ```

3. Option to export map-specific definitions:
   - Separate button or dropdown
   - "Export Definitions for Current Map"
   - Includes both global and map-specific

**Files to modify:**
- `js/ui/settings-modal.js` (Phase 2 added buttons, now implement)

**Acceptance Criteria:**
- [ ] Export definitions button works
- [ ] File downloads with correct format
- [ ] Global definitions included
- [ ] Map-specific export option works (if implemented)

---

### ☐ Task 4.7: Implement Metadata Import with Conflict Resolution

**Actions:**
1. Update import flow in `lib/snapspot-storage/exporter-importer.js`:
   - After parsing, check for metadata
   - Store metadata definitions and values separately
   - Return metadata to UI layer for conflict handling

2. Create import conflict detection:
   - Check for existing definitions with same name
   - Strategies:
     - **Skip**: Don't import duplicate definitions
     - **Overwrite**: Replace existing with imported
     - **Rename**: Import as "Field Name (2)"
     - **Keep Both**: Import with new ID (if different content)

3. Update `importData()` method:
   ```javascript
   async importData(exportData, mapStorage, options = {}) {
     const {
       metadataConflictStrategy = 'skip',  // 'skip' | 'overwrite' | 'rename'
       ...otherOptions
     } = options
     
     // ... existing import logic for map/markers/photos
     
     // Import metadata definitions
     if (exportData.metadataDefinitions) {
       for (const def of exportData.metadataDefinitions) {
         await this.importMetadataDefinition(def, mapStorage, metadataConflictStrategy)
       }
     }
     
     // Import metadata values
     if (exportData.metadataValues) {
       await this.importMetadataValues(exportData.metadataValues, mapStorage, entityIdMap)
     }
   }
   ```

4. Handle scope conversion:
   - If importing map-specific definition, convert scope to new mapId
   - If importing global definition that conflicts, handle per strategy

**Files to modify:**
- `lib/snapspot-storage/exporter-importer.js`

**Acceptance Criteria:**
- [ ] Import detects metadata in export
- [ ] Conflict detection works
- [ ] All strategies implemented
- [ ] Scope conversion works for map-specific definitions
- [ ] Values link to correct definitions after import

---

### ☐ Task 4.8: Update Import Decision Modal for Metadata

**Actions:**
1. Enhance import decision modal to show metadata info:
   - Display count of metadata definitions in import
   - Display count of metadata values
   - Show preview of definitions (names, types)

2. Add conflict resolution UI:
   - If conflicts detected, show list
   - Provide options per definition:
     ```
     Conflict: "Inscription Author" already exists
     ○ Skip this field
     ○ Overwrite existing
     ○ Import as "Inscription Author (2)"
     ```
   - Or global option: "Apply to all conflicts: [Skip ▼]"

3. Update modal flow:
   - Parse import file
   - Detect conflicts
   - Show decision modal with metadata section
   - User chooses strategy
   - Import proceeds with choices

**Files to modify:**
- `js/ui/modals.js` (import decision modal)
- `css/modals/import-decision.css`

**Acceptance Criteria:**
- [ ] Modal shows metadata import info
- [ ] Conflicts are displayed clearly
- [ ] User can choose strategy
- [ ] Import respects user choices
- [ ] UI is not overwhelming (clear and simple)

---

### ☐ Task 4.9: Implement Metadata Definitions Import

**Actions:**
1. Update Settings → Metadata import (from Phase 2):
   - Import definitions from `.json` file
   - Type: `snapspot-metadata-definitions`
   - Validate file format
   - Show preview before import
   - Resolve conflicts (same as Task 4.8)
   - Import definitions to storage

2. Handle edge cases:
   - Invalid file format → clear error
   - Empty definitions array → warning
   - Definitions with invalid field types → skip with warning

**Files to modify:**
- `js/ui/settings-modal.js` (Phase 2 added button, now implement)

**Acceptance Criteria:**
- [ ] Import parses definition files
- [ ] Validates file structure
- [ ] Shows preview
- [ ] Resolves conflicts
- [ ] Imports successfully
- [ ] Error handling in place

---

### ☐ Task 4.10: Update Merger for Metadata

**Actions:**
1. Update `lib/snapspot-data/merger.js`:
   - Merge metadata definitions from two exports
   - Merge metadata values from two exports
   - Handle definition conflicts (match by name or ID)
   - Link values to correct definitions in merged export

2. Add merge options:
   ```javascript
   {
     mergeMetadataDefinitions: true,
     metadataConflictStrategy: 'keep-both' // 'skip' | 'overwrite' | 'keep-both'
   }
   ```

3. Merge logic:
   - Definitions with same ID → keep target, skip source (or strategy)
   - Definitions with same name but different ID → warning, keep-both
   - Values reference definition IDs → update if definitions merged

**Files to modify:**
- `lib/snapspot-data/merger.js`
- `lib/snapspot-data/README.md`

**Acceptance Criteria:**
- [ ] Merger handles metadata
- [ ] Definitions merge correctly
- [ ] Values link to right definitions
- [ ] Conflict strategies work
- [ ] JSDoc updated

---

## Manual Testing

**After completing all tasks, perform these tests:**

### Test 4.1: Export Map with Metadata (Included)
1. Create map with markers and metadata
2. Export map with "Include metadata" checked
3. Open exported JSON file
4. Verify:
   - [ ] `metadataDefinitions` array present
   - [ ] `metadataValues` array present
   - [ ] Definitions include all relevant (global + map-specific)
   - [ ] Values include map, marker, and photo metadata
   - [ ] Version is '1.2'

### Test 4.2: Export Map without Metadata (Excluded)
1. Export same map with "Include metadata" unchecked
2. Open JSON
3. Verify:
   - [ ] `metadataDefinitions` array absent
   - [ ] `metadataValues` array absent
   - [ ] Map, markers, photos still present
   - [ ] Version is '1.2' or '1.1' (check validator)

### Test 4.3: Import Map with Metadata (No Conflicts)
1. Export map with metadata
2. Clear storage or use different browser
3. Import the file
4. Verify:
   - [ ] Map imports successfully
   - [ ] Metadata definitions imported
   - [ ] Metadata values imported
   - [ ] Values display on map/markers/photos
   - [ ] No console errors

### Test 4.4: Import Map with Metadata Conflicts (Skip)
1. Create definition "Test Field"
2. Export map with same definition name
3. Import with conflict strategy "Skip"
4. Verify:
   - [ ] Conflict detected
   - [ ] Option to skip shown
   - [ ] Existing definition unchanged
   - [ ] Imported values either skipped or linked to existing definition

### Test 4.5: Import with Conflicts (Overwrite)
1. Same setup as Test 4.4
2. Choose "Overwrite" strategy
3. Verify:
   - [ ] Existing definition replaced
   - [ ] Imported definition in storage
   - [ ] Values import correctly

### Test 4.6: Import with Conflicts (Rename)
1. Same setup
2. Choose "Rename" strategy
3. Verify:
   - [ ] Imported definition renamed (e.g., "Test Field (2)")
   - [ ] Both definitions exist
   - [ ] Values linked to correct definition

### Test 4.7: Export Metadata Definitions Only
1. In Settings → Metadata, click "Export Definitions"
2. Verify:
   - [ ] File downloads
   - [ ] Type is 'snapspot-metadata-definitions'
   - [ ] Only global definitions included
   - [ ] No values included
   - [ ] No map data

### Test 4.8: Import Metadata Definitions Only
1. Export definitions
2. Clear or use different browser
3. In Settings → Metadata, import definitions file
4. Verify:
   - [ ] Definitions import
   - [ ] No map/marker/photo data imported
   - [ ] Definitions appear in Settings list

### Test 4.9: Import v1.1 File (Backward Compatibility)
1. Use an old v1.1 export (without metadata)
2. Import it
3. Verify:
   - [ ] Import succeeds
   - [ ] No metadata errors
   - [ ] Map and markers import correctly

### Test 4.10: Import Map-Specific Metadata to Different Map
1. Export map with map-specific metadata
2. Import to different SnapSpot instance
3. Verify:
   - [ ] Import succeeds
   - [ ] Map-specific definitions converted to new mapId
   - [ ] Values linked correctly
   - [ ] Metadata displays on new map

### Test 4.11: Merge Two Exports with Metadata
1. Create two exports with different metadata definitions
2. Import both (merge scenario)
3. Verify:
   - [ ] Definitions from both imports present
   - [ ] Values linked correctly
   - [ ] No lost data

### Test 4.12: Merge with Conflicting Definitions
1. Create two exports with same definition name
2. Merge
3. Verify:
   - [ ] Conflict detected
   - [ ] Strategy applied (keep-both, overwrite, etc.)
   - [ ] Merged export is valid

### Test 4.13: Export with Many Metadata Fields (Performance)
1. Create 20+ metadata definitions
2. Add values to 50+ markers
3. Export
4. Verify:
   - [ ] Export completes in reasonable time
   - [ ] File size is acceptable
   - [ ] No browser crash/freeze

### Test 4.14: Import with Invalid Metadata
1. Manually edit export JSON to include invalid metadata
   - Invalid fieldType
   - Missing required fields
   - Type mismatch in values
2. Import
3. Verify:
   - [ ] Validation catches errors
   - [ ] Clear error message shown
   - [ ] Import fails gracefully (or skips invalid items)

### Test 4.15: Round-Trip Test
1. Create complete map with all features and metadata
2. Export with metadata
3. Clear storage
4. Import
5. Verify:
   - [ ] Exact replica of original
   - [ ] No data loss
   - [ ] All metadata intact
   - [ ] No console errors

---

## Acceptance Criteria (Phase Complete)

- [ ] All tasks marked complete
- [ ] All 15 manual tests passed
- [ ] Zero linting errors (`npm run lint`)
- [ ] Export includes/excludes metadata based on option
- [ ] Import handles metadata correctly
- [ ] Conflict resolution works
- [ ] Definitions export/import works standalone
- [ ] Backward compatible with v1.1
- [ ] Merger handles metadata
- [ ] Documentation updated

---

## Commit Message

```
feat: add metadata export/import functionality

- Update writer.js and parser.js for metadata support
- Add includeMetadata option to export decision modal
- Implement conflict resolution for metadata imports
- Add standalone metadata definitions export/import
- Update merger.js to handle metadata
- Export format version 1.2 with backward compatibility

Phase 4 of 6 for metadata system implementation.
```

---

## Notes

- Ensure all export/import operations maintain referential integrity
- Test with large datasets (100+ markers with metadata)
- Consider file size impact of metadata (should be minimal)
- Ensure Safari compatibility (no Blob storage for metadata)
- Add helpful error messages for users

---

**Next Phase:** [METADATA_PHASE_5_QUERY.md](METADATA_PHASE_5_QUERY.md) - Search and query metadata
