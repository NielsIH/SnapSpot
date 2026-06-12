# Phase 6: Custom Marker Types — Migration and Polish

**Status:** Not Started  
**Estimated Duration:** 1 day  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phases 1-5 complete

---

## Goals

Finalize the custom marker types feature with migration, polish, and documentation:
1. Ensure existing markers work seamlessly (no data migration needed)
2. Protect built-in types from deletion and destructive edits
3. Handle cascade scenarios (deleting a type that has markers)
4. Update documentation (README, copilot-instructions, Project.md)
5. Service worker cache version bump
6. Lint and final integration testing

---

## Tasks

### ☐ Task 6.1: Verify Legacy Marker Compatibility

**Actions:**
1. **No data migration needed** — this was a key design decision. Existing markers without `markerTypeId` are handled at render time by `getEffectiveTypeDef()`:
   - `type === 'line'` → built-in "Line Marker"
   - otherwise → built-in "Photo Marker"

2. Verify all legacy scenarios work:
   - Markers created before this feature still render correctly
   - Existing exports (v1.1, v1.2) still import correctly
   - Line markers still render as diamonds with line connectors
   - Photo markers still render as circles with numbers
   - Locked/unlocked state colors still apply (since legacy markers have `markerTypeId === null`, the old default coloring logic is used)

3. Run through the metadata system's existing test scenarios to ensure no regression.

**Files to verify:**
- `js/mapRenderer.js` — `getEffectiveTypeDef()` handles null markerTypeId
- `js/storage.js` — `onupgradeneeded` is idempotent
- `lib/snapspot-data/parser.js` — handles v1.1/v1.2 exports

**Acceptance Criteria:**
- [ ] All existing maps open and render correctly
- [ ] Existing photo markers look identical to before
- [ ] Existing line markers look identical to before
- [ ] Lock/unlock toggle works for legacy markers
- [ ] Custom color rules work for legacy markers
- [ ] No console errors on startup with existing data

---

### ☐ Task 6.2: Built-in Type Protection

**Actions:**
1. In `js/storage.js`, `deleteMarkerTypeDefinition()`:
   - If `definition.isBuiltIn === true`: throw error "Cannot delete built-in marker types"
   - Built-in types use fixed IDs (`builtin-photo-marker`, `builtin-line-marker`)

2. In `js/storage.js`, `updateMarkerTypeDefinition()`:
   - If `definition.isBuiltIn === true`: only allow updating `color` field
   - Block changes to `name`, `shape`, `size`, `behavior`, `supportsPhotos`, `scope`, `isBuiltIn`, `isPreset`
   - If attempt to change blocked fields: throw error with descriptive message
   - If `definition.isPreset === true` (but not isBuiltIn): only allow toggling enabled state. Block all field edits (presets are immutable — duplicate to customize).

3. In the settings UI (Phase 2):
   - When editing a built-in type: only color is editable
   - Preset types: no edit button (immutable). User duplicates to create a custom variant.
   - Title for built-in edit: "Edit Photo Marker Color"

4. In the settings list:
   - Built-in types show "(default)" badge
   - Delete button hidden for built-in types
   - Edit button labeled "Edit Color" instead of "Edit"

**Files to modify:**
- `js/storage.js`
- `js/ui/marker-type-definition-modal.js`
- `js/ui/settings-modal.js`

**Acceptance Criteria:**
- [ ] Cannot delete built-in "Photo Marker" or "Line Marker"
- [ ] Can edit color of built-in types (shape, size, behavior, and name are locked for built-ins)
- [ ] Cannot change shape, name, or behavior of built-in types
- [ ] UI reflects restrictions (disabled inputs, hidden buttons)
- [ ] Console shows descriptive error if programmatic attempt is made

---

### ☐ Task 6.3: Cascade Handling on Type Deletion

**Actions:**
1. When user attempts to delete a custom marker type:
   - Query all markers in the `markers` store where `markerTypeId === typeId`
   - If count > 0: show error "Cannot delete '{name}': {count} markers use this type. Reassign or delete those markers first."
   - If count === 0: proceed with deletion

2. Add helper method `getMarkerCountByType(typeId)` to MapStorage:
```javascript
async getMarkerCountByType(typeId) {
  const db = await this._openDB()
  const tx = db.transaction('markers', 'readonly')
  const store = tx.objectStore('markers')
  const allMarkers = await new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return allMarkers.filter(m => m.markerTypeId === typeId).length
}
```

3. Alternative: Add a `markerTypeId` index to the `markers` store for efficient querying (more complex but scales better). For Phase 6, the filter approach is fine since marker counts are typically in the hundreds, not millions.

4. UI: Show a confirmation dialog showing the count if there are referenced markers.

**Files to modify:**
- `js/storage.js`
- `js/app-settings.js` (delete handler)

**Acceptance Criteria:**
- [ ] Deleting a type with 0 markers works immediately
- [ ] Deleting a type with N markers shows error with count
- [ ] Error message is clear and actionable
- [ ] User can go reassign those markers and retry deletion

---

### ☐ Task 6.4: Line Marker Backward Compatibility

**Actions:**
1. Verify that `renderLineConnectors()` in `mapRenderer.js` still works:
   - It keys off `behavior === 'line-pair'` and `marker.lineGroupId`
   - This is independent of the visual type definition system
   - No changes needed

2. Verify that the line marker details modal (`js/ui/line-marker-details-modal.js`) still works:
   - It keys off `marker.type === 'line'` (legacy) or `behavior === 'line-pair'` (new)
   - No changes needed for Phase 6

