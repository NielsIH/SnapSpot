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

## Design Decisions

### Separation of Visual and Behavioral Properties

A marker type has two independent dimensions:
- **Visual (paint):** shape, color, label — how it looks on the map
- **Behavior:** what the marker *does* — how it's placed, whether it supports photos, whether it has direction

This separation is captured by the `behavior` field, which acts as a dispatch key throughout the codebase. Adding a new behavior (e.g., `area` for polygon markers) in the future only requires adding new branches at dispatch points — no schema migration needed.

### Preset Library

The app ships with a curated set of 6 pre-defined marker types covering common use cases. Users toggle them on/off — no configuration needed for most. A stripped-down custom type form (name, shape, color, label) is available as an escape hatch.

---

## Data Model Specification

### MarkerTypeDefinition Object

**Purpose:** Describes a marker type that controls how a marker looks (visual) and behaves (behavioral) on the map.

```javascript
{
  // Identity
  id: 'uuid',                       // crypto.randomUUID() (or fixed ID for built-ins)
  name: 'Hazard Zone',              // User-facing type name (required)
  isBuiltIn: false,                 // True for built-in defaults (Photo Marker, Line Marker)
  isPreset: true,                   // True for pre-defined library types, false for user-created

  // Visual (paint)
  shape: 'square',                  // 'circle' | 'square' | 'diamond' | 'arrow' (required)
  color: '#f59e0b',                 // Hex color string (required)
  size: 'normal',                   // 'small' | 'normal' | 'large' (default: 'normal')
  label: 'HZ',                      // Short label displayed on map (optional, max 4 chars)

  // Behavioral
  behavior: 'point',                // 'point' | 'line-pair' (extensible enum)
  supportsPhotos: true,             // Whether markers of this type can have photo attachments

  // Metadata
  scope: 'global',                  // 'global' or mapId string (required)
  createdDate: '2026-06-12T...',    // ISO timestamp
  lastModified: '2026-06-12T...'    // ISO timestamp
}
```

**Behavior Types:**

| `behavior` | Placement | Rendering | Photos | Direction |
|------------|-----------|-----------|--------|-----------|
| `point` | Single tap at crosshair | Shape at coordinate | ✅ Yes | If shape=arrow |
| `line-pair` | Two markers at offset from center | Shape + connecting line | ❌ No | ❌ No |

The `behavior` enum is extensible. Future additions (e.g., `area` for polygon markers) follow the same pattern: add a new value, implement placement/rendering dispatch, no schema migration.

**Derived Properties (not stored):**
- `hasDirection` → `behavior === 'point' && shape === 'arrow'`
- `supportsPhotos` is stored explicitly (not derived) for future-proofing — a future behavior might not want photos even if it's not `line-pair`

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
- `behavior`: Required, must be one of: point, line-pair
- `supportsPhotos`: Boolean, defaults to true. Only false for line-pair.
- `scope`: Required, either 'global' or valid mapId
- `isBuiltIn`: Boolean, defaults to false. Only true for auto-created defaults (Photo Marker, Line Marker).
- `isPreset`: Boolean, defaults to false. True for pre-defined library types. Presets can be toggled on/off, duplicated, but not deleted.

### Pre-defined Preset Library

Six types ship with the app. Users toggle them on/off in Settings:

```javascript
const PRESET_MARKER_TYPES = [
  { id: 'builtin-photo-marker',   name: 'Photo Marker',      shape: 'circle',  color: '#ef4444', behavior: 'point',     isBuiltIn: true, isPreset: true },
  { id: 'builtin-line-marker',    name: 'Line Marker',       shape: 'diamond', color: '#e53e3e', behavior: 'line-pair', isBuiltIn: true, isPreset: true, supportsPhotos: false },
  { id: 'preset-point-interest',  name: 'Point of Interest', shape: 'circle',  color: '#22c55e', behavior: 'point',     isPreset: true },
  { id: 'preset-hazard-zone',     name: 'Hazard Zone',       shape: 'square',  color: '#f59e0b', behavior: 'point',     isPreset: true },
  { id: 'preset-direction-arrow', name: 'Direction Arrow',   shape: 'arrow',   color: '#3b82f6', behavior: 'point',     isPreset: true }
]
```

- Built-in types (Photo Marker, Line Marker): always present, cannot be deleted, shape locked, color editable
- Preset types: can be toggled on/off, cannot be deleted (but can be duplicated to create a custom variant)
- User-created types: full edit/delete, `isPreset: false`
- Only enabled types appear in the "Place Custom" popup and as options for default type

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
  - `type === 'line'` → "Line Marker" built-in (diamond, `behavior: line-pair`)
  - otherwise → "Photo Marker" built-in (circle, `behavior: point`)
