# Phase 5: Migration Tool Logic

**Status:** 🔄 IMPLEMENTATION COMPLETE - TESTING PENDING
**Started:** January 28, 2026
**Completed:** TBD (implementation done, awaiting manual testing)
**Duration:** <1 day implementation (estimated 3-4 days)
**Dependencies:** Phases 1, 2, 4 complete  
**Goal:** Implement tool orchestration and user interactions

## Deliverables

- `tools/map-migrator/migrator.js`
- `tools/map-migrator/ui-controller.js`
- Fully functional migration tool

---

## Tasks

### 5.1 UI Controller - File Loading

**File:** `tools/map-migrator/ui-controller.js`

- [x] Initialize UI controller class
  - Constructor: set up canvas renderers
  - State management object
  - Event listener setup

- [x] Implement file loading handlers
  - `handleSourceFileDrop(file)` - Load SnapSpot export
  - `handleTargetFileDrop(file)` - Load map image
  - Show loading indicators
  - Update UI on success/error

- [x] Render loaded content
  - Display source map on canvas
  - Display target map on canvas
  - Show map metadata (name, dimensions)
  - Hide drop zones after load

**State:**
```javascript
const state = {
  sourceExport: null,
  sourceMap: { blob, width, height },
  targetMap: { blob, width, height },
  referencePairs: [],
  transformMatrix: null,
  previewActive: false
}
```

---

### 5.2 UI Controller - Point Selection

**File:** `tools/map-migrator/ui-controller.js`

- [x] Implement click mode management
  - Track alternating clicks: source → target → source...
  - Update cursor and status text
  - Disable during preview mode

- [x] Handle canvas click events
  - `handleSourceClick(event)` - Add source point
  - `handleTargetClick(event)` - Add target point
  - Convert screen coordinates to canvas coordinates
  - Render marker on canvas
  - Add pair to table when complete

- [x] Implement marker rendering
  - Numbered circles (①②③...)
  - Color-coded by pair
  - Hover effects
  - Connection lines (optional)

- [x] Update point table
  - Add row for each pair
  - Format coordinates: "(123, 456)"
  - Wire up delete buttons
  - Update count display

---

### 5.3 UI Controller - Point Management

**File:** `tools/map-migrator/ui-controller.js`

- [x] Implement point deletion
  - `removePoint(index)` - Remove pair
  - Re-render both canvases
  - Update table
  - Renumber remaining points

- [x] Implement clear all
  - Confirmation dialog
  - Clear state and UI
  - Reset button states

- [x] Implement hover interactions
  - Highlight marker on table row hover
  - Highlight table row on marker hover
  - Show tooltip with coordinates

- [x] Validate point count
  - Enable/disable "Calculate" button based on count ≥ 3
  - Show status message

---

### 5.4 Migrator - Transformation

**File:** `tools/map-migrator/migrator.js`

- [x] Create `MapMigrator` class
  - Constructor: `(uiController)`
  - Reference to UI controller for state access

- [x] Implement `calculateTransformation()`
  - Extract source/target points from pairs
  - Call `calculateAffineMatrix()` from Phase 1
  - Call `calculateRMSE()` and `detectAnomalies()`
  - Update state with matrix and metrics
  - Update UI with results

- [x] Display transformation metrics
  - Render metrics panel
  - Show RMSE, scale, rotation, shear
  - Color-code warnings (green/yellow/red)
  - Show transformation type (translation/rotation/complex)

- [x] Handle transformation errors
  - Collinear points
  - Degenerate matrix
  - Show error modal with recovery steps

---

### 5.5 Migrator - Preview

**File:** `tools/map-migrator/migrator.js`

- [x] Implement `previewTransformation()`
  - Transform all source markers using matrix
  - Render transformed positions on target canvas
  - Show as semi-transparent overlay
  - Render error vectors for reference points

- [x] Implement preview toggle
  - "Preview" button shows overlay
  - "Hide Preview" button clears overlay
  - Update button text and state

