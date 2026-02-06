# SnapSpot Metadata System - Workflow Tracker

**Last Updated:** February 5, 2026  
**Current Phase:** Not Started  
**Current Task:** Phase 1 - Schema Design and Storage Layer

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

**Goal:** Add flexible, user-defined metadata fields to maps, markers, and photos in SnapSpot.

**Key Requirements:**
- Define custom metadata fields (name, type, applicable entities)
- Metadata can be global (all maps) or map-specific
- Support field types: text, number, date, boolean, select (dropdown)
- Enter/edit metadata values when creating/editing maps, markers, photos
- Export/import metadata definitions and values
- Share metadata definitions between users
- Search/query based on metadata values
- Desktop-first UX, mobile-capable

**Example Use Case:**
Archaeological site mapping with inscriptions:
- Define fields: "Inscription Author" (text), "Inscription Text" (text), "Inscription Date" (date)
- Apply to: Markers (or Photos)
- Enter field values while documenting inscriptions
- Export map with metadata
- Share metadata definitions with team

---

## Overall Progress

### ☐ Phase 1: Schema Design and Storage Layer
**Status:** Not Started  
**Document:** [METADATA_PHASE_1_SCHEMA.md](METADATA_PHASE_1_SCHEMA.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Data model design for metadata definitions and values
- ☐ IndexedDB schema updates (object stores, indexes)
- ☐ MapStorage methods for metadata CRUD operations
- ☐ Update validator.js SCHEMA for metadata in exports
- ☐ Validation and error handling
- ☐ Manual storage tests

---

### ☐ Phase 2: Metadata Definition UI
**Status:** Not Started  
**Document:** [METADATA_PHASE_2_UI.md](METADATA_PHASE_2_UI.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Settings modal section for metadata definitions
- ☐ UI to create/edit/delete metadata definitions
- ☐ Field configuration: name, type, scope, applies-to
- ☐ Preview/test metadata forms
- ☐ Global vs map-specific management
- ☐ Manual UI tests

---

### ☐ Phase 3: Metadata Entry UI
**Status:** Not Started  
**Document:** [METADATA_PHASE_3_ENTRY.md](METADATA_PHASE_3_ENTRY.md)  
**Estimated Duration:** 2-3 days

**Deliverables:**
- ☐ Dynamic form generation from metadata definitions
- ☐ Add metadata fields to map upload modal
- ☐ Add metadata fields to marker details modal
- ☐ Add metadata fields to photo upload
- ☐ Validation and save metadata values
- ☐ Display metadata in detail views
- ☐ Manual entry tests

---

### ☐ Phase 4: Export/Import Functionality
**Status:** Not Started  
**Document:** [METADATA_PHASE_4_EXPORT_IMPORT.md](METADATA_PHASE_4_EXPORT_IMPORT.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Update writer.js to include metadata in exports
- ☐ Update parser.js to parse metadata from imports
- ☐ Export decision modal: include/exclude metadata
- ☐ Separate export for metadata definitions only
- ☐ Import decision modal: handle metadata conflicts
- ☐ Merge logic for metadata definitions and values
- ☐ Manual import/export tests

---

### ☐ Phase 5: Search and Query
**Status:** Not Started  
**Document:** [METADATA_PHASE_5_QUERY.md](METADATA_PHASE_5_QUERY.md)  
**Estimated Duration:** 1-2 days

**Deliverables:**
- ☐ Extend search to query metadata fields
- ☐ Filter by metadata values
- ☐ Display metadata in search results
- ☐ Advanced search UI for metadata
- ☐ Manual search tests

---

### ☐ Phase 6: Polish and Documentation
**Status:** Not Started  
**Document:** [METADATA_PHASE_6_POLISH.md](METADATA_PHASE_6_POLISH.md)  
**Estimated Duration:** 1 day

**Deliverables:**
- ☐ Responsive design refinements
- ☐ Mobile UX improvements
- ☐ User documentation in README.md
- ☐ Update Project.md with metadata architecture
- ☐ Update copilot-instructions.md
- ☐ Final integration tests
- ☐ Service worker cache update

---

## Architecture Overview

### Data Model

**MetadataDefinition:**
```javascript
{
  id: 'uuid',                    // crypto.randomUUID()
  name: 'Inscription Author',    // User-facing field name
  fieldType: 'text',             // 'text' | 'number' | 'date' | 'boolean' | 'select'
  scope: 'global',               // 'global' | mapId (string)
  appliesTo: ['marker'],         // Array: 'map' | 'marker' | 'photo'
  required: false,               // Is field required?
  options: [],                   // For 'select' type: array of option strings
  description: '',               // Help text
  createdDate: '2026-02-05T...',
  lastModified: '2026-02-05T...'
}
```

**MetadataValue:**
```javascript
{
  id: 'uuid',                    // crypto.randomUUID()
  definitionId: 'uuid',          // Links to MetadataDefinition
  entityType: 'marker',          // 'map' | 'marker' | 'photo'
  entityId: 'uuid',              // ID of the map/marker/photo
  value: 'John Doe',             // Actual value (type varies)
  createdDate: '2026-02-05T...',
  lastModified: '2026-02-05T...'
}
```

### Storage Structure

**New IndexedDB Object Stores:**
- `metadataDefinitions` - Stores field definitions
  - Index: `scope` (for filtering global vs map-specific)
  - Index: `appliesTo` (multi-entry for filtering by entity type)
- `metadataValues` - Stores actual metadata values
  - Index: `definitionId` (find all values for a definition)
  - Index: `entityType` + `entityId` (composite, find all metadata for an entity)

### Export Format (v1.2)

```javascript
{
  version: '1.2',
  type: 'snapspot-export',
  sourceApp: 'SnapSpot',
  timestamp: '2026-02-05T...',
  map: { /* existing map data */ },
  markers: [ /* existing marker data */ ],
  photos: [ /* existing photo data */ ],
  metadataDefinitions: [ /* MetadataDefinition objects */ ],
  metadataValues: [ /* MetadataValue objects */ ]
}
```

**Separate Metadata Definitions Export:**
```javascript
{
  version: '1.2',
  type: 'snapspot-metadata-definitions',
  sourceApp: 'SnapSpot',
  timestamp: '2026-02-05T...',
  definitions: [ /* MetadataDefinition objects */ ]
}
```

---

## Commit Strategy

Each phase should result in 1-2 commits:
- Phase 1: `feat: add metadata storage schema and MapStorage methods`
- Phase 2: `feat: add metadata definition UI in settings`
- Phase 3: `feat: add metadata entry forms to map/marker/photo modals`
- Phase 4: `feat: add metadata export/import functionality`
- Phase 5: `feat: add metadata search and query`
- Phase 6: `docs: add metadata system documentation and polish UX`

---

## Testing Strategy

**Each phase includes manual testing:**
- Phase 1: Storage operations (add, retrieve, update, delete)
- Phase 2: Definition UI (create, edit, delete definitions)
- Phase 3: Entry UI (enter values, validate, save, display)
- Phase 4: Export/import round-trip with metadata
- Phase 5: Search and filter by metadata
- Phase 6: End-to-end user workflows

**Browser Testing:**
- Chrome/Edge (desktop and mobile)
- Firefox (desktop)
- Safari (iOS/iPadOS - critical for IndexedDB compatibility)

---

## Key Design Decisions

### 1. Scope Model
- **Global metadata** applies to all maps (defined once, used everywhere)
- **Map-specific metadata** only applies to one map (useful for specialized projects)
- User can convert between global and map-specific

### 2. Field Types
- **text** - Single-line text input
- **number** - Numeric input with validation
- **date** - Date picker (HTML5 date input)
- **boolean** - Checkbox
- **select** - Dropdown with predefined options

### 3. Applies-To Model
- Metadata definitions can apply to multiple entity types
- Example: "Date Documented" could apply to map, marker, AND photo
- UI shows only relevant fields based on context

### 4. Export Strategy
- Full map export: includes metadata definitions and values
- Metadata-only export: just definitions (for sharing templates)
- Export decision modal: checkbox to exclude metadata
- Import handles conflicts (duplicate definitions, missing definitions)

### 5. UI Placement
- **Settings modal**: New "Metadata Definitions" tab
- **Upload/edit modals**: Dynamic section for metadata entry
- **Marker details modal**: Display and edit metadata
- **Search modal**: Filter and display metadata

---

## Questions to Ask Before Implementing

- Is metadata applicable to maps, markers, photos, or all three?
- Should this be global or map-specific? (Ask user or allow both)
- What field types are needed initially? (Start with text, expand later)
- How should metadata conflicts be handled on import? (Merge rules)
- Should metadata be searchable immediately or in Phase 5? (Phase 5)

---

## Reference Links

- [Phase 1: Schema and Storage](METADATA_PHASE_1_SCHEMA.md)
- [Phase 2: Definition UI](METADATA_PHASE_2_UI.md)
- [Phase 3: Entry UI](METADATA_PHASE_3_ENTRY.md)
- [Phase 4: Export/Import](METADATA_PHASE_4_EXPORT_IMPORT.md)
- [Phase 5: Search/Query](METADATA_PHASE_5_QUERY.md)
- [Phase 6: Polish](METADATA_PHASE_6_POLISH.md)
- [Main Refactoring Workflow](REFACTORING_WORKFLOW.md) (reference example)

---

**Next Step:** Open [METADATA_PHASE_1_SCHEMA.md](METADATA_PHASE_1_SCHEMA.md) and begin implementation.
