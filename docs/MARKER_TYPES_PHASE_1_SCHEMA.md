# Phase 1: Custom Marker Types — Schema and Storage Layer

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD

---

## Goals

Design and implement the storage layer for custom marker types:
1. Define the `MarkerTypeDefinition` data model
2. Update IndexedDB schema with new `markerTypeDefinitions` object store
3. Implement MapStorage CRUD methods for marker type definitions
4. Auto-create built-in "Photo Marker" and "Line Marker" definitions
5. Extend the marker schema with `markerTypeId` and `direction` fields
6. Update `validator.js` SCHEMA for v1.3 export format

---

## Data Model Specification

### MarkerTypeDefinition Object

**Purpose:** Describes a marker type that controls how a marker looks and behaves on the map.

```javascript
{
  id: 'uuid',                       // crypto.randomUUID()
  name: 'Direction Arrow',          // User-facing type name (required)
  shape: 'arrow',                   // 'circle' | 'square' | 'diamond' | 'arrow' (required)
  color: '#3b82f6',                 // Hex color string (required, default '#e53e3e')
  size: 'normal',                   // 'small' | 'normal' | 'large' (default: 'normal')
  label: 'Dir',                     // Short label displayed on map (optional, max 4 chars)
  hasDirection: true,               // Whether this type supports rotation (auto-true for arrow)
  scope: 'global',                  // 'global' or mapId string (required)
  isBuiltIn: false,                 // True for built-in defaults (Photo Marker, Line Marker)
  createdDate: '2026-06-11T...',    // ISO timestamp
  lastModified: '2026-06-11T...'    // ISO timestamp
}
```

**Shape Types:**
- `'circle'` — Rounded marker (rendered via ctx.arc())
- `'square'` — Rectangular marker (rendered via ctx.fillRect())
- `'diamond'` — 45° rotated square (rendered via ctx.rotate + fillRect)
- `'arrow'` — Directional arrow with rotation (rendered as triangle + stem)

**Size Mapping:**
- `'small'` → radius: 8, fontSizeFactor: 0.85
- `'normal'` → radius: 12, fontSizeFactor: 1.0
- `'large'` → radius: 18, fontSizeFactor: 1.2

