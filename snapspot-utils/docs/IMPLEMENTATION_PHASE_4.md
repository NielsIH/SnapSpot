# Phase 4: UI Foundation

**Estimated Duration:** 2 days  
**Dependencies:** Phase 3 complete  
**Goal:** Build HTML structure and tool-specific styling

## Deliverables

- `index.html` (suite landing page)
- `tools/map-migrator/index.html`
- `tools/map-migrator/styles.css`

---

## Tasks

### 4.1 Suite Landing Page

**File:** `index.html`

- [ ] Create HTML structure
  - Header with title "SnapSpot Utilities"
  - Description paragraph
  - Tool cards grid
  - Footer with links

- [ ] Tool card: Map Migrator
  - Icon/image
  - Title: "Map Migrator"
  - Description: "Transform marker coordinates between different maps"
  - "Launch" button → `tools/map-migrator/index.html`

- [ ] Placeholder cards for future tools
  - "Format Converter" (coming soon)
  - "Batch Processor" (coming soon)
  - Disabled/grayed out

- [ ] Add desktop-only detection
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

- [ ] Create dual-canvas layout
  - Header with title and controls
  - Two canvas containers (50% width each)
  - Reference points table below canvases
  - Transformation metrics panel
  - Action buttons

- [ ] Source map section
  - Canvas element
  - Drop zone overlay (hidden after file loaded)
  - Map info display (name, dimensions)

- [ ] Target map section
  - Canvas element
  - Drop zone overlay
  - Map info display

- [ ] Reference points table
  - Table headers: #, Source (X,Y), Target (X,Y), Actions
  - Empty state message
  - Add/clear buttons

- [ ] Metrics panel
  - RMSE display
  - Scale factors
  - Warnings section
  - Collapsible details

- [ ] Action buttons
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

- [ ] Layout styles
  - `.app-container` - main wrapper
  - `.canvas-container` - flex row, 50/50 split
  - `.canvas-panel` - individual canvas + controls

- [ ] Canvas styles
  - Fixed dimensions: 640×480px (scale for larger screens)
  - Border and shadow
  - Background: checkerboard pattern

- [ ] Drop zone styles
  - Absolute positioning over canvas
  - Show/hide based on state
  - Drag feedback

- [ ] Table styles
  - Striped rows
  - Hover highlight
  - Action buttons per row

- [ ] Metrics panel styles
  - Collapsible sections
  - Color-coded warnings (green/yellow/red)
  - Monospace font for numbers

- [ ] Responsive layout (1280px - 1920px)
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

- [ ] Create warning overlay for small screens
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

- [ ] Landing page displays tool cards
- [ ] Map Migrator page has dual-canvas layout
- [ ] All UI elements render correctly at 1280px
- [ ] Drop zones are visible and styled
- [ ] Buttons have correct initial states (disabled)
- [ ] Desktop warning shows on small screens
- [ ] No layout shifts or overflow
- [ ] Consistent styling with variables

---

## Notes

- **Canvas Sizing:** Use CSS for responsive sizing, keep rendering resolution consistent
- **Accessibility:** Add ARIA labels, keyboard navigation support in Phase 5
- **Icons:** Use Unicode symbols (⚠ ✓ ×) or add icon font later
- **Empty States:** Show helpful messages when no data loaded
