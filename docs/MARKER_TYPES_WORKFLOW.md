# SnapSpot Custom Marker Types - Workflow Tracker

**Last Updated:** June 12, 2026  
**Current Phase:** Phase 1 - Schema Design and Storage Layer  
**Current Task:** Manual testing

---

## Quick Reference

**When you say "let's continue":**
1. Check current phase below
2. Open the corresponding phase document
3. Find the first unchecked task
4. Implement it
5. Check for linting errors (`npm run lint:fix` → `npm run lint`)
6. If manual testing is needed, stop and provide test instructions
7. After tests pass, commit changes
8. Update checkboxes and move to next task

---

## Feature Overview

**Goal:** Add user-definable custom marker types that control marker appearance (shape, color, size, direction) on the map, replacing the current hardcoded "photo marker" vs "line marker" dichotomy.

**Key Requirements:**
- Define custom marker types with shape, color, size, and label
- Support directional markers (arrows) with rotation
- Custom markers can optionally have photos (like photo markers today)
- Marker types are scoped globally (map-specific scoping dropped for simplicity, can be added later)
- Existing photo and line marker types become built-in, non-deletable definitions
- Export/import marker type definitions alongside map data
- Compatible with the existing custom metadata system

**Shape Support:**
- **circle** — Classic round marker (like photo markers today)
- **square** — Rectangular marker
- **diamond** — 45° rotated square (like line markers today)
- **arrow** — Directional arrow with rotation support

**Example Use Cases:**
- Archaeological site: "Direction Arrow" type for marking photo shot directions
- Quarry mapping: "Dig Direction" arrow type, "Hazard Zone" square type
- Floor plans: "Exit" arrow type, "Fire Extinguisher" diamond type
- Site maps: "Photo Point" circle type (replaces default photo markers)

---

## Overall Progress