3. Document this in code comments:
   - Note that line connectors and line marker editing use behavior dispatch
   - A future `behavior: 'area'` would add polygon rendering here

**Files to verify:**
- `js/mapRenderer.js` — `renderLineConnectors()`
- `js/ui/line-marker-details-modal.js`
- `js/app-marker-photo-manager.js` — `placeLinePair()`

**Acceptance Criteria:**
- [ ] Line connectors draw correctly between line marker pairs
- [ ] Line marker details modal opens and edits correctly
- [ ] Line marker color and caption editing still works
- [ ] Placing line markers still works via "Place Custom" → "Line Marker (pair)"
- [ ] Code comments document the split between legacy line handling and new type system

---

### ☐ Task 6.5: Update Documentation

**Actions:**
1. **README.md:**
   - Add "Custom Marker Types" to the feature list
   - Brief description: "Define custom marker shapes (circle, square, diamond, arrow) with colors and directions"
   - Mention that Photo Marker and Line Marker are now customizable built-in types

2. **copilot-instructions.md:**
   - Add section on MarkerTypeDefinition model
   - Document the new marker fields: `markerTypeId`, `direction`
   - Update the Data Model section
   - Add to "When Extending" section: "Adding new marker shapes"
   - Update "Last Updated" date

3. **Project.md** (if applicable):
   - Add architecture section for custom marker types
   - Document the type definition lookup flow in MapRenderer

4. **In-code documentation:**
   - JSDoc comments on new storage methods
   - Comments explaining the type definition lookup logic
   - Explanation of arrow direction + map rotation composition

**Files to modify:**
- `README.md`
- `.github/copilot-instructions.md`
- `Project.md` (if it exists and has architecture section)
- Various source files (JSDoc)

**Acceptance Criteria:**
- [ ] README mentions custom marker types
- [ ] copilot-instructions.md has full marker type documentation
- [ ] New storage methods have JSDoc comments
- [ ] Complex rendering logic has explanatory comments

---

### ☐ Task 6.6: Service Worker and Linting

**Actions:**
1. Bump `CACHE_NAME` in `service-worker.js`:
```javascript
const CACHE_NAME = 'image-mapper-v2026-06-11-01'
```
Use current date and increment the NN suffix.

2. Run linting:
```bash
npm run lint:fix
npm run lint
```
Fix any errors. Ensure 0 lint errors before proceeding.

3. Check for any console.log statements that should be removed (debugging leftovers).

4. Verify all imports are correct (ES modules with `.js` extensions).

**Files to modify:**
- `service-worker.js`

**Acceptance Criteria:**
- [ ] CACHE_NAME updated with current date
- [ ] `npm run lint` reports 0 errors
- [ ] No debugging console.log statements in production code paths
- [ ] All ES module imports have `.js` extensions

---

### ☐ Task 6.7: End-to-End Integration Testing

**Actions:**
Perform a full workflow test from start to finish:

1. **Fresh start:** Open SnapSpot with cleared IndexedDB
2. **Upload a map:** Verify built-in types auto-created
3. **Create custom types:** Create one of each shape (circle, square, diamond, arrow)
4. **Place markers:** Place markers of each type, including arrow with directions
5. **Add photos:** Attach photos to markers of different types
6. **Edit types:** Change colors, verify all markers of that type update
7. **Edit markers:** Change type, change direction, verify rendering
8. **Lock/unlock:** Verify locked markers show correct appearance
9. **Export:** Export map with all marker types
10. **New instance:** Import into fresh SnapSpot instance
11. **Verify:** All types, markers, directions, photos intact
12. **Merge:** Merge two exports with overlapping types
13. **Safari iOS:** Full workflow on iOS Safari
14. **Offline:** Enable offline mode, verify all features work

**Acceptance Criteria:**
- [ ] Full workflow completes without errors
- [ ] No data loss during export/import round-trip
- [ ] Safari iOS works without IndexedDB issues
- [ ] Offline mode renders all marker types correctly
- [ ] No visual regressions compared to pre-feature state

---

## Manual Testing Checklist

### Test 1: Fresh Installation
- [ ] Clear all site data (IndexedDB, localStorage)
- [ ] Open SnapSpot
- [ ] Upload a map
- [ ] Verify "Photo Marker" and "Line Marker" built-in types exist in Settings
- [ ] Verify no errors in console

### Test 2: Existing Data Upgrade
- [ ] Open SnapSpot with existing data (maps, markers, photos, metadata)
- [ ] Verify all markers render correctly
- [ ] Verify built-in types present in Settings
- [ ] Verify existing metadata definitions and values intact

### Test 3: Full Custom Type Lifecycle
- [ ] Create a custom type → place markers → add photos → edit type color → verify all markers update → delete type with no markers → verify deletion succeeds

### Test 4: Built-in Protection
- [ ] Try to delete "Photo Marker" → should be blocked
- [ ] Edit "Photo Marker" → only color/size editable
- [ ] Verify shape is locked

### Test 5: Export/Import Round-trip
- [ ] Create map with custom types, markers, photos, metadata
- [ ] Export → import into new instance
- [ ] Verify all data intact

### Test 6: Backward Compatibility
- [ ] Import a v1.1 export → verify no errors
- [ ] Import a v1.2 export → verify metadata intact

### Test 7: Safari iOS
- [ ] Full workflow on iOS Safari
- [ ] Verify Base64 storage for images works
- [ ] Verify IndexedDB handles new store

### Test 8: Lint
- [ ] `npm run lint` shows 0 errors

### Test 9: Service Worker
- [ ] After deploy, hard refresh → verify new service worker activates
- [ ] Verify offline functionality works
