# Phase 1: Metadata Schema and Storage Layer

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD

---

## Goals

Design and implement the storage layer for the metadata system:
1. Define data models for metadata definitions and values
2. Update IndexedDB schema with new object stores
3. Implement MapStorage methods for metadata CRUD operations
4. Update export/import validator for metadata support
5. Ensure Safari compatibility (Base64 where needed)

---

## Data Model Specification

### MetadataDefinition Object

**Purpose:** Describes a custom metadata field that can be added to maps, markers, or photos.

```javascript
{
  id: 'uuid',                       // crypto.randomUUID()
  name: 'Inscription Author',       // User-facing field name (required)
  fieldType: 'text',                // Field type (required)
  scope: 'global',                  // 'global' or mapId string (required)
  appliesTo: ['marker', 'photo'],   // Array of 'map' | 'marker' | 'photo' (required)
  required: false,                  // Is this field required? (default: false)
  options: [],                      // For 'select' type: array of option strings
  defaultValue: null,               // Default value for new entities
  description: '',                  // Help text shown to user
  order: 0,                         // Display order (for sorting fields)
  createdDate: '2026-02-05T...',    // ISO timestamp
  lastModified: '2026-02-05T...'    // ISO timestamp
}
```

**Field Types:**
- `'text'` - Single-line text input (string value)
- `'number'` - Numeric input (number value)
- `'date'` - Date picker (ISO date string value)
- `'boolean'` - Checkbox (boolean value)
- `'select'` - Dropdown (string value, must be in `options` array)

**Validation Rules:**
- `name`: Required, non-empty string, max 100 characters
- `fieldType`: Required, must be one of: text, number, date, boolean, select
- `scope`: Required, either 'global' or valid mapId
- `appliesTo`: Required, non-empty array with at least one of: map, marker, photo
- `options`: Required if fieldType is 'select', otherwise optional
- `description`: Optional, max 500 characters

### MetadataValue Object

**Purpose:** Stores the actual metadata value for a specific entity (map, marker, or photo).

```javascript
{
  id: 'uuid',                    // crypto.randomUUID()
  definitionId: 'uuid',          // Foreign key to MetadataDefinition.id (required)
  entityType: 'marker',          // 'map' | 'marker' | 'photo' (required)
  entityId: 'uuid',              // ID of the map/marker/photo (required)
  value: 'John Doe',             // Actual metadata value (type varies by fieldType)
  createdDate: '2026-02-05T...',
  lastModified: '2026-02-05T...'
}
```

**Value Types by Field Type:**
- `text`: string
- `number`: number
- `date`: string (ISO 8601 date: 'YYYY-MM-DD')
- `boolean`: boolean (true/false)
- `select`: string (must match one of the definition's options)

**Validation Rules:**
- `definitionId`: Required, must reference existing MetadataDefinition
- `entityType`: Required, must be one of: map, marker, photo
- `entityId`: Required, must reference existing entity of entityType
- `value`: Required (except for non-required fields), type must match definition's fieldType

---

## Tasks

### ☐ Task 1.1: Design IndexedDB Schema Changes

**Actions:**
1. Plan new object stores:
   - `metadataDefinitions` - Store MetadataDefinition objects
   - `metadataValues` - Store MetadataValue objects

2. Define indexes for efficient queries:
   - `metadataDefinitions`:
     - Primary key: `id`
     - Index: `scope` (for filtering global vs map-specific)
     - Index: `appliesTo` (multi-entry index for entity types)
     - Index: `name` (for searching by field name)
   
   - `metadataValues`:
     - Primary key: `id`
     - Index: `definitionId` (find all values for a definition)
     - Index: `entityType` (find all values for a type)
     - Index: `entityId` (find all values for an entity)
     - Compound index: `[entityType, entityId]` (find all metadata for specific entity)

3. Plan database version increment: `version = 5` (current is 4)

**Files to modify:**
- `js/storage.js` - MapStorage class

**Acceptance Criteria:**
- [ ] Schema design documented in code comments
- [ ] Database version incremented
- [ ] New object stores created in `onupgradeneeded`
- [ ] All indexes created correctly

---

### ☐ Task 1.2: Implement MetadataDefinition CRUD Methods

**Actions:**
1. Add methods to MapStorage for metadata definitions:
   - `addMetadataDefinition(definition)` - Create new definition
   - `getMetadataDefinition(id)` - Get by ID
   - `getAllMetadataDefinitions()` - Get all definitions
   - `getMetadataDefinitionsByScope(scope)` - Get global or map-specific
   - `getMetadataDefinitionsForEntity(entityType, scope)` - Get applicable definitions
   - `updateMetadataDefinition(definition)` - Update existing
   - `deleteMetadataDefinition(id)` - Delete and cascade delete values

2. Implement validation in each method:
   - Check required fields
   - Validate field types
   - Validate appliesTo array
   - Validate options for select type

3. Handle scope filtering:
   - Global definitions: `scope === 'global'`
   - Map-specific: `scope === mapId`
   - When getting for an entity, return both global and map-specific

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] All CRUD methods implemented
- [ ] Input validation in place
- [ ] Proper error handling with descriptive messages
- [ ] Async/await pattern consistent with existing MapStorage methods
- [ ] Console logging for debugging (follow existing patterns)