**Validation Rules:**
- `name`: Required, non-empty string, max 100 characters
- `shape`: Required, must be one of: circle, square, diamond, arrow
- `color`: Required, must be valid hex color (#RRGGBB or #RGB)
- `size`: Optional, defaults to 'normal', must be: small, normal, large
- `label`: Optional, max 4 characters (displayed on map next to marker)
- `hasDirection`: Boolean, auto-set to true for arrow shape, false for others. User cannot change — it's derived from shape.
- `scope`: Required, either 'global' or valid mapId
- `isBuiltIn`: Boolean, defaults to false. Only true for auto-created defaults.

### Marker Schema Extensions

**Existing marker fields remain unchanged. Two new optional fields are added:**

```javascript
{
  // ... all existing marker fields ...
  markerTypeId: 'uuid' | null,      // FK → MarkerTypeDefinition.id
  direction: 45 | null              // Degrees 0-360, only meaningful when type has hasDirection
}
```

**Interpretation:**
- `markerTypeId === null` → marker uses implicit built-in type based on `marker.type`:
  - `type === 'line'` → "Line Marker" built-in (diamond)
  - otherwise → "Photo Marker" built-in (circle)
- `markerTypeId` set → marker uses the specified type definition for rendering
- `direction` is only meaningful for arrow types; ignored for other shapes

---

## Tasks

### ☐ Task 1.1: Design IndexedDB Schema Changes

**Actions:**
1. Plan new object store: `markerTypeDefinitions`
2. Define indexes for efficient queries:
   - Primary key: `id`
   - Index: `scope` (for filtering global vs map-specific)
   - Index: `name` (for searching by type name)
   - Index: `isBuiltIn` (for filtering built-in types)
3. Plan database version increment from current version to `version = 6`
4. Note: No schema changes needed for existing `markers` store — `markerTypeId` and `direction` are just new properties on existing objects (IndexedDB is schema-flexible for object properties)

**Files to modify:**
- `js/storage.js` — `onupgradeneeded` handler

**Acceptance Criteria:**
- [ ] Database version incremented
- [ ] New `markerTypeDefinitions` object store created in `onupgradeneeded`
- [ ] All indexes created correctly
- [ ] Existing stores (maps, markers, photos, metadataDefinitions, metadataValues) unaffected
- [ ] Database opens without error on upgrade

---

### ☐ Task 1.2: Implement MarkerTypeDefinition CRUD Methods

**Actions:**
1. Add methods to MapStorage class in `js/storage.js`:
   - `addMarkerTypeDefinition(definition)` — Create new type definition
   - `getMarkerTypeDefinition(id)` — Get by ID
   - `getAllMarkerTypeDefinitions()` — Get all definitions
   - `getMarkerTypeDefinitionsByScope(scope)` — Get global or map-specific
   - `getMarkerTypeDefinitionsForMap(mapId)` — Get global + map-specific (used for marker placement picker)
   - `updateMarkerTypeDefinition(definition)` — Update existing
   - `deleteMarkerTypeDefinition(id)` — Delete (with reference check)

2. Implement validation in each method:
   - Check required fields: name, shape, color, scope
   - Validate shape enum values
   - Validate color hex format
   - Auto-set hasDirection based on shape
   - Validate label max length (4 chars)

3. Follow the same async/await + transaction pattern used by existing metadata definition methods.

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] All CRUD methods implemented with proper IndexedDB transactions
- [ ] Input validation with descriptive error messages
- [ ] `hasDirection` auto-derived from shape (arrow=true, others=false)
- [ ] Async/await pattern consistent with existing storage methods
- [ ] Console logging for debugging (follow existing patterns)

---

### ☐ Task 1.3: Auto-Create Built-in Definitions

**Actions:**
1. In `onupgradeneeded`, after creating the `markerTypeDefinitions` store, insert two built-in definitions:

```javascript
{
  id: 'builtin-photo-marker',
  name: 'Photo Marker',
  shape: 'circle',
  color: '#ef4444',       // Red-500 (matches current editable+photos color)
  size: 'normal',
  label: '',
  hasDirection: false,
  scope: 'global',
  isBuiltIn: true,
  createdDate: new Date().toISOString(),
  lastModified: new Date().toISOString()
}

{
  id: 'builtin-line-marker',
  name: 'Line Marker',
  shape: 'diamond',
  color: '#e53e3e',       // Red-600 (matches current line marker default)
  size: 'normal',
  label: '',
  hasDirection: false,
  scope: 'global',
  isBuiltIn: true,
  createdDate: new Date().toISOString(),
  lastModified: new Date().toISOString()
}
```

2. Use fixed IDs (`builtin-photo-marker`, `builtin-line-marker`) so the code can reference them without lookups.

3. Only create if they don't already exist (idempotent migration — check store count first, or use `put` which overwrites).

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] Built-in definitions created on first upgrade
- [ ] Idempotent: re-running upgrade doesn't duplicate or error
- [ ] Both definitions have `isBuiltIn: true`
- [ ] Fixed IDs for code references
- [ ] Existing markers without `markerTypeId` still render correctly

---

### ☐ Task 1.4: Update Validator for v1.3 Export Format

**Actions:**
1. Add `'1.3'` to `SUPPORTED_VERSIONS` array in `lib/snapspot-data/validator.js`

2. Add `markerTypeDefinition` to SCHEMA:
```javascript
markerTypeDefinition: ['id', 'name', 'shape', 'color', 'scope', 'createdDate']
```

3. Add `markerTypeDefinitions` as an optional array in root validation (like metadataDefinitions).