- `markerTypeId` set → marker uses the specified type definition for rendering and behavior
- `direction` is only meaningful when the effective type has `behavior === 'point' && shape === 'arrow'`; ignored for other combinations

**Behavior dispatch (used throughout the codebase):**
```javascript
function getBehavior(marker, typeDef) {
  if (marker.markerTypeId && typeDef) return typeDef.behavior
  if (marker.type === 'line') return 'line-pair'
  return 'point'
}
```
All code that currently checks `marker.type === 'line'` should instead check `behavior === 'line-pair'`. This is the single dispatch point that future behaviors (e.g., `area`) extend.

**Photos:** All marker types support photo attachments EXCEPT those with `supportsPhotos: false` (currently only line-pair behavior). `supportsPhotos` is stored explicitly on the type definition rather than derived from behavior, ensuring future behaviors can independently control photo support without code changes.

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
   - `getEnabledMarkerTypeDefinitions()` — Get only enabled (toggled-on) types for the Place Custom popup
   - `getMarkerTypeDefinitionsByScope(scope)` — Get global or map-specific
   - `getMarkerTypeDefinitionsForMap(mapId)` — Get global + map-specific (used for marker placement picker)
   - `updateMarkerTypeDefinition(definition)` — Update existing
   - `deleteMarkerTypeDefinition(id)` — Delete (with reference check)

2. Implement validation in each method:
   - Check required fields: name, shape, color, behavior, scope
   - Validate shape and behavior enum values
   - Validate color hex format
   - Validate label max length (4 chars)

3. Follow the same async/await + transaction pattern used by existing metadata definition methods.

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] All CRUD methods implemented with proper IndexedDB transactions
- [ ] Input validation with descriptive error messages
- [ ] Async/await pattern consistent with existing storage methods
- [ ] Console logging for debugging (follow existing patterns)

---

### ☐ Task 1.3: Auto-Create Preset Library Definitions

**Actions:**
1. In `onupgradeneeded`, after creating the `markerTypeDefinitions` store, insert all 5 preset types:

```javascript
const PRESETS = [
  {
    id: 'builtin-photo-marker', name: 'Photo Marker',
    shape: 'circle', color: '#ef4444', size: 'normal', label: '',
    behavior: 'point', supportsPhotos: true,
    scope: 'global', isBuiltIn: true, isPreset: true
  },
  {
    id: 'builtin-line-marker', name: 'Line Marker',
    shape: 'diamond', color: '#e53e3e', size: 'normal', label: '',
    behavior: 'line-pair', supportsPhotos: false,
    scope: 'global', isBuiltIn: true, isPreset: true
  },
  {
    id: 'preset-point-interest', name: 'Point of Interest',
    shape: 'circle', color: '#22c55e', size: 'normal', label: '',
    behavior: 'point', supportsPhotos: true,
    scope: 'global', isPreset: true
  },
  {
    id: 'preset-hazard-zone', name: 'Hazard Zone',
    shape: 'square', color: '#f59e0b', size: 'normal', label: '',
    behavior: 'point', supportsPhotos: true,
    scope: 'global', isPreset: true
  },
  {
    id: 'preset-direction-arrow', name: 'Direction Arrow',
    shape: 'arrow', color: '#3b82f6', size: 'normal', label: '',
    behavior: 'point', supportsPhotos: true,
    scope: 'global', isPreset: true
  }
]
```

2. Use fixed IDs for lookups (`builtin-photo-marker`, `builtin-line-marker`, `preset-*`).

3. Only create if they don't already exist (idempotent — use `put` or check count first).

4. Add a `localStorage` key for each preset's enabled state (e.g., `markerType_enabled_preset-hazard-zone`). Built-in types are always enabled; presets default to enabled but can be toggled.

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
   - Validate `behavior` is one of: point, line-pair
   - Validate `supportsPhotos` (if present) is boolean
   - Validate shape is one of: circle, square, diamond, arrow
   - Validate color is a valid hex string
   - Validate scope is 'global' or a non-empty string (mapId)
   - Validate size (if present) is: small, normal, large
   - Validate isBuiltIn / isPreset (if present) are booleans
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
- [ ] Verify arrow shape auto-derives direction support (behavior=point + shape=arrow)
- [ ] Verify non-arrow shapes do not get direction support

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
