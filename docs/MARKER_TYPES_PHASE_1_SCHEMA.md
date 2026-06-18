# Phase 1: Custom Marker Types — Schema and Storage Layer

**Status:** Completed  
**Estimated Duration:** 1-2 days  
**Started:** 2026-06-12  
**Completed:** 2026-06-12

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
  scope: 'global',                  // Always 'global' (map-specific dropped for simplicity)
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
- `scope`: Always `'global'`. Reserved for future map-specific scoping.
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
  direction: 45 | null              // Degrees 0-360, only meaningful when behavior=point & shape=arrow
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

## Tasks (All Completed ✅)

### Task 1.1: IndexedDB Schema Changes
- [x] Database version 5 → 6
- [x] New `markerTypeDefinitions` object store with indexes: `scope`, `name`, `isBuiltIn`
- [x] Existing stores unaffected

### Task 1.2: MarkerTypeDefinition CRUD Methods
- [x] `addMarkerTypeDefinition()` — Create with validation
- [x] `getMarkerTypeDefinition()` — Get by ID
- [x] `getAllMarkerTypeDefinitions()` — Get all
- [x] `getEnabledMarkerTypeDefinitions()` — Filter by localStorage toggles
- [x] `getMarkerTypeDefinitionsForMap()` — Map-scoped (reserved)
- [x] `updateMarkerTypeDefinition()` — Update with built-in protection
- [x] `deleteMarkerTypeDefinition()` — Delete with reference check

### Task 1.3: Auto-Create Preset Library
- [x] 5 presets auto-created on upgrade: Photo Marker, Line Marker, Point of Interest, Hazard Zone, Direction Arrow
- [x] Idempotent via `store.put()` (no duplicates on re-upgrade)
- [x] Fixed IDs for code references

### Task 1.4: Validator v1.3
- [x] `'1.3'` added to `SUPPORTED_VERSIONS`
- [x] `markerTypeDefinition` schema with required fields
- [x] `validateMarkerTypeDefinition()` with full field validation
- [x] `markerTypeDefinitions` array validation in `validateExportFile()`
- [x] Optional `markerTypeId` and `direction` on markers validated

### Task 1.5: Reference Check for Deletion
- [x] `getMarkerCountByType()` helper
- [x] `deleteMarkerTypeDefinition()` blocks deletion when markers reference the type
- [x] Descriptive error: "Cannot delete type 'X': N markers use this type"

---

## Manual Testing Checklist (All Passed ✅)

### Test 1: Database Upgrade
- [x] IndexedDB version 6, `markerTypeDefinitions` store exists
- [x] 5 preset definitions present
- [x] All existing data intact

### Test 2: CRUD Operations
- [x] Add, get, update, delete custom type definitions work
- [x] Built-in deletion blocked
- [x] Shape change on built-in blocked
- [x] Color change on built-in allowed

### Test 3: Validation
- [x] Invalid shape, color, label rejected with descriptive errors
- [x] Required field validation works

### Test 4: Validator v1.3
- [x] Valid v1.3 export passes validation
- [x] Invalid marker type definitions produce errors

### Test 5: Safari iOS
- [ ] Test on Safari iOS (pending)