4. Add validation for MarkerTypeDefinition objects:
   - `validateMarkerTypeDefinition(definition, index)` function
   - Validate shape is one of: circle, square, diamond, arrow
   - Validate color is a valid hex string
   - Validate scope is 'global' or a non-empty string (mapId)
   - Validate size (if present) is: small, normal, large
   - Validate hasDirection (if present) is boolean
   - Validate isBuiltIn (if present) is boolean
   - Validate label (if present) is string, max 4 chars

5. Add optional marker fields validation:
   - `markerTypeId`: if present, must be string
   - `direction`: if present, must be number (0-360)

6. Version auto-detection in writer: `hasMarkerTypeDefs ? '1.3' : hasMetadata ? '1.2' : '1.1'`

**Files to modify:**
- `lib/snapspot-data/validator.js`

**Acceptance Criteria:**
- [ ] `SUPPORTED_VERSIONS` includes '1.3'
- [ ] SCHEMA includes `markerTypeDefinition` required fields
- [ ] `validateMarkerTypeDefinition()` validates all field constraints
- [ ] Root validation checks `markerTypeDefinitions` array when present
- [ ] Optional `markerTypeId` and `direction` on markers pass validation
- [ ] Invalid shapes, colors, scopes produce descriptive errors

---

### ☐ Task 1.5: Add Reference Check for Deletion

**Actions:**
1. When deleting a marker type definition, check if any markers reference it:
   - Query the `markers` store for any marker with `markerTypeId === definitionId`
   - If references exist: throw an error with the count of affected markers
   - Built-in types already protected from deletion (isBuiltIn check in Phase 2)

2. This is NOT a cascade — we never auto-delete markers when their type is removed.

3. Helper method: `getMarkerCountByType(typeId)` — returns count of markers using this type.

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] `deleteMarkerTypeDefinition()` checks for existing markers
- [ ] Descriptive error when deletion blocked: "Cannot delete type 'X': 5 markers use this type"
- [ ] `getMarkerCountByType()` works correctly

---

## Manual Testing Checklist

### Test 1: Database Upgrade
- [ ] Open SnapSpot with existing data (maps, markers, photos, metadata)
- [ ] Check browser DevTools → Application → IndexedDB → SnapSpotDB
- [ ] Verify `markerTypeDefinitions` store exists
- [ ] Verify "Photo Marker" and "Line Marker" definitions are present
- [ ] Verify version number incremented
- [ ] Verify all existing data intact

### Test 2: CRUD Operations
- [ ] In DevTools console, call `app.storage.addMarkerTypeDefinition(...)` with valid data
- [ ] Verify definition appears in store
- [ ] Call `getMarkerTypeDefinition(id)` and verify returned data
- [ ] Call `updateMarkerTypeDefinition(...)` with modified color
- [ ] Verify updated color is persisted
- [ ] Call `deleteMarkerTypeDefinition(id)` on a custom (non-built-in) type with no markers
- [ ] Verify type is removed
- [ ] Call `deleteMarkerTypeDefinition(id)` on "Photo Marker" built-in → should be blocked (once Phase 2 UI enforces this)

### Test 3: Validation
- [ ] Try creating a definition with invalid shape — should error
- [ ] Try creating a definition with invalid hex color — should error
- [ ] Try creating a definition missing required fields — should error
- [ ] Verify arrow shape auto-sets hasDirection: true
- [ ] Verify non-arrow shapes auto-set hasDirection: false

### Test 4: Validator v1.3
- [ ] Create a valid v1.3 export JSON manually with markerTypeDefinitions
- [ ] Run `validateExport(json)` — should return empty errors array
- [ ] Remove required field from a markerTypeDefinition — should produce error
- [ ] Test with markerTypeId and direction on markers — should pass

### Test 5: Safari iOS
- [ ] Open SnapSpot on Safari iOS after upgrade
- [ ] Verify IndexedDB opens without error
- [ ] Verify built-in definitions exist
- [ ] All CRUD operations work