- [x] Visual preview elements
  - Transformed markers: small red dots(50% opacity)
  - Reference point errors: red lines
  - Toggle: all markers vs reference only

---

### 5.6 Migrator - Export Generation

**File:** `tools/map-migrator/migrator.js`

- [x] Implement `generateMigratedExport()`
  - Clone source export structure
  - Replace map object with target map
  - Transform all marker coordinates
  - Round and clamp coordinates to bounds
  - Update map ID and marker mapId references
  - Preserve all photos unchanged
  - Set metadata (timestamp, sourceApp)

- [x] Call writer from Phase 2
  - `buildExport(map, markers, photos, options)`
  - Handle async operations
  - Show progress indicator for large files

- [x] Implement file download
  - Create Blob from JSON string
  - Generate filename: `{name}_migrated_{timestamp}.json`
  - Trigger download via `<a>` element
  - Show success notification

- [x] Handle export errors
  - Markers out of bounds (warn but allow with clamping)
  - File generation failure
  - Show error modal

---

### 5.7 Event Wiring

**File:** `tools/map-migrator/migrator.js`

- [x] Wire all button click handlers
  - Calculate button → `calculateTransformation()`
  - Preview button → `previewTransformation()`
  - Export button → `generateMigratedExport()`
  - Clear points → `clearAllPoints()`

- [x] Wire file input handlers
  - Source drop zone → `handleSourceFileDrop()`
  - Target drop zone → `handleTargetFileDrop()`
  - Alternative: file input elements

- [x] Wire table interactions
  - Delete button per row → `removePoint(index)`
  - Row hover → `highlightMarker(index)`

- [x] Update button states
  - Enable/disable based on workflow state
  - Show loading spinners during async ops

---

### 5.8 Keyboard Shortcuts

**File:** `tools/map-migrator/ui-controller.js`

- [x] Implement keyboard handler
  - `Ctrl+O` → trigger source file input
  - `Ctrl+M` → trigger target file input
  - `Ctrl+Z` → remove last point pair
  - `Delete/Backspace` → remove selected pair
  - `Esc` → cancel current point placement
  - `Space` → calculate transformation
  - `Ctrl+P` → toggle preview
  - `Ctrl+S` → generate export (if ready)

- [x] Add keyboard event listener
  - Prevent default for shortcuts
  - Show shortcut hints in UI

---

### 5.9 Error Handling & Validation

**File:** Both files

- [x] File validation errors
  - Invalid JSON → Modal with details
  - Unsupported version → Upgrade message
  - Missing images → Error modal

- [x] Transformation errors
  - < 3 points → Inline message
  - Collinear → Warning modal with suggestions
  - High RMSE → Warning, allow override

- [x] Export warnings
  - Markers out of bounds → Confirmation dialog
  - Large file size → Progress indicator

- [x] User confirmations
  - Clear all points
  - Override High RMSE warning
  - Proceed with clamped markers

---

### 5.10 Final Integration

**File:** `tools/map-migrator/index.html` (update)

- [x] Add script imports
  ```html
  <script type="module">
    import { MapMigrator } from './migrator.js'
    import { UIController } from './ui-controller.js'
    
    const ui = new UIController('source-canvas', 'target-canvas')
    const migrator = new MapMigrator(ui)
    
    // Initialize
    migrator.init()
  </script>
  ```

- [ ] **USER ACTION REQUIRED:** Test full workflow manually (see Test Results section below)
  - Load export → Load map → Select points → Calculate → Preview → Export
  - Verify each step enables next
  - Test error paths

---

## Acceptance Criteria

- [ ] **TO TEST:** Can load SnapSpot export and map image via drag-drop
- [ ] **TO TEST:** Can select 3+ reference point pairs by clicking
- [ ] **TO TEST:** Calculate button computes transformation correctly
- [ ] **TO TEST:** Metrics panel shows RMSE and warnings
- [ ] **TO TEST:** Preview button overlays transformed markers
- [ ] **TO TEST:** Export button generates valid SnapSpot export file
- [ ] **TO TEST:** All keyboard shortcuts work
- [ ] **TO TEST:** Error messages are clear and actionable
- [ ] **TO TEST:** Can complete full migration workflow without errors
- [ ] **TO TEST:** Performance: 1000 markers transform in <1s

