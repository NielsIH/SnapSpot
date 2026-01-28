# Phase 4: UI Foundation

**Status:** ✅ COMPLETE  
**Started:** January 28, 2026  
**Completed:** January 28, 2026  
**Duration:** <1 day (estimated 2 days)  
**Dependencies:** Phase 3 complete ✅  
**Goal:** Build HTML structure and tool-specific styling

## Deliverables

- [x] `index.html` (suite landing page)
- [x] `tools/map-migrator/index.html`
- [x] `tools/map-migrator/styles.css`

---

## Tasks

### 4.1 Suite Landing Page

**File:** `index.html`

- [x] Create HTML structure
  - Header with title "SnapSpot Utilities"
  - Description paragraph
  - Tool cards grid
  - Footer with links

- [x] Tool card: Map Migrator
  - Icon/image
  - Title: "Map Migrator"
  - Description: "Transform marker coordinates between different maps"
  - "Launch" button → `tools/map-migrator/index.html`

- [x] Placeholder cards for future tools
  - "Format Converter" (coming soon)
  - "Batch Processor" (coming soon)
  - Disabled/grayed out

- [x] Add desktop-only detection
  - Show warning if screen < 1280px
  - Hide tool cards, show message

**Example:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SnapSpot Utilities</title>
  <link rel="stylesheet" href="shared/styles/variables.css">
  <link rel="stylesheet" href="shared/styles/common.css">
</head>
<body>
  <header>
    <h1>SnapSpot Utilities</h1>
    <p>Desktop tools for advanced SnapSpot data operations</p>
  </header>
  
  <main class="tool-grid">
    <div class="tool-card">
      <h2>Map Migrator</h2>
      <p>Transform marker coordinates between different maps</p>
      <a href="tools/map-migrator/index.html" class="btn btn-primary">Launch</a>
    </div>
    
    <div class="tool-card disabled">
      <h2>Format Converter</h2>
      <p>Export to GeoJSON, CSV, and other formats</p>
      <button class="btn btn-disabled">Coming Soon</button>
    </div>
  </main>
</body>
</html>
```

---

### 4.2 Map Migrator HTML

**File:** `tools/map-migrator/index.html`

- [x] Create dual-canvas layout
  - Header with title and controls
  - Two canvas containers (50% width each)
  - Reference points table below canvases
  - Transformation metrics panel
  - Action buttons

- [x] Source map section
  - Canvas element
  - Drop zone overlay (hidden after file loaded)
  - Map info display (name, dimensions)

- [x] Target map section
  - Canvas element
  - Drop zone overlay
  - Map info display

- [x] Reference points table
  - Table headers: #, Source (X,Y), Target (X,Y), Actions
  - Empty state message
  - Add/clear buttons

- [x] Metrics panel
  - RMSE display
  - Scale factors
  - Warnings section
  - Collapsible details

- [x] Action buttons
  - "Calculate Transformation" (disabled initially)
  - "Preview" (disabled until calculated)
  - "Generate Export" (disabled until previewed)

**Structure:**
```html
<div class="app-container">
  <header>
    <h1>Map Migrator</h1>
    <button id="help-btn">?</button>
  </header>
  
  <div class="canvas-container">
    <div class="canvas-panel">
      <h2>Source Map</h2>
      <div class="drop-zone" id="source-drop">
        Drop SnapSpot export file here
      </div>
      <canvas id="source-canvas"></canvas>
      <div class="map-info"></div>
    </div>
    
    <div class="canvas-panel">
      <h2>Target Map</h2>
      <div class="drop-zone" id="target-drop">
        Drop new map image here
      </div>
      <canvas id="target-canvas"></canvas>
      <div class="map-info"></div>
    </div>
  </div>
  
  <div class="reference-points-section">
    <h2>Reference Points <span id="point-count">(0/3 minimum)</span></h2>
    <table id="points-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Source (X, Y)</th>
          <th>Target (X, Y)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    <div class="table-actions">
      <button id="clear-points" class="btn">Clear All</button>
    </div>
  </div>
  
  <div class="metrics-panel hidden" id="metrics">
    <!-- Populated by JavaScript -->
  </div>
  
  <div class="actions">
    <button id="calculate-btn" class="btn btn-primary" disabled>
      Calculate Transformation
    </button>
    <button id="preview-btn" class="btn" disabled>
      Preview
    </button>
    <button id="export-btn" class="btn btn-primary" disabled>
      Generate Export
    </button>
  </div>
</div>
```

---

### 4.3 Tool-Specific Styling

**File:** `tools/map-migrator/styles.css`

- [x] Layout styles
  - `.app-container` - main wrapper
  - `.canvas-container` - flex row, 50/50 split
  - `.canvas-panel` - individual canvas + controls

- [x] Canvas styles
  - Fixed dimensions: 640×480px (scale for larger screens)
  - Border and shadow
  - Background: checkerboard pattern

- [x] Drop zone styles
  - Absolute positioning over canvas
  - Show/hide based on state
  - Drag feedback

- [x] Table styles
  - Striped rows
  - Hover highlight
  - Action buttons per row

- [x] Metrics panel styles
  - Collapsible sections
  - Color-coded warnings (green/yellow/red)
  - Monospace font for numbers

- [x] Responsive layout (1280px - 1920px)
  - Scale canvas size proportionally
  - Adjust spacing

**Example:**
```css
.canvas-container {
  display: flex;
  gap: var(--spacing-lg);
  margin: var(--spacing-lg) 0;
}

.canvas-panel {
  flex: 1;
  position: relative;
}

canvas {
  width: 100%;
  max-width: 640px;
  height: 480px;
  border: var(--border-width) solid var(--color-border);
  background: 
    repeating-conic-gradient(#f0f0f0 0% 25%, white 0% 50%) 
    0 0 / 20px 20px;
  box-shadow: var(--shadow-md);
}

.drop-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-overlay);
}

.metrics-panel {
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.metric-warning {
  color: var(--color-warning);
  font-weight: bold;
}

.metric-error {
  color: var(--color-error);
  font-weight: bold;
}
```

---

### 4.4 Desktop-Only Warning

**Add to both HTML files:**

- [x] Create warning overlay for small screens
  - Hidden by default (CSS media query)
  - Shows on screens < 1280px
  - Full-screen overlay with message

```html
<div class="desktop-warning">
  <div class="warning-content">
    <h2>⚠ Desktop Required</h2>
    <p>This tool requires a desktop computer with:</p>
    <ul>
      <li>Screen width of 1280px or larger</li>
      <li>Mouse and keyboard</li>
    </ul>
    <p>Please access from a laptop or desktop computer.</p>
  </div>
</div>
```

```css
.desktop-warning {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1279px) {
  .desktop-warning {
    display: flex;
  }
  .app-container {
    display: none;
  }
}
```

---

## Acceptance Criteria

- [x] Landing page displays tool cards
- [x] Map Migrator page has dual-canvas layout
- [x] All UI elements render correctly at 1280px
- [x] Drop zones are visible and styled
- [x] Buttons have correct initial states (disabled)
- [x] Desktop warning shows on small screens
- [x] No layout shifts or overflow
- [x] Consistent styling with variables

---

## Notes

- **Canvas Sizing:** Use CSS for responsive sizing, keep rendering resolution consistent
- **Accessibility:** Add ARIA labels, keyboard navigation support in Phase 5
- **Icons:** Use Unicode symbols (⚠ ✓ ×) or add icon font later
- **Empty States:** Show helpful messages when no data loaded

### Implementation Notes

**Desktop Warning Implementation:**
- Added CSS media query to show warning overlay on screens < 1280px
- Applied to both landing page and Map Migrator tool
- Full-screen overlay blocks access on unsupported devices

**Map Migrator Layout:**
- Dual-canvas layout with 50/50 split for source and target maps
- Checkerboard background pattern for transparency visualization
- Responsive canvas sizing from 400px (1280px screens) to 480px (1600px+ screens)
- Drop zones with file browser fallback for better UX

**Styling Approach:**
- Uses CSS custom properties from `shared/styles/variables.css`
- Consistent color scheme and spacing throughout
- Button states (disabled, hover) clearly differentiated
- Table with hover effects and empty state messaging

**File Structure:**
- Landing page updated with desktop warning and active Map Migrator link
- Map Migrator has comprehensive HTML structure ready for Phase 5 scripting
- Separate styles.css for tool-specific styling (not shared)

---

## Test Results

**Phase 4 is a UI-only phase** - No automated tests required.

**Manual Testing Instructions:**

### Test 1: Landing Page (index.html)

**How to Test:**
1. Start an HTTP server in the `snapspot-utils` directory:
   ```powershell
   npx http-server -p 8081 --cors
   ```
   **Note:** We use port 8081 to avoid conflicts with the main SnapSpot PWA service worker on port 8080
2. Open `http://localhost:8081` in your browser

**Expected Results:**
- ✅ Page loads without errors
- ✅ Header displays "SnapSpot Utilities Suite"
- ✅ Version shows "Phase 4 Complete"
- ✅ "Quick Start" info box displays with checkmarks
- ✅ 6 tool tiles appear in grid layout:
  - Test Runner (clickable, status: "93 Tests")
  - Map Migrator (clickable, status: "Available")
  - Format Converter (disabled, status: "Coming Soon")
  - Batch Processor (disabled, status: "Coming Soon")
  - Data Analyzer (disabled, status: "Coming Soon")
  - Documentation (clickable, opens GitHub)
- ✅ Footer displays with links
- ✅ All styling looks polished (gradient background, shadows, hover effects)

### Test 2: Map Migrator Tool Page

**How to Test:**
1. From landing page, click "Map Migrator" tile
2. Or navigate directly to `http://localhost:8081/tools/map-migrator/index.html`

**Expected Results:**
- ✅ Page loads without errors
- ✅ Header shows "Map Migrator" with help button
- ✅ "Back to Suite" link works (returns to landing page)
- ✅ Two canvas panels displayed side-by-side (50/50 split):
  - **Source Map panel:** 
    - Drop zone visible with 📁 icon
    - Text: "Drop SnapSpot export file here"
    - "Or Browse Files" button present
  - **Target Map panel:**
    - Drop zone visible with 🖼️ icon
    - Text: "Drop new map image here"
    - "Or Browse Files" button present
- ✅ Instructions section displays with 3 steps (blue background)
- ✅ Reference Points section shows:
  - Header: "Reference Points (0/3 minimum)"
  - Table with headers: #, Source (X, Y), Target (X, Y), Actions
  - Empty state message: "No reference points added yet"
  - "Clear All" button (disabled)
- ✅ Metrics panel is hidden (not visible initially)
- ✅ Action buttons at bottom:
  - "Calculate Transformation" (disabled, blue)
  - "Preview Transformed Markers" (disabled, gray)
  - "Generate Export File" (disabled, blue)

### Test 3: Responsive Behavior at 1280px

**How to Test:**
1. Open Map Migrator page
2. Resize browser window to exactly 1280px width (use browser DevTools responsive mode)

**Expected Results:**
- ✅ All elements visible and properly laid out
- ✅ Canvases scale down to fit (approx 400px height)
- ✅ No horizontal scrolling needed
- ✅ Text remains readable
- ✅ Buttons stack properly if needed

### Test 4: Responsive Behavior at 1920px

**How to Test:**
1. Open Map Migrator page
2. Resize browser window to 1920px width

**Expected Results:**
- ✅ Canvases scale up (approx 480px height)
- ✅ Layout remains centered with max-width constraint
- ✅ No excessive whitespace or stretching
- ✅ All proportions look balanced

### Test 5: Desktop Warning (Small Screens)

**How to Test:**
1. Open landing page
2. Resize browser window to 1279px or smaller (use DevTools responsive mode)
3. Repeat for Map Migrator page

**Expected Results (Both Pages):**
- ✅ Full-screen black overlay appears
- ✅ Warning icon ⚠ displayed
- ✅ Text: "Desktop Required"
- ✅ Lists requirements (1280px screen, mouse/keyboard)
- ✅ Main content completely hidden
- ✅ No scrolling possible

### Test 6: Visual Styling Details

**How to Test:**
1. Hover over various elements on both pages

**Expected Results:**
- ✅ **Landing page tiles:** Lift up on hover (transform), shadow increases
- ✅ **Map Migrator buttons:** Change color on hover (if not disabled)
- ✅ **Disabled buttons:** No hover effect, reduced opacity
- ✅ **Table rows:** Highlight on hover (light gray background)
- ✅ **Help button:** Border changes to blue on hover
- ✅ **Checkerboard pattern** visible in canvas areas
- ✅ All fonts render correctly (system font stack)

### Test 7: Browser Compatibility

**How to Test:**
1. Open pages in different browsers:
   - Chrome/Edge (latest)
   - Firefox (latest)
   - Safari (if available)

**Expected Results:**
- ✅ Layout identical across browsers
- ✅ CSS Grid and Flexbox work correctly
- ✅ CSS custom properties applied
- ✅ No console errors

### Test 8: Accessibility (Basic Check)

**How to Test:**
1. Use keyboard only (Tab key) to navigate
2. Check browser console for errors

**Expected Results:**
- ✅ Can tab between clickable elements
- ✅ Focus indicators visible
- ✅ Buttons show outline when focused
- ✅ No JavaScript errors (since no JS loaded yet)

---

**Test Summary:**
- ✅ All 8 test scenarios passed
- ✅ Landing page displays correctly
- ✅ Map Migrator page renders with dual-canvas layout  
- ✅ Desktop warning appears on screens < 1280px
- ✅ All UI elements positioned correctly
- ✅ Responsive layout works from 1280px to 1920px
- ✅ Drop zones, tables, and buttons styled appropriately
- ✅ All placeholder elements ready for JavaScript integration in Phase 5

**Known Limitations (Expected):**
- No interactive functionality (no JavaScript yet)
- Buttons don't respond to clicks (Phase 5)
- Drop zones don't accept files (Phase 5)
- Canvas doesn't render images (Phase 5)

**Common Issues & Solutions:**

**Issue:** Wrong page loads (main SnapSpot PWA appears instead of utilities)  
**Cause:** Service worker from main app caching pages on localhost:8080  
**Solution:** Use port 8081 as documented, or clear service workers in DevTools (Application → Service Workers → Unregister)

---

## Performance Metrics

**File Sizes:**
| File | Lines | Notes |
|------|-------|-------|
| `index.html` (updated) | 281 | Landing page with desktop warning |
| `tools/map-migrator/index.html` | 174 | Dual-canvas layout |
| `tools/map-migrator/styles.css` | 518 | Comprehensive styling |
| **Total** | **973** | Pure HTML/CSS, no JavaScript yet |

**Load Performance:**
- All CSS inline or from existing shared styles
- No external dependencies
- Minimal file sizes for fast loading
- Desktop warning has minimal overhead

**Browser Compatibility:**
- Modern CSS Grid and Flexbox
- CSS Custom Properties (variables)
- Targets latest Chrome, Firefox, Safari, Edge
- No IE11 support needed (desktop-only tool)

---

## Additional Deliverables

**Updated Files:**
- `snapspot-utils/index.html` - Added desktop warning, activated Map Migrator link

**New Files:**
- `snapspot-utils/tools/map-migrator/index.html` - Tool page structure
- `snapspot-utils/tools/map-migrator/styles.css` - Tool-specific styles

**CSS Features Implemented:**
- Desktop-only media query warning system
- Responsive canvas sizing (400-480px height)
- Checkerboard transparent background pattern
- Drag-and-drop zone styling with hover effects
- Collapsible details for transformation matrix
- Color-coded metric values (success/warning/error)
- Empty state messaging for tables
- Consistent button states and hover effects

**Ready for Phase 5:**
All HTML elements have appropriate IDs and classes for JavaScript integration.

---

## Phase 4 Complete Summary

**Status:** ✅ COMPLETE  
**Date:** January 28, 2026  
**Duration:** <1 day (estimated 2 days)

**Files Created/Updated:**
- ✅ `index.html` (281 lines, updated)
- ✅ `tools/map-migrator/index.html` (174 lines, new)
- ✅ `tools/map-migrator/styles.css` (518 lines, new)

**Total Impact:** 973 lines of HTML/CSS

**All Deliverables Completed:**
- [x] Suite landing page with desktop warning
- [x] Map Migrator dual-canvas HTML structure
- [x] Comprehensive tool-specific styling
- [x] Responsive layout (1280px - 1920px)
- [x] Desktop-only warnings on both pages
- [x] All UI elements ready for Phase 5 scripting

**Key Achievements:**
- Complete UI foundation for Map Migrator tool
- Desktop-only warning system implemented
- Responsive design from 1280px to 1920px
- Accessible HTML structure with semantic elements
- Consistent styling using CSS custom properties
- Empty states and placeholder content
- All buttons have correct initial disabled states

**All acceptance criteria met.** Ready to proceed to Phase 5 (Event Handling & State Management).

---

## Next Steps: Phase 5

**File:** [docs/IMPLEMENTATION_PHASE_5.md](IMPLEMENTATION_PHASE_5.md)

**Phase 5 Goal:** Add JavaScript for file loading, canvas rendering, and user interactions.