---

### ☐ Task 1.3: Implement MetadataValue CRUD Methods

**Actions:**
1. Add methods to MapStorage for metadata values:
   - `addMetadataValue(value)` - Create new value
   - `getMetadataValue(id)` - Get by ID
   - `getMetadataValuesForEntity(entityType, entityId)` - Get all metadata for an entity
   - `getMetadataValuesByDefinition(definitionId)` - Get all values for a definition
   - `updateMetadataValue(value)` - Update existing value
   - `deleteMetadataValue(id)` - Delete single value
   - `deleteMetadataValuesForEntity(entityType, entityId)` - Delete all for an entity
   - `deleteMetadataValuesByDefinition(definitionId)` - Delete all for a definition

2. Implement validation:
   - Check definitionId exists (query metadataDefinitions)
   - Validate entityType and entityId
   - Validate value type matches definition's fieldType
   - For select type, validate value is in options array
   - Check required fields

3. Create helper method:
   - `validateMetadataValue(value, definition)` - Returns validation result

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] All CRUD methods implemented
- [ ] Value type validation based on definition
- [ ] Foreign key validation (definitionId, entityId)
- [ ] Cascade delete support (when entity or definition deleted)
- [ ] Error handling with descriptive messages

---

### ☐ Task 1.4: Add Cascade Delete Support

**Actions:**
1. Update existing delete methods to also delete metadata:
   - `deleteMap(mapId)` - Also delete:
     - All map-specific metadata definitions (scope === mapId)
     - All metadata values for this map (entityType=map, entityId=mapId)
     - All metadata values for markers/photos of this map
   
   - `deleteMarker(markerId)` - Also delete:
     - All metadata values for this marker
   
   - `deletePhoto(photoId)` - Also delete:
     - All metadata values for this photo

2. Ensure transactional integrity where possible

3. Log cascade deletions for debugging

**Files to modify:**
- `js/storage.js` - Update `deleteMap()`, `deleteMarker()`, `deletePhoto()`

**Acceptance Criteria:**
- [ ] Deleting a map removes all related metadata
- [ ] Deleting a marker/photo removes their metadata values
- [ ] No orphaned metadata values remain
- [ ] Console logs cascade operations

---

### ☐ Task 1.5: Update Export Validator Schema

**Actions:**
1. Update `lib/snapspot-data/validator.js`:
   - Add export version `'1.2'` to `SUPPORTED_VERSIONS` array
   - Update `SCHEMA` object with metadata fields:
     ```javascript
     SCHEMA = {
       root: [...existing, 'metadataDefinitions', 'metadataValues'],
       metadataDefinition: ['id', 'name', 'fieldType', 'scope', 'appliesTo', 'createdDate'],
       metadataValue: ['id', 'definitionId', 'entityType', 'entityId', 'value', 'createdDate']
     }
     ```
   
   - Add validation functions:
     - `validateMetadataDefinition(definition, index)`
     - `validateMetadataValue(value, index)`
   
   - Update `validateExportFile()` to validate metadata arrays (optional fields)

2. Ensure backward compatibility:
   - Version 1.1 exports (without metadata) still validate
   - Version 1.2 exports validate metadata if present

**Files to modify:**
- `lib/snapspot-data/validator.js`

**Acceptance Criteria:**
- [ ] Version 1.2 added to supported versions
- [ ] Schema includes metadata objects
- [ ] Validation functions for metadata
- [ ] Backward compatibility maintained
- [ ] Both with and without metadata validate correctly

---

### ☐ Task 1.6: Update Storage Initialization

**Actions:**
1. Ensure `MapStorage.init()` handles the database upgrade smoothly
2. Add migration logic if needed (currently none required)
3. Test upgrade path from version 4 → 5

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] Database upgrades successfully
- [ ] Existing data preserved
- [ ] New object stores created
- [ ] No errors in console

---

## Manual Testing

**After completing all tasks, perform these tests:**

### Test 1.1: Database Schema Creation
1. Clear browser storage (Application → Storage → Clear site data)
2. Open SnapSpot
3. Open DevTools → Application → IndexedDB → SnapSpotDB
4. Verify:
   - [ ] Database version is 5
   - [ ] `metadataDefinitions` store exists
   - [ ] `metadataValues` store exists
   - [ ] Indexes are created on both stores

### Test 1.2: Create Metadata Definition
1. Open browser console
2. Run:
   ```javascript
   const def = {
     id: crypto.randomUUID(),
     name: 'Test Field',
     fieldType: 'text',
     scope: 'global',
     appliesTo: ['marker'],
     required: false,
     description: 'Test description',
     createdDate: new Date().toISOString(),
     lastModified: new Date().toISOString()
   }
   await app.storage.addMetadataDefinition(def)
   ```
3. Verify:
   - [ ] No errors in console
   - [ ] Definition appears in IndexedDB

### Test 1.3: Retrieve Metadata Definition
1. In console:
   ```javascript
   const all = await app.storage.getAllMetadataDefinitions()
   console.log(all)
   
   const global = await app.storage.getMetadataDefinitionsByScope('global')
   console.log(global)
   ```
2. Verify:
   - [ ] Returns the created definition
   - [ ] Global scope filter works

### Test 1.4: Create Metadata Value
1. Create a test marker first (or use existing)
2. In console:
   ```javascript
   const value = {
     id: crypto.randomUUID(),
     definitionId: 'DEFINITION_ID_FROM_ABOVE',
     entityType: 'marker',
     entityId: 'EXISTING_MARKER_ID',
     value: 'Test Value',
     createdDate: new Date().toISOString(),
     lastModified: new Date().toISOString()
   }
   await app.storage.addMetadataValue(value)
   ```
3. Verify:
   - [ ] No errors
   - [ ] Value appears in IndexedDB

### Test 1.5: Retrieve Metadata Values
1. In console:
   ```javascript
   const values = await app.storage.getMetadataValuesForEntity('marker', 'MARKER_ID')
   console.log(values)
   ```
2. Verify:
   - [ ] Returns the created value

### Test 1.6: Update Operations
1. Update definition:
   ```javascript
   def.name = 'Updated Name'
   def.lastModified = new Date().toISOString()
   await app.storage.updateMetadataDefinition(def)
   ```
2. Update value:
   ```javascript
   value.value = 'Updated Value'
   value.lastModified = new Date().toISOString()
   await app.storage.updateMetadataValue(value)
   ```
3. Verify:
   - [ ] Changes reflected in IndexedDB
   - [ ] lastModified timestamp updated

### Test 1.7: Cascade Delete - Marker
1. Create a marker with metadata values
2. Delete the marker via UI or console:
   ```javascript
   await app.storage.deleteMarker('MARKER_ID')
   ```
3. Verify:
   - [ ] Marker deleted
   - [ ] Metadata values for marker also deleted (check IndexedDB)

### Test 1.8: Cascade Delete - Map
1. Create a map-specific metadata definition
2. Create metadata values for the map
3. Delete the map:
   ```javascript
   await app.storage.deleteMap('MAP_ID')
   ```
4. Verify:
   - [ ] Map deleted
   - [ ] Map-specific definitions deleted
   - [ ] All metadata values for map/markers/photos deleted

### Test 1.9: Validation - Invalid FieldType
1. Try to create definition with invalid fieldType:
   ```javascript
   const invalid = {
     id: crypto.randomUUID(),
     name: 'Invalid',
     fieldType: 'invalid-type',  // Invalid
     scope: 'global',
     appliesTo: ['marker'],
     createdDate: new Date().toISOString(),
     lastModified: new Date().toISOString()
   }
   await app.storage.addMetadataDefinition(invalid)
   ```
2. Verify:
   - [ ] Error thrown with descriptive message
   - [ ] Definition NOT added to database

### Test 1.10: Validation - Type Mismatch
1. Create a number field definition
2. Try to add a text value:
   ```javascript
   const numberDef = {
     id: crypto.randomUUID(),
     name: 'Age',
     fieldType: 'number',
     scope: 'global',
     appliesTo: ['marker'],
     createdDate: new Date().toISOString(),
     lastModified: new Date().toISOString()
   }
   await app.storage.addMetadataDefinition(numberDef)
   
   const invalidValue = {
     id: crypto.randomUUID(),
     definitionId: numberDef.id,
     entityType: 'marker',
     entityId: 'MARKER_ID',
     value: 'not a number',  // Invalid
     createdDate: new Date().toISOString(),
     lastModified: new Date().toISOString()
   }
   await app.storage.addMetadataValue(invalidValue)
   ```
3. Verify:
   - [ ] Error thrown indicating type mismatch
   - [ ] Value NOT added to database

---

## Acceptance Criteria (Phase Complete)

- [ ] All tasks marked complete
- [ ] All manual tests passed
- [ ] Zero linting errors (`npm run lint`)
- [ ] Console logging follows existing patterns
- [ ] Code documented with JSDoc comments
- [ ] Database schema version incremented to 5
- [ ] Backward compatible with existing data

---

## Commit Message

```
feat: add metadata storage schema and MapStorage methods

- Add metadataDefinitions and metadataValues IndexedDB stores
- Implement CRUD methods for metadata definitions and values
- Add cascade delete support for metadata
- Update validator.js schema for export version 1.2
- Add comprehensive validation for metadata types and values
- Database version incremented to 5

Phase 1 of 6 for metadata system implementation.
```

---

## Notes

- Keep all validation logic in MapStorage (not in UI)
- Follow existing error handling patterns in storage.js
- Use console.log for debugging (consistent with existing code)
- Ensure all async operations use try/catch
- Test Safari compatibility if using any new APIs

---

**Next Phase:** [METADATA_PHASE_2_UI.md](METADATA_PHASE_2_UI.md) - Build UI for defining metadata fields