### ☑ Phase 1: Schema Design and Storage Layer
**Status:** In Progress (implementation done, testing pending)  
**Document:** [MARKER_TYPES_PHASE_1_SCHEMA.md](MARKER_TYPES_PHASE_1_SCHEMA.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☑ Data model design for MarkerTypeDefinition
- ☑ IndexedDB schema updates (new object store, indexes)
- ☑ MapStorage methods for marker type CRUD operations
- ☑ Auto-create built-in "Photo Marker" and "Line Marker" definitions
- ☑ Update marker schema to support markerTypeId and direction
- ☑ Update validator.js SCHEMA for v1.3 with markerTypeDefinitions
- ☐ Manual storage tests

---

### ☐ Phase 2: Marker Type Definition UI
**Status:** Not Started  
**Document:** [MARKER_TYPES_PHASE_2_UI.md](MARKER_TYPES_PHASE_2_UI.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ "Marker Types" tab in Settings with preset toggle grid
- ☐ Preset library: Photo Marker, Line Marker (built-in) + Point of Interest, Hazard Zone, Direction Arrow
- ☐ Toggle presets on/off (state persisted to localStorage)
- ☐ Edit built-in colors (Photo Marker, Line Marker)
- ☐ Stripped-down custom type form (name, shape, color, label — 4 fields)
- ☐ Default marker type selector in Settings
- ☐ Export/Import type definition buttons (placeholders until Phase 5)
- ☐ Manual UI tests

---

### ☐ Phase 3: Rendering Engine
**Status:** Not Started  
**Document:** [MARKER_TYPES_PHASE_3_RENDERING.md](MARKER_TYPES_PHASE_3_RENDERING.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Refactor `drawMarker()` to use type definition lookup
- ☐ Implement shape dispatch: circle (arc), square (fillRect), diamond (rotated fillRect), arrow (triangle+stem)
- ☐ Arrow rendering with direction rotation via ctx.rotate()
- ☐ Color from type definition (with fallback to default coloring logic)
- ☐ Size from type definition mapped to size settings
- ☐ Pass type definitions to MapRenderer via setMarkerTypeDefinitions()
- ☐ Update renderMarkers() for unified marker loop
- ☐ Manual rendering tests (all shapes, sizes, rotations, map rotations)

---

### ☐ Phase 4: Marker Creation and Type Selection
**Status:** Not Started  
**Document:** [MARKER_TYPES_PHASE_4_CREATION.md](MARKER_TYPES_PHASE_4_CREATION.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Replace "Place Line" button with "Place Custom" button in toolbar
- ☐ Type picker popup on "Place Custom" (all non-default types + line pair + create new)
- ☐ "Place Marker" button always places default type (Photo Marker, configurable)
- ☐ Default marker type setting in Settings → Marker Types tab
- ☐ Update placeMarker() to accept markerTypeId parameter
- ☐ Direction rotation slider (0-360°) with live preview canvas in marker details modal
- ☐ Subtle cardinal snap detents (0/90/180/270) on slider
- ☐ Display marker type info (name + shape icon) in marker details modal
- ☐ Allow type change for existing markers (with compatibility constraints)
- ☐ Manual creation and direction tests

---

### ☐ Phase 5: Export/Import Functionality
**Status:** Not Started  
**Document:** [MARKER_TYPES_PHASE_5_EXPORT.md](MARKER_TYPES_PHASE_5_EXPORT.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Bump export version to v1.3 in validator.js
- ☐ Update writer to serialize markerTypeDefinitions[] in exports
- ☐ Include markerTypeId and direction on exported markers
- ☐ Update parser to parse markerTypeDefinitions and map type IDs
- ☐ Update merger for marker type definition deduplication
- ☐ Update import decision modal for marker type conflicts
- ☐ Separate marker type definitions export (Settings, like metadata export)
- ☐ Backward compatibility: v1.1/v1.2 exports still import correctly
- ☐ Manual export/import round-trip tests

---

### ☐ Phase 6: Built-in Migration and Polish
**Status:** Not Started  
**Document:** [MARKER_TYPES_PHASE_6_MIGRATION.md](MARKER_TYPES_PHASE_6_MIGRATION.md)  
**Estimated Duration:** 1 day

**Deliverables:**
- ☐ Migration logic: existing markers without markerTypeId treated as built-in types
- ☐ Built-in type protection (delete blocked, shape locked, color editable)
- ☐ Cascade handling: warn/block when deleting a type with existing markers
- ☐ Line marker backward compatibility (line connectors still key off type==='line')
- ☐ Service worker cache version bump
- ☐ Update README.md with custom marker types documentation
- ☐ Update copilot-instructions.md with marker type architecture
- ☐ Run lint:fix and ensure 0 lint errors
- ☐ Manual end-to-end testing (including Safari iOS)

---

## Architecture Overview

### Data Model

**MarkerTypeDefinition:**
```javascript
{
  id: 'uuid',                       // crypto.randomUUID() (fixed IDs for built-ins/presets)
  name: 'Hazard Zone',              // User-facing type name
  shape: 'square',                  // 'circle' | 'square' | 'diamond' | 'arrow'
  color: '#f59e0b',                 // Hex color string
  size: 'normal',                   // 'small' | 'normal' | 'large'
  label: 'HZ',                      // Short label displayed on map (optional, max 4 chars)
  behavior: 'point',                // 'point' | 'line-pair' (extensible enum)
  supportsPhotos: true,             // Whether markers of this type can have photo attachments
  showNumber: true,                 // Whether to draw the sequential number on the map canvas
  scope: 'global',                  // 'global' (map-specific dropped for simplicity)
  isBuiltIn: false,                 // True for Photo Marker and Line Marker defaults
  isPreset: true,                   // True for pre-defined library types
  createdDate: '2026-06-12T...',
  lastModified: '2026-06-12T...'
}
```

**Derived properties (not stored):**
- `hasDirection` → `behavior === 'point' && shape === 'arrow'`

**Marker (extended):**
```javascript
{
  // ... existing fields ...
  markerTypeId: 'uuid' | null,      // FK → MarkerTypeDefinition.id (null = use built-in default)
  direction: 45 | null              // Rotation in degrees 0-360 (only when behavior=point & shape=arrow)
}
```

### Storage Structure

**New IndexedDB Object Store:**
- `markerTypeDefinitions` — Stores MarkerTypeDefinition objects
  - Index: `scope` (for filtering global vs map-specific)
  - Index: `name` (for searching by name)
  - Index: `isBuiltIn` (for filtering built-in types)

### Export Format (v1.3)

```javascript
{
  version: '1.3',
  type: 'snapspot-export',
  sourceApp: 'SnapSpot',
  timestamp: '2026-06-11T...',
  map: { /* existing map data */ },
  markers: [
    {
      // ... existing fields ...
      markerTypeId: 'uuid',         // Optional: links to MarkerTypeDefinition
      direction: 45                 // Optional: degrees 0-360
    }
  ],
  photos: [ /* existing photo data */ ],
  metadataDefinitions: [ /* existing metadata */ ],
  metadataValues: [ /* existing metadata */ ],
  markerTypeDefinitions: [         // NEW in v1.3
    {
      id: 'uuid',
      name: 'Direction Arrow',
      shape: 'arrow',
      color: '#3b82f6',
      size: 'normal',
      label: 'Dir',
      behavior: 'point',
      supportsPhotos: true,
      showNumber: true,
      scope: 'global',
      isBuiltIn: false,
      createdDate: '2026-06-11T...',
      lastModified: '2026-06-11T...'
    }
  ]
}
```

**Separate Marker Type Definitions Export:**
```javascript
{
  version: '1.3',
  type: 'snapspot-marker-type-definitions',
  sourceApp: 'SnapSpot',
  timestamp: '2026-06-11T...',
  definitions: [ /* MarkerTypeDefinition objects */ ]
}
```

---

## Commit Strategy

Each phase should result in 1-2 commits:
- Phase 1: `feat: add MarkerTypeDefinition storage schema and CRUD methods`
- Phase 2: `feat: add marker type definition UI in settings`
- Phase 3: `feat: refactor marker rendering for custom marker types`
- Phase 4: `feat: add marker type selection and direction controls`
- Phase 5: `feat: add marker type export/import (v1.3)`
- Phase 6: `feat: migrate existing markers and polish custom marker types`

---

## Testing Strategy

**Each phase includes manual testing:**
- Phase 1: Storage operations (add, retrieve, update, delete definitions)
- Phase 2: Definition UI (create, edit, delete types; shape/color preview)
- Phase 3: All shapes render correctly at all sizes; arrows rotate correctly
- Phase 4: Type picker UX; direction control; type change on existing markers
- Phase 5: Export/import round-trip; backward compat with v1.1/v1.2
- Phase 6: End-to-end workflows; Safari iOS testing

**Browser Testing:**
- Chrome/Edge (desktop and mobile)
- Firefox (desktop)
- Safari (iOS/iPadOS — critical for IndexedDB Base64 compatibility)

---

## Key Design Decisions

### 1. Separate from Metadata Definitions
Marker type definitions control **how a marker looks and behaves** on the map. Metadata definitions control **what data fields** an entity has. These are different domains and should remain separate concepts — even though they share the same architectural patterns (IndexedDB store, CRUD, import/export).

### 2. Built-in Types
"Photo Marker" (circle) and "Line Marker" (diamond) are auto-created on DB upgrade as `isBuiltIn: true`. They cannot be deleted and their shape is locked, but users can customize their color. This provides conceptual unity while preserving backward compatibility.

### 3. Photo Support on Custom Markers
Custom marker types CAN have photos attached, just like the default "Photo Marker" type. The `markerTypeId` field on a marker is orthogonal to whether it has photos — a marker of any type can have `photoIds[]`.

### 4. Direction/Rotation
Only arrow-shaped point markers support direction (`behavior: 'point'` + `shape: 'arrow'`). Direction is stored in degrees (0-360) with 0° pointing up/north. Rotation is applied via `ctx.rotate()` at render time and accounts for map rotation transformations.

### 5. Scope Model
- All marker types are **global** (appear for all maps).
- Map-specific scoping was considered but dropped to keep the feature simple.
- Can be added in a future release if demanded by users.
- The `scope` field is always `'global'`; a `scope` index exists in IndexedDB reserved for future use.

### 6. Line Marker Backward Compatibility
Line connectors (`renderLineConnectors()`) continue to key off `marker.type === 'line'` rather than the type definition. This avoids breaking the line pair system during the initial rollout. A future phase could generalize line/polygon support into the type definition system.

### 7. Marker Numbering
All markers whose type has `supportsPhotos: true` are assigned a sequential number ordered globally by `createdDate`. This provides a stable identifier across the UI (marker list, details modal, search). The `showNumber` field controls only whether the number is drawn on the canvas — a marker with `showNumber: false` still HAS a number for UI purposes, it's just not painted on the map. Line markers (`supportsPhotos: false`) are excluded from numbering entirely.
