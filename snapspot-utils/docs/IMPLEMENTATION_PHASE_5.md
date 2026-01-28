# Phase 5: Migration Tool Logic

**Estimated Duration:** 3-4 days  
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

- [ ] Initialize UI controller class
  - Constructor: set up canvas renderers
  - State management object
  - Event listener setup

- [ ] Implement file loading handlers
  - `handleSourceFileDrop(file)` - Load SnapSpot export
  - `handleTargetFileDrop(file)` - Load map image
  - Show loading indicators
  - Update UI on success/error

- [ ] Render loaded content
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

- [ ] Implement click mode management
  - Track alternating clicks: source → target → source...
  - Update cursor and status text
  - Disable during preview mode

- [ ] Handle canvas click events
  - `handleSourceClick(event)` - Add source point
  - `handleTargetClick(event)` - Add target point
  - Convert screen coordinates to canvas coordinates
  - Render marker on canvas
  - Add pair to table when complete

- [ ] Implement marker rendering
  - Numbered circles (①②③...)
  - Color-coded by pair
  - Hover effects
  - Connection lines (optional)

- [ ] Update point table
  - Add row for each pair
  - Format coordinates: "(123, 456)"
  - Wire up delete buttons
  - Update count display

---

### 5.3 UI Controller - Point Management

**File:** `tools/map-migrator/ui-controller.js`

- [ ] Implement point deletion
  - `removePoint(index)` - Remove pair
  - Re-render both canvases
  - Update table
  - Renumber remaining points

- [ ] Implement clear all
  - Confirmation dialog
  - Clear state and UI
  - Reset button states

- [ ] Implement hover interactions
  - Highlight marker on table row hover
  - Highlight table row on marker hover
  - Show tooltip with coordinates

- [ ] Validate point count
  - Enable/disable "Calculate" button based on count ≥ 3
  - Show status message

---

### 5.4 Migrator - Transformation

**File:** `tools/map-migrator/migrator.js`

- [ ] Create `MapMigrator` class
  - Constructor: `(uiController)`
  - Reference to UI controller for state access

- [ ] Implement `calculateTransformation()`
  - Extract source/target points from pairs
  - Call `calculateAffineMatrix()` from Phase 1
  - Call `calculateRMSE()` and `detectAnomalies()`
  - Update state with matrix and metrics
  - Update UI with results

- [ ] Display transformation metrics
  - Render metrics panel
  - Show RMSE, scale, rotation, shear
  - Color-code warnings (green/yellow/red)
  - Show transformation type (translation/rotation/complex)

- [ ] Handle transformation errors
  - Collinear points
  - Degenerate matrix
  - Show error modal with recovery steps

---

### 5.5 Migrator - Preview

**File:** `tools/map-migrator/migrator.js`

- [ ] Implement `previewTransformation()`
  - Transform all source markers using matrix
  - Render transformed positions on target canvas
  - Show as semi-transparent overlay
  - Render error vectors for reference points

- [ ] Implement preview toggle
  - "Preview" button shows overlay
  - "Hide Preview" button clears overlay
  - Update button text and state

- [ ] Visual preview elements
  - Transformed markers: small red dots(50% opacity)
  - Reference point errors: red lines
  - Toggle: all markers vs reference only

---

### 5.6 Migrator - Export Generation

**File:** `tools/map-migrator/migrator.js`

- [ ] Implement `generateMigratedExport()`
  - Clone source export structure
  - Replace map object with target map
  - Transform all marker coordinates
  - Round and clamp coordinates to bounds
  - Update map ID and marker mapId references
  - Preserve all photos unchanged
  - Set metadata (timestamp, sourceApp)

- [ ] Call writer from Phase 2
  - `buildExport(map, markers, photos, options)`
  - Handle async operations
  - Show progress indicator for large files

- [ ] Implement file download
  - Create Blob from JSON string
  - Generate filename: `{name}_migrated_{timestamp}.json`
  - Trigger download via `<a>` element
  - Show success notification

- [ ] Handle export errors
  - Markers out of bounds (warn but allow with clamping)
  - File generation failure
  - Show error modal

---

### 5.7 Event Wiring

**File:** `tools/map-migrator/migrator.js`

- [ ] Wire all button click handlers
  - Calculate button → `calculateTransformation()`
  - Preview button → `previewTransformation()`
  - Export button → `generateMigratedExport()`
  - Clear points → `clearAllPoints()`

- [ ] Wire file input handlers
  - Source drop zone → `handleSourceFileDrop()`
  - Target drop zone → `handleTargetFileDrop()`
  - Alternative: file input elements

- [ ] Wire table interactions
  - Delete button per row → `removePoint(index)`
  - Row hover → `highlightMarker(index)`

- [ ] Update button states
  - Enable/disable based on workflow state
  - Show loading spinners during async ops

---

### 5.8 Keyboard Shortcuts

**File:** `tools/map-migrator/ui-controller.js`

- [ ] Implement keyboard handler
  - `Ctrl+O` → trigger source file input
  - `Ctrl+M` → trigger target file input
  - `Ctrl+Z` → remove last point pair
  - `Delete/Backspace` → remove selected pair
  - `Esc` → cancel current point placement
  - `Space` → calculate transformation
  - `Ctrl+P` → toggle preview
  - `Ctrl+S` → generate export (if ready)

- [ ] Add keyboard event listener
  - Prevent default for shortcuts
  - Show shortcut hints in UI

---

### 5.9 Error Handling & Validation

**File:** Both files

- [ ] File validation errors
  - Invalid JSON → Modal with details
  - Unsupported version → Upgrade message
  - Missing images → Error modal

- [ ] Transformation errors
  - < 3 points → Inline message
  - Collinear → Warning modal with suggestions
  - High RMSE → Warning, allow override

- [ ] Export warnings
  - Markers out of bounds → Confirmation dialog
  - Large file size → Progress indicator

- [ ] User confirmations
  - Clear all points
  - Override High RMSE warning
  - Proceed with clamped markers

---

### 5.10 Final Integration

**File:** `tools/map-migrator/index.html` (update)

- [ ] Add script imports
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

- [ ] Test full workflow
  - Load export → Load map → Select points → Calculate → Preview → Export
  - Verify each step enables next
  - Test error paths

---

## Acceptance Criteria

- [ ] Can load SnapSpot export and map image via drag-drop
- [ ] Can select 3+ reference point pairs by clicking
- [ ] Calculate button computes transformation correctly
- [ ] Metrics panel shows RMSE and warnings
- [ ] Preview button overlays transformed markers
- [ ] Export button generates valid SnapSpot export file
- [ ] All keyboard shortcuts work
- [ ] Error messages are clear and actionable
- [ ] Can complete full migration workflow without errors
- [ ] Performance: 1000 markers transform in <1s

---

## Notes

- **State Management:** Keep state in one place, update UI reactively
- **Coordinate Systems:** Be careful with screen vs canvas vs image coordinates
- **Memory:** Release object URLs and Blobs when done
- **UX:** Show loading states for all async operations
- **Testing:** Manual test with real SnapSpot exports