# Phase 3: Shared Utilities

**Estimated Duration:** 1-2 days  
**Dependencies:** None (can run parallel with Phases 1-2)  
**Goal:** Build reusable components for all tools

## Deliverables

- `shared/utils/canvas-helpers.js`
- `shared/utils/file-loader.js`
- `shared/styles/variables.css`
- `shared/styles/common.css`

---

## Tasks

### 3.1 Canvas Helpers

**File:** `shared/utils/canvas-helpers.js`

- [ ] Implement `CanvasRenderer` class
  - Constructor: `(canvasElement)`
  - State: `{zoom, pan, rotation}`
  - Methods:
    - `renderImage(imageBlob,fit = 'contain')`
    - `screenToCanvas(screenX, screenY)` → canvas coordinates
    - `canvasToScreen(canvasX, canvasY)` → screen coordinates
    - `setZoom(level, centerX, centerY)`
    - `setPan(offsetX, offsetY)`
    - `resetView()`
    - `clear()`

- [ ] Implement pan/zoom interaction handlers
  - `enablePanZoom()` - Add event listeners
  - `disablePanZoom()` - Remove listeners
  - Mouse wheel for zoom
  - Middle-click drag for pan
  - Prevent default browser zoom

- [ ] Implement marker rendering
  - `drawMarker(x, y, options)` - Draw numbered circle
  - `drawLine(x1, y1, x2, y2, options)` - Draw connection line
  - `highlightMarker(x, y)` - Highlight on hover

**Options:**
```javascript
{
  color: '#ff0000',
  size: 24,
  label: '1',
  opacity: 1.0
}
```

**Testing:**
- Manual test: Render image, pan, zoom, draw markers
- Verify coordinate transformations

---

### 3.2 File Loader Utility

**File:** `shared/utils/file-loader.js`

- [ ] Implement `FileLoader` class with methods:
  - `loadAsText(file)` → Promise<string>
  - `loadAsDataURL(file)` → Promise<string>
  - `loadAsBlob(file)` → Promise<Blob>
  - `loadAsImage(file)` → Promise<{image: Image, width, height}>
  - `validateFileType(file, allowedTypes)` → boolean

- [ ] Implement drag-drop zone helper
  - `createDropZone(element, onFileDrop)` - Add drop handlers
  - Prevent default drag behaviors
  - Visual feedback (highlight on dragover)

- [ ] Implement file validation
  - Check file size limits
  - Check MIME types
  - Return validation errors

**Testing:**
```javascript
// Load JSON file
json = await FileLoader.loadAsText(jsonFile)
expect(JSON.parse(json)).toBeDefined()

// Load image
img = await FileLoader.loadAsImage(imageFile)
expect(img.width > 0)
```

---

### 3.3 CSS Variables

**File:** `shared/styles/variables.css`

Define design tokens borrowed from SnapSpot:

```css
:root {
  /* Colors */
  --color-primary: #2196F3;
  --color-success: #4CAF50;
  --color-warning: #FF9800;
  --color-error: #F44336;
  --color-text: #212121;
  --color-text-secondary: #757575;
  --color-background: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-border: #E0E0E0;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 2px 6px rgba(0,0,0,0.16);
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.20);
  
  /* Borders */
  --border-radius: 4px;
  --border-width: 1px;
  
  /* Z-index */
  --z-canvas: 1;
  --z-overlay: 10;
  --z-modal: 100;
}
```

---

### 3.4 Common Components CSS

**File:** `shared/styles/common.css`

- [ ] Reset and base styles
  - Box-sizing, margins, padding
  - Font family and size

- [ ] Button components
  - `.btn`, `.btn-primary`, `.btn-secondary`
  - `.btn-danger`, `.btn-disabled`
  - Hover and active states

- [ ] Input components
  - `.input`, `.input-file`
  - Focus styles

- [ ] Card/panel components
  - `.card`, `.card-header`, `.card-body`

- [ ] Table components
  - `.table`, `.table-row`, `.table-cell`
  - Hover and selected states

- [ ] Modal/dialog components
  - `.modal-backdrop`, `.modal`, `.modal-header`

- [ ] Utility classes
  - `.hidden`, `.text-center`, `.mt-md`, `.mb-lg`
  - `.flex`, `.flex-column`, `.gap-md`

**Example:**
```css
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### 3.5 Drop Zone Styling

**File:** `shared/styles/common.css` (add)

- [ ] Implement `.drop-zone` styles
  - Dashed border
  - Background color on dragover
  - Centered text and icon
  - Minimum height: 200px

```css
.drop-zone {
  border: 2px dashed var(--color-border);
  background: var(--color-background);
  padding: var(--spacing-xl);
  text-align: center;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.drop-zone.dragover {
  border-color: var(--color-primary);
  background: rgba(33, 150, 243, 0.05);
}
```

---

## Acceptance Criteria

- [ ] Canvas can render images with pan/zoom
- [ ] File loader handles JSON and images correctly
- [ ] Drag-drop zones provide visual feedback
- [ ] CSS variables match SnapSpot design
- [ ] Common components are reusable and consistent
- [ ] No console errors during interactions

---

## Notes

- **Canvas Performance:** Use `requestAnimationFrame` for smooth pan/zoom
- **Touch Events:** Not needed (desktop-only), but don't prevent if present
- **File Size Limits:** Show user-friendly errors for oversized files
- **CSS Consistency:** Match SnapSpot's visual language closely