---

## Notes

- **State Management:** Keep state in one place, update UI reactively
- **Coordinate Systems:** Be careful with screen vs canvas vs image coordinates
- **Memory:** Release object URLs and Blobs when done
- **UX:** Show loading states for all async operations
- **Testing:** Manual test with real SnapSpot exports

---

## Test Results

### Manual Testing Instructions

**⚠️ USER ACTION REQUIRED: Complete manual testing before marking Phase 5 as complete**

Phase 5 is a UI integration phase requiring manual testing. Follow all test scenarios below and check off each item as you verify it works correctly.

---

**Test 1: File Loading**

**How to Test:**
1. Open `tools/map-migrator/index.html` in browser
2. Drag a SnapSpot export JSON file to left panel
3. Drag a map image file to right panel

**Expected Results:**
- [ ] Both files load without errors
- [ ] Canvas displays rendered maps
- [ ] Info panels show correct metadata
- [ ] Drop zones hide after successful load
- [ ] Loading indicators appear during file processing

---

**Test 2: Point Selection**

**How to Test:**
1. Load both files (as in Test 1)
2. Click on source map
3. Click on corresponding location in target map
4. Repeat to create 3+ pairs

**Expected Results:**
- [ ] Cursor changes to crosshair on active canvas
- [ ] Cursor shows "not-allowed" on inactive canvas
- [ ] Points render as numbered colored circles
- [ ] Table updates with coordinate pairs
- [ ] Point count updates correctly
- [ ] Calculate button enables at 3+ pairs

---

**Test 3: Point Management**

**How to Test:**
1. Create several point pairs
2. Click delete (×) on a table row
3. Click "Clear All" button
4. Test keyboard shortcuts (Ctrl+Z, Delete, Esc)

**Expected Results:**
- [ ] Individual delete removes correct pair
- [ ] Clear All shows confirmation dialog
- [ ] All canvases re-render after deletion
- [ ] Point numbers update correctly
- [ ] Keyboard shortcuts work as expected
- [ ] Esc cancels pending source point

---

**Test 4: Transformation Calculation**

**How to Test:**
1. Create 3+ point pairs
2. Click "Calculate Transformation"
3. Review displayed metrics

**Expected Results:**
- [ ] Metrics panel appears
- [ ] RMSE value displays with color coding
- [ ] Scale, rotation metrics shown
- [ ] Transformation matrix displays (in details)
- [ ] Warnings appear for high RMSE or anomalies
- [ ] Preview and Export buttons enable

---

**Test 5: Preview Functionality**

**How to Test:**
1. Calculate transformation
2. Click "Preview Transformed Markers"
3. Observe target canvas
4. Click button again to hide preview

**Expected Results:**
- [ ] Red semi-transparent dots appear on target canvas
- [ ] Error vectors show for reference points
- [ ] Button text changes to "Hide Preview"
- [ ] Preview toggles on/off correctly
- [ ] Point selection disabled during preview

---

**Test 6: Export Generation**

**How to Test:**
1. Calculate transformation
2. Click "Generate Export File"
3. Check downloaded file

**Expected Results:**
- [ ] File downloads with correct naming pattern
- [ ] File contains valid JSON
- [ ] All markers have transformed coordinates
- [ ] Photos preserved from source
- [ ] Map object uses target map image
- [ ] Success notification appears

---

**Test 7: Out-of-Bounds Markers**

**How to Test:**
1. Use transformation that moves markers outside target bounds
2. Attempt to generate export

**Expected Results:**
- [ ] Confirmation dialog warns about clamped markers
- [ ] User can proceed or cancel
- [ ] Exported markers clamped to valid coordinates

---

**Test 8: Keyboard Shortcuts**

**How to Test:**
Try all documented shortcuts:
- Ctrl+O (load source)
- Ctrl+M (load target)
- Ctrl+Z (undo last point)
- Delete/Backspace (remove point)
- Esc (cancel pending)
- Space (calculate)
- Ctrl+P (preview toggle)
- Ctrl+S (export)

**Expected Results:**
- [ ] All shortcuts work as documented
- [ ] Shortcuts respect current state
- [ ] Default browser actions prevented
- [ ] Help modal shows shortcut list

---

**Test 9: Error Handling**

**How to Test:**
1. Try loading invalid JSON file
2. Try loading non-image file as map
3. Try calculating with < 3 points
4. Try selecting points before loading files

**Expected Results:**
- [ ] Clear error messages displayed
- [ ] Invalid files rejected with explanation
- [ ] UI remains functional after errors
- [ ] No console errors

---

**Test 10: Help Modal**

**How to Test:**
1. Click help button (?)
2. Read instructions
3. Close modal

**Expected Results:**
- [ ] Modal displays with complete instructions
- [ ] All steps clearly explained
- [ ] Keyboard shortcuts listed
- [ ] Modal closes properly

---

**Test Summary:**
- [ ] All 10 test scenarios completed
- [ ] Document any issues found
- [ ] Verify full workflow functional
- [ ] Confirm all features working

### Linting
- ✅ `npm run lint` shows 0 errors for map-migrator files
- Note: Pre-existing linting errors in earlier phases not addressed in Phase 5

---

## Performance Metrics

**⚠️ TO BE MEASURED DURING TESTING**

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| File loading (5MB export) | < 2s | TBD | ⏳ |
| Point pair creation | Instant | TBD | ⏳ |
| Calculate transformation (10 points) | < 100ms | TBD | ⏳ |
| Transform 1000 markers | < 1s | TBD | ⏳ |
| Preview rendering | < 200ms | TBD | ⏳ |
| Export generation (1000 markers) | < 3s | TBD | ⏳ |

---

## Additional Deliverables

**Files Created:**
- `tools/map-migrator/ui-controller.js` (832 lines)
- `tools/map-migrator/migrator.js` (443 lines)
- Updated `tools/map-migrator/index.html` (+50 lines)
- Updated `tools/map-migrator/styles.css` (+70 lines)

**Total Lines of Code Added:** ~1,395 lines

**Features Implemented:**
- Dual-canvas file loading system
- Interactive point selection with visual feedback
- Affine transformation calculation with metrics
- Live preview of transformed markers
- Export file generation with validation
- Comprehensive keyboard shortcuts
- Error handling and user confirmations
- Help modal with instructions

---

## Phase 5 Implementation Summary

**Status:** 🔄 IMPLEMENTATION COMPLETE - AWAITING USER TESTING  
**Date:** January 28, 2026  
**Files Created:** 2 new JavaScript files, 2 updated files  
**Total Lines of Code:** ~1,395 lines  

**Implementation Complete:**
- ✅ All code written and linting clean
- ✅ All features implemented
- ✅ All keyboard shortcuts coded
- ✅ Error handling in place

**Still Required:**
- ⏳ User must complete manual testing (see Test Results section above)
- ⏳ User must verify all 10 test scenarios
- ⏳ User must measure performance metrics
- ⏳ User must mark Phase 5 as complete after successful testing

**To Complete Phase 5:**
1. Follow all test scenarios in "Test Results" section
2. Check off each expected result as you verify it
3. Fill in actual performance metrics
4. Document any issues found
5. Once all tests pass, update status to ✅ COMPLETE

---

## Next Steps: Phase 6

**Phase 6: Testing & Polish**

With Phase 5 complete, the Map Migrator tool is fully functional. Phase 6 will focus on:
- Comprehensive testing with real SnapSpot exports
- Bug fixes and edge case handling
- User documentation and guide
- Performance optimization
- Final polish and refinements

See [IMPLEMENTATION_PHASE_6.md](IMPLEMENTATION_PHASE_6.md) for details.