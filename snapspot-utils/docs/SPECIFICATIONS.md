# Technical Specifications - Map Migrator Tool

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Target Audience:** Developers

## Table of Contents

- [Overview](#overview)
- [File Format Specifications](#file-format-specifications)
- [Transformation Algorithm](#transformation-algorithm)
- [Module APIs](#module-apis)
- [UI Specifications](#ui-specifications)
- [Error Handling](#error-handling)
- [Performance Requirements](#performance-requirements)
- [Testing Requirements](#testing-requirements)

---

## Overview

The Map Migrator tool transforms marker coordinates from one SnapSpot map to another using affine transformation calculated from 3+ user-selected reference point pairs.

### Workflow

```
┌────────────────┐
│ Load Export    │
│ (JSON File)    │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Load Target    │
│ Map (Image)    │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Select 3+      │
│ Reference Pts  │ ◄─── Iterative: Add/Remove/Adjust
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Calculate      │
│ Transformation │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Preview        │
│ Results        │ ◄─── Review: Check RMSE, Visual Alignment
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Generate       │
│ Export File    │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Download JSON  │
│ (Import to     │
│  SnapSpot)     │
└────────────────┘
```

---

## File Format Specifications

### Input: SnapSpot Export File

**Format:** JSON  
**Version Support:** 1.1 (current SnapSpot version)  
**File Extension:** `.json`

**Structure:**
```json
{
  "version": "1.1",
  "type": "SnapSpotDataExport",
  "sourceApp": "SnapSpot PWA",
  "timestamp": "2026-01-28T10:30:00.000Z",
  "map": {
    "id": "map_1706439000000_abc123",
    "name": "Building Floor 1",
    "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
    "width": 1920,
    "height": 1080,
    "imageHash": "sha256_abc123...",
    "createdDate": "2026-01-15T08:00:00.000Z",
    "lastModified": "2026-01-20T14:30:00.000Z",
    "isActive": true
  },
  "markers": [
    {
      "id": "marker_1706440000000_xyz789",
      "mapId": "map_1706439000000_abc123",
      "x": 450,
      "y": 300,
      "createdDate": "2026-01-15T09:00:00.000Z",
      "lastModified": "2026-01-15T09:00:00.000Z",
      "description": "Fire extinguisher",
      "photoIds": ["photo_1706440100000_def456"]
    }
  ],
  "photos": [
    {
      "id": "photo_1706440100000_def456",
      "markerId": "marker_1706440000000_xyz789",
      "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
      "thumbnailData": "data:image/jpeg;base64,/9j/4AAQ...",
      "fileName": "IMG_1234.jpg",
      "fileType": "image/jpeg",
      "fileSize": 245678,
      "createdDate": "2026-01-15T09:00:00.000Z",
      "description": "Front view"
    }
  ]
}
```

**Validation Rules:**
- `version` must be "1.1"
- `type` must be "SnapSpotDataExport"
- `map.imageData` must be valid base64 data URI
- `map.width` and `map.height` must be positive integers
- All marker coordinates (`x`, `y`) must be within `[0, map.width]` and `[0, map.height]`
- All `photoIds` in markers must reference existing photo IDs
- All `markerId` in photos must reference existing marker IDs

---

### Input: Target Map Image

**Supported Formats:** JPEG, PNG, WebP, GIF, BMP, SVG  
**Maximum Size:** 50MB (browser memory constraint)  
**Maximum Dimensions:** 8192×8192px (canvas limit)

**Processing:**
1. Load via FileReader as data URL or Blob
2. Create `Image` object to get natural dimensions
3. Validate dimensions are within limits
4. Render to canvas for manipulation
5. Generate SHA-256 hash for export

---

### Output: Migrated SnapSpot Export File

**Format:** Same as input format (SnapSpot v1.1 export)

**Transformations Applied:**
1. **Map Object:**
   - Replace `imageData` with target map's base64
   - Update `width` and `height` to target dimensions
   - Generate new `imageHash` (SHA-256 of target image)
   - Generate new `id` (format: `map_<timestamp>_<random>`)
   - Update `name` (optional: append " - Migrated")
   - Set `lastModified` to current timestamp
   - Preserve `createdDate` from source

2. **Markers Array:**
   - Transform `x`, `y` coordinates using affine matrix
   - Round transformed coordinates to nearest integers
   - Clamp to target map bounds: `[0, targetWidth]` × `[0, targetHeight]`
   - Update `mapId` to new map ID
   - Preserve `id`, `description`, `photoIds`, `createdDate`
   - Update `lastModified` to current timestamp

3. **Photos Array:**
   - **No changes** - preserve all fields exactly
   - Photos remain linked via `markerId` (marker IDs unchanged)

4. **Metadata:**
   - Set `timestamp` to current time
   - Set `sourceApp` to "SnapSpot Map Migrator v1.0"
   - Preserve `version` and `type`

**File Naming Convention:**
```
{original-map-name}_migrated_{YYYYMMDD_HHMMSS}.json

Example: Building_Floor_1_migrated_20260128_103045.json
```

---

## Transformation Algorithm

### Affine Transformation Mathematics

**Transformation Equation:**
```
[x']   [a  b] [x]   [e]
[y'] = [c  d] [y] + [f]

Expanded:
x' = a*x + b*y + e
y' = c*x + d*y + f
```

**Matrix Representation:**
```
T = | a  b  e |
    | c  d  f |
    | 0  0  1 | (homogeneous coordinates)
```

**Parameters:**
- `a, d`: Scaling factors (X and Y)
- `b, c`: Shear/rotation components
- `e, f`: Translation offsets

---

### Least-Squares Solution

**Problem:** Given N point pairs (N ≥ 3), find transformation matrix.

**Input:**
```javascript
sourcePoints = [{x: x1, y: y1}, {x: x2, y: y2}, ..., {x: xN, y: yN}]
targetPoints = [{x: x1', y: y1'}, {x: x2', y: y2'}, ..., {x: xN', y: yN'}]
```

**System of Equations:**
For each point pair i:
```
x_i' = a*x_i + b*y_i + e
y_i' = c*x_i + d*y_i + f
```

**Matrix Form (for X coordinates):**
```
| x1 y1 1 |   | a |   | x1' |
| x2 y2 1 | × | b | = | x2' |
| ...     |   | e |   | ... |
| xN yN 1 |             | xN' |

A × X = B

Solution: X = (A^T × A)^(-1) × A^T × B  (normal equations)
```

**Repeat for Y coordinates** to solve for `[c, d, f]`.

**Implementation Strategy:**
```javascript
function calculateAffineMatrix(sourcePoints, targetPoints) {
  const N = sourcePoints.length
  if (N < 3) throw new Error('Minimum 3 point pairs required')
  
  // Build matrices for X coordinates
  const A = [] // N×3 matrix
  const Bx = [] // N×1 vector (target X)
  const By = [] // N×1 vector (target Y)
  
  for (let i = 0; i < N; i++) {
    A.push([sourcePoints[i].x, sourcePoints[i].y, 1])
    Bx.push(targetPoints[i].x)
    By.push(targetPoints[i].y)
  }
  
  // Solve A × [a,b,e]^T = Bx using normal equations
  const paramsX = solveNormalEquations(A, Bx) // [a, b, e]
  
  // Solve A × [c,d,f]^T = By
  const paramsY = solveNormalEquations(A, By) // [c, d, f]
  
  const matrix = {
    a: paramsX[0], b: paramsX[1], e: paramsX[2],
    c: paramsY[0], d: paramsY[1], f: paramsY[2]
  }
  
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  
  return {
    matrix,
    determinant,
    isDegenerate: Math.abs(determinant) < 1e-10
  }
}
```

**Normal Equations Solution:**
```javascript
function solveNormalEquations(A, B) {
  // A^T × A
  const AtA = multiplyMatrices(transpose(A), A) // 3×3
  
  // A^T × B
  const AtB = multiplyMatrixVector(transpose(A), B) // 3×1
  
  // Solve AtA × X = AtB via Gaussian elimination or Cholesky
  return solveLinearSystem(AtA, AtB) // [param1, param2, param3]
}
```

**Note:** Use existing linear algebra library or implement Gaussian elimination for 3×3 system.

---

### Transformation Application

**Point Transform:**
```javascript
function applyTransform(point, matrix) {
  const { a, b, c, d, e, f } = matrix
  return {
    x: a * point.x + b * point.y + e,
    y: c * point.x + d * point.y + f
  }
}
```

**Batch Transform (Optimized):**
```javascript
function batchTransform(points, matrix) {
  const { a, b, c, d, e, f } = matrix
  return points.map(p => ({
    x: a * p.x + b * p.y + e,
    y: c * p.x + d * p.y + f
  }))
}
```

**Inverse Transform:**
```javascript
function inverseTransform(matrix) {
  const { a, b, c, d, e, f } = matrix
  const det = a * d - b * c
  
  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is singular (not invertible)')
  }
  
  return {
    a: d / det,
    b: -b / det,
    c: -c / det,
    d: a / det,
    e: (b * f - d * e) / det,
    f: (c * e - a * f) / det
  }
}
```

---

### Validation Metrics

#### Root Mean Square Error (RMSE)

**Purpose:** Measure transformation accuracy using reference points.

**Formula:**
```
RMSE = sqrt(Σ(distance²) / N)

where distance = sqrt((x_i' - x_i_transformed)² + (y_i' - y_i_transformed)²)
```

**Implementation:**
```javascript
function calculateRMSE(referencePairs, matrix) {
  let sumSquaredError = 0
  
  for (const pair of referencePairs) {
    const transformed = applyTransform(pair.source, matrix)
    const dx = transformed.x - pair.target.x
    const dy = transformed.y - pair.target.y
    sumSquaredError += dx * dx + dy * dy
  }
  
  return Math.sqrt(sumSquaredError / referencePairs.length)
}
```

**Interpretation:**
- RMSE < 2 pixels: Excellent alignment
- RMSE 2-5 pixels: Good (typical for manual point selection)
- RMSE 5-10 pixels: Acceptable for low-precision maps
- RMSE > 10 pixels: **Warning** - Review reference points

---

#### Anomaly Detection

**Purpose:** Identify problematic transformations.

**Checks:**
```javascript
function detectAnomalies(matrix) {
  const { a, b, c, d } = matrix
  const det = a * d - b * c
  
  // Calculate scale factors
  const scaleX = Math.sqrt(a * a + c * c)
  const scaleY = Math.sqrt(b * b + d * d)
  
  // Calculate shear (dot product of basis vectors)
  const shear = Math.abs(a * b + c * d) / (scaleX * scaleY)
  
  return {
    hasNegativeDeterminant: det < 0, // Reflection (flipped)
    hasExtremeScale: scaleX > 5 || scaleY > 5 || scaleX < 0.2 || scaleY < 0.2,
    hasExtremeShear: shear > 0.5, // Angle between axes > 60°
    isDegenerate: Math.abs(det) < 1e-10, // Singular matrix
    scaleFactors: { x: scaleX, y: scaleY },
    shearFactor: shear,
    determinant: det
  }
}
```

**Warnings to User:**
- **Negative Determinant:** "Map appears flipped/mirrored"
- **Extreme Scale:** "Scale factor >5× or <0.2× detected - verify points"
- **Extreme Shear:** "Severe distortion detected - check reference points"
- **Degenerate:** "Cannot calculate transformation - points may be collinear"

---

#### Point Distribution Validation

**Purpose:** Ensure reference points are well-distributed.

**Check for Collinearity:**
```javascript
function validatePointDistribution(points) {
  if (points.length < 3) return { isValid: true }
  
  // Calculate convex hull area (or triangle area for 3 points)
  const area = calculateConvexHullArea(points)
  const bounds = getBoundingBox(points)
  const maxPossibleArea = bounds.width * bounds.height
  
  // If area is very small relative to bounding box, points are nearly collinear
  const areaRatio = area / maxPossibleArea
  
  return {
    isValid: areaRatio > 0.1, // At least 10% of bounding box
    warning: areaRatio < 0.1 ? 'Reference points are nearly collinear - add points further apart' : null,
    areaRatio
  }
}
```

---

## Module APIs

### Core: `affine-transform.js`

```javascript
/**
 * Calculate affine transformation matrix from point correspondences
 * @param {Array<{x: number, y: number}>} sourcePoints - Source coordinates (3+ points)
 * @param {Array<{x: number, y: number}>} targetPoints - Target coordinates (same count)
 * @returns {{matrix: Object, determinant: number, isDegenerate: boolean}}
 */
export function calculateAffineMatrix(sourcePoints, targetPoints)

/**
 * Apply transformation to a single point
 * @param {{x: number, y: number}} point - Point to transform
 * @param {Object} matrix - Transformation matrix {a,b,c,d,e,f}
 * @returns {{x: number, y: number}} Transformed point
 */
export function applyTransform(point, matrix)

/**
 * Apply transformation to array of points (optimized)
 * @param {Array<{x: number, y: number}>} points - Points to transform
 * @param {Object} matrix - Transformation matrix
 * @returns {Array<{x: number, y: number}>} Transformed points
 */
export function batchTransform(points, matrix)

/**
 * Calculate inverse transformation matrix
 * @param {Object} matrix - Original transformation matrix
 * @returns {Object} Inverse matrix
 * @throws {Error} If matrix is singular
 */
export function inverseTransform(matrix)
```

---

### Core: `transform-validator.js`

```javascript
/**
 * Calculate root mean square error of transformation
 * @param {Array<{source: {x,y}, target: {x,y}}>} referencePairs
 * @param {Object} matrix - Transformation matrix
 * @returns {number} RMSE in pixels
 */
export function calculateRMSE(referencePairs, matrix)

/**
 * Detect transformation anomalies
 * @param {Object} matrix - Transformation matrix
 * @returns {Object} Anomaly report with warnings
 */
export function detectAnomalies(matrix)

/**
 * Validate reference point distribution
 * @param {Array<{x: number, y: number}>} points
 * @returns {{isValid: boolean, warning: string|null}}
 */
export function validatePointDistribution(points)

/**
 * Suggest areas for additional reference points
 * @param {Array<{x,y}>} currentPoints - Existing reference points
 * @param {{width: number, height: number}} bounds - Map dimensions
 * @returns {Array<{x: number, y: number, reason: string}>} Suggested locations
 */
export function suggestAdditionalPoints(currentPoints, bounds)
```

---

### Formats: `snapspot/parser.js`

```javascript
/**
 * Parse SnapSpot export JSON file
 * @param {string} jsonString - Raw JSON content
 * @returns {Promise<{map: Object, markers: Array, photos: Array, metadata: Object}>}
 * @throws {Error} If invalid format or version
 */
export async function parseExport(jsonString)

/**
 * Extract and process map image
 * @param {Object} mapObject - Map from export
 * @returns {Promise<{blob: Blob, width: number, height: number, hash: string}>}
 */
export async function extractMapImage(mapObject)

/**
 * Convert base64 data URI to Blob
 * @param {string} dataUri - Data URI with base64
 * @returns {Blob}
 */
export function base64ToBlob(dataUri)
```

---

### Formats: `snapspot/writer.js`

```javascript
/**
 * Build SnapSpot export JSON
 * @param {Object} map - Map object with imageData
 * @param {Array} markers - Array of marker objects
 * @param {Array} photos - Array of photo objects
 * @param {Object} options - Export options
 * @returns {Promise<string>} JSON string
 */
export async function buildExport(map, markers, photos, options = {})

/**
 * Generate SHA-256 hash of image data
 * @param {Blob|string} imageData - Image blob or base64
 * @returns {Promise<string>} Hash string (hex)
 */
export async function generateMapHash(imageData)

/**
 * Convert Blob to base64 data URI
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} Data URI
 */
export async function blobToBase64(blob)

/**
 * Generate unique ID in SnapSpot format
 * @param {string} prefix - 'map', 'marker', or 'photo'
 * @returns {string} Formatted ID
 */
export function generateId(prefix)
```

---

### Formats: `snapspot/validator.js`

```javascript
/**
 * Validate SnapSpot export file structure
 * @param {Object} exportData - Parsed JSON
 * @returns {{isValid: boolean, errors: Array<string>}}
 */
export function validateExportFile(exportData)

/**
 * Check if version is supported
 * @param {string} version - Version string
 * @returns {boolean}
 */
export function isSupportedVersion(version)
```

---

### Tool: `migrator.js`

```javascript
/**
 * Main orchestrator for map migration tool
 */
class MapMigrator {
  constructor(uiController)
  
  async loadExportFile(file)
  async loadTargetMap(file)
  
  addReferencePair(sourcePoint, targetPoint)
  removeReferencePair(index)
  clearReferencePairs()
  
  calculateTransformation()
  previewTransformation()
  clearPreview()
  
  async generateMigratedExport(options)
  downloadExport(jsonString, filename)
}
```

---

### Tool: `ui-controller.js`

```javascript
/**
 * Manages canvas rendering and user interactions
 */
class UIController {
  constructor(sourceCanvasId, targetCanvasId)
  
  renderMap(canvas, imageBlob)
  renderMarker(canvas, point, label, color)
  renderConnectionLine(sourcePt, targetPt, color)
  
  enablePointSelection(mode)
  disablePointSelection()
  
  handleCanvasClick(event)
  handleMouseMove(event)
  handleMouseWheel(event)
  
  setZoom(level)
  setPan(offsetX, offsetY)
  resetView()
  
  showPreview(transformedPoints)
  hidePreview()
  
  updatePointList(pairs)
  highlightPair(index)
}
```

---

## UI Specifications

### Layout (1280px+ Screen)

```
┌─────────────────────────────────────────────────────────────┐
│ Header: SnapSpot Map Migrator                    [?] [⚙]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌────────────────────────┐  ┌────────────────────────┐      │
│ │   Source Map Canvas    │  │   Target Map Canvas    │      │
│ │                        │  │                        │      │
│ │  [Drag & Drop Export]  │  │  [Drag & Drop Image]   │      │
│ │                        │  │                        │      │
│ │      640 × 480px       │  │      640 × 480px       │      │
│ └────────────────────────┘  └────────────────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Reference Points (3/3 minimum)                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ #  Source (X, Y)    Target (X, Y)      Actions        │   │
│ │ 1  (120, 80)        (115, 85)          [Delete]       │   │
│ │ 2  (450, 100)       (445, 105)         [Delete]       │   │
│ │ 3  (200, 350)       (195, 360)         [Delete]       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ [Clear All] [Import Points] [Export Points]                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Transformation Metrics                                        │
│ RMSE: 2.3px   Scale: 0.98×0.99   Rotation: 1.2°  ✓ OK       │
│                                                               │
│ [Calculate Transform] [Preview] [Generate Export]            │
└─────────────────────────────────────────────────────────────┘
```

---

### Canvas Rendering

**Source Map Canvas:**
- Displays original map from export file
- Render existing markers (small dots in neutral color)
- Render reference point markers (numbered circles, highlight on hover)
- Pan/zoom controls (mouse wheel, middle-click drag)

**Target Map Canvas:**
- Displays new target map image
- Render reference point markers (numbered, matching source)
- Preview overlay: transformed marker positions (semi-transparent)
- Same pan/zoom controls

**Reference Point Markers:**
- Visual: Numbered circle (e.g., ①②③)
- Size: 24px diameter
- Color: Pair-specific (e.g., pair 1 = blue, pair 2 = green)
- Hover: Enlarge + show tooltip with exact coordinates
- Selected: Thicker border

**Connection Lines (Optional Enhancement):**
- Draw lines between corresponding reference points
- Fade in/out on hover for clarity

---

### Interaction Modes

#### Mode 1: Point Selection (Active by Default)

**Workflow:**
1. User clicks on source canvas → places marker #1 on source
2. Cursor changes, prompt shows: "Now click corresponding point on target map"
3. User clicks on target canvas → places marker #1 on target
4. Pair is complete, added to table
5. Repeat for additional pairs

**Visual Feedback:**
- Active canvas highlighted with border
- Cursor: crosshair when hovering over active canvas
- Status text: "Click on SOURCE map to place reference point #1"

#### Mode 2: Preview (After Calculation)

**Workflow:**
1. User clicks "Preview" button
2. All source markers transformed using calculated matrix
3. Rendered on target canvas as semi-transparent dots
4. Reference point errors shown as vectors (target - transformed)

**Visual Elements:**
- Transformed markers: Small red circles, 50% opacity
- Error vectors: Red lines from transformed to actual target point
- Toggle button: "Show All Markers" vs "Reference Points Only"

---

### Point Management Table

**Columns:**
- `#`: Sequential number (auto-generated)
- `Source (X, Y)`: Coordinates on source map
- `Target (X, Y)`: Coordinates on target map
- `Actions`: Delete button

**Interactions:**
- Click row → highlight corresponding markers on both canvases
- Hover row → highlight markers
- Delete button → remove pair, renumber remaining
- Drag row → reorder (optional enhancement)

**Buttons Below Table:**
- `Clear All`: Remove all reference pairs (confirmation dialog)
- `Import Points`: Load from saved JSON file
- `Export Points`: Save current pairs as JSON for reuse

---

### Transformation Metrics Panel

**Displayed After Calculation:**

```
┌─────────────────────────────────────────────────────────────┐
│ Transformation Quality                                       │
├─────────────────────────────────────────────────────────────┤
│ RMSE:          2.3 pixels          ✓ Excellent              │
│ Scale X:       0.98× (2% smaller)                            │
│ Scale Y:       0.99× (1% smaller)                            │
│ Rotation:      1.2° clockwise                                │
│ Shear:         0.05 (minimal)                                │
│ Determinant:   0.97 (positive)                               │
│                                                               │
│ Status: ✓ Transformation is suitable for migration          │
└─────────────────────────────────────────────────────────────┘
```

**Warning Example:**
```
│ RMSE:          12.5 pixels         ⚠ High Error              │
│ Warning: Large error detected. Consider adding more          │
│ reference points or verifying existing point accuracy.       │
```

---

### Button States

**Calculate Transform:**
- Disabled: < 3 reference pairs
- Enabled: 3+ pairs
- Loading: Shows spinner during calculation

**Preview:**
- Disabled: Transform not calculated yet
- Enabled: Transform ready
- Active: Preview showing (button text changes to "Hide Preview")

**Generate Export:**
- Disabled: No transform calculated OR warnings present without user confirmation
- Enabled: Valid transformation with acceptable metrics

---

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open export file |
| `Ctrl+M` | Open target map file |
| `Ctrl+S` | Generate export (if ready) |
| `Ctrl+Z` | Remove last reference pair |
| `Ctrl+P` | Toggle preview |
| `Delete` / `Backspace` | Remove selected reference pair |
| `Esc` | Cancel current point placement |
| `Space` | Calculate transformation |
| `1`-`9` | Select reference pair by number |
| `+` / `-` | Zoom in/out on active canvas |
| `Arrow Keys` | Pan active canvas |

---

### Responsive Behavior (Desktop Only)

**Minimum Width: 1280px**

At exactly 1280px:
- Canvas dimensions: 600×450px each
- Point table: Compact columns
- Metrics: Single line view

At 1920px:
- Canvas dimensions: 900×675px each
- Point table: Expanded with more spacing
- Metrics: Multi-line detailed view

**No Mobile Support:**
Display message on screens < 1280px:
```
┌─────────────────────────────────────────────┐
│ ⚠ Desktop Required                          │
│                                             │
│ The Map Migrator tool requires a desktop   │
│ computer with:                              │
│ - Screen width of 1280px or larger          │
│ - Mouse and keyboard                        │
│                                             │
│ Please access this tool from a laptop or    │
│ desktop computer.                           │
└─────────────────────────────────────────────┘
```

---

## Error Handling

### User-Facing Errors

**File Loading Errors:**
```javascript
{
  code: 'INVALID_EXPORT_FORMAT',
  message: 'File is not a valid SnapSpot export',
  recovery: 'Please select a .json file exported from SnapSpot'
}

{
  code: 'UNSUPPORTED_VERSION',
  message: 'Export version 1.0 is not supported',
  recovery: 'This tool requires SnapSpot export version 1.1 or later'
}

{
  code: 'INVALID_IMAGE_FORMAT',
  message: 'Target map must be an image file',
  recovery: 'Supported formats: JPEG, PNG, WebP, GIF, BMP, SVG'
}

{
  code: 'IMAGE_TOO_LARGE',
  message: 'Image exceeds 50MB size limit',
  recovery: 'Please compress the image or reduce dimensions'
}
```

**Transformation Errors:**
```javascript
{
  code: 'INSUFFICIENT_POINTS',
  message: 'Minimum 3 reference point pairs required',
  recovery: 'Add at least 3 corresponding points on both maps'
}

{
  code: 'COLLINEAR_POINTS',
  message: 'Reference points are nearly collinear',
  recovery: 'Add points that are spread across the map, not in a line'
}

{
  code: 'DEGENERATE_MATRIX',
  message: 'Cannot calculate transformation - points may overlap',
  recovery: 'Ensure reference points are distinct and well-distributed'
}

{
  code: 'HIGH_RMSE',
  message: 'Transformation error is high (RMSE: 15.2px)',
  recovery: 'Review reference point accuracy or add more points',
  allowOverride: true
}
```

**Export Generation Errors:**
```javascript
{
  code: 'MARKERS_OUT_OF_BOUNDS',
  message: '5 markers fall outside target map boundaries',
  recovery: 'Transformation may not be appropriate for this map',
  details: 'Markers will be clamped to map edges',
  allowOverride: true
}
```

---

### Error Display

**Modal Dialog for Critical Errors:**
```html
<div class="error-modal">
  <div class="error-icon">⚠</div>
  <h2>Invalid Export Format</h2>
  <p>File is not a valid SnapSpot export.</p>
  <p class="recovery">Please select a .json file exported from SnapSpot.</p>
  <button>OK</button>
</div>
```

**Toast Notification for Non-Critical:**
```html
<div class="toast warning">
  <span class="icon">⚠</span>
  <span class="message">Last reference pair removed</span>
</div>
```

**Inline Warning in Metrics Panel:**
```html
<div class="metric-warning">
  <span class="icon">⚠</span>
  <span>High RMSE detected (12.5px)</span>
  <button class="details-toggle">Show Details</button>
</div>
```

---

## Performance Requirements

### Target Metrics

| Operation | Target Time | Maximum Acceptable |
|-----------|-------------|-------------------|
| Load export file (5MB) | <200ms | 500ms |
| Parse JSON + validate | <100ms | 300ms |
| Load map image (10MB) | <500ms | 2s |
| Calculate transformation (3 points) | <5ms | 20ms |
| Calculate transformation (20 points) | <10ms | 50ms |
| Transform 1000 markers | <100ms | 300ms |
| Render canvas (both maps) | <100ms | 200ms |
| Generate export (1000 markers) | <500ms | 2s |
| Download file | Immediate | 100ms |

---

### Memory Constraints

**Maximum Supported:**
- Export file: 100MB (encoded JSON)
- Map images: 50MB each (source + target)
- Total markers: 50,000
- Total photos: 10,000

**Browser Memory Usage:**
- Keep <500MB total for smooth operation
- Release Blob URLs after use (`URL.revokeObjectURL`)
- Avoid keeping large data structures in memory unnecessarily

---

### Optimization Strategies

1. **Lazy Image Loading:**
   - Don't load all photo data during parsing
   - Only parse map and markers initially
   - Photos remain as base64 strings until export

2. **Canvas Rendering:**
   - Use offscreen canvas for transformations
   - Debounce pan/zoom render (100ms)
   - Clear and redraw only changed regions

3. **Transformation Caching:**
   - Cache transformation matrix after calculation
   - Only recalculate when reference points change
   - Batch transform markers in chunks of 1000

4. **File Download:**
   - Use `Blob` and `URL.createObjectURL` for large files
   - Avoid creating giant strings in memory

---

## Testing Requirements

### Unit Tests

**Core Transformation (`affine-transform.js`):**
```javascript
// Test cases
test('Identity transformation (same points)', () => {
  const points = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 0, y: 100}]
  const matrix = calculateAffineMatrix(points, points)
  expect(matrix.a).toBeCloseTo(1)
  expect(matrix.d).toBeCloseTo(1)
  expect(matrix.b).toBeCloseTo(0)
  expect(matrix.e).toBeCloseTo(0)
})

test('Pure translation', () => {
  const source = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 0, y: 100}]
  const target = [{x: 10, y: 20}, {x: 110, y: 20}, {x: 10, y: 120}]
  const matrix = calculateAffineMatrix(source, target)
  expect(matrix.e).toBeCloseTo(10)
  expect(matrix.f).toBeCloseTo(20)
})

test('Pure scaling', () => {
  const source = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 0, y: 100}]
  const target = [{x: 0, y: 0}, {x: 200, y: 0}, {x: 0, y: 200}]
  const matrix = calculateAffineMatrix(source, target)
  expect(matrix.a).toBeCloseTo(2)
  expect(matrix.d).toBeCloseTo(2)
})

test('90-degree rotation', () => {
  const source = [{x: 1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}]
  const target = [{x: 0, y: 1}, {x: 0, y: 0}, {x: -1, y: 0}]
  const matrix = calculateAffineMatrix(source, target)
  const transformed = applyTransform({x: 1, y: 0}, matrix)
  expect(transformed.x).toBeCloseTo(0)
  expect(transformed.y).toBeCloseTo(1)
})
```

---

### Integration Tests

**Parser + Writer Round-Trip:**
```javascript
test('Parse and write export preserves data', async () => {
  const originalJson = loadFixture('sample-export.json')
  const parsed = await parseExport(originalJson)
  const regenerated = await buildExport(parsed.map, parsed.markers, parsed.photos)
  const reparsed = await parseExport(regenerated)
  
  expect(reparsed.markers).toEqual(parsed.markers)
  expect(reparsed.photos).toEqual(parsed.photos)
})
```

**Transformation Pipeline:**
```javascript
test('Full migration preserves photo links', async () => {
  const exportData = loadFixture('export-with-photos.json')
  const parsed = await parseExport(exportData)
  
  const pairs = [
    {source: {x: 0, y: 0}, target: {x: 10, y: 10}},
    {source: {x: 100, y: 0}, target: {x: 110, y: 10}},
    {source: {x: 0, y: 100}, target: {x: 10, y: 110}}
  ]
  
  const matrix = calculateAffineMatrix(
    pairs.map(p => p.source),
    pairs.map(p => p.target)
  )
  
  const transformedMarkers = parsed.markers.map(m => ({
    ...m,
    ...applyTransform({x: m.x, y: m.y}, matrix)
  }))
  
  // Verify all photo links intact
  const photoIds = parsed.photos.map(p => p.id)
  transformedMarkers.forEach(m => {
    m.photoIds.forEach(id => {
      expect(photoIds).toContain(id)
    })
  })
})
```

---

### Manual Testing Scenarios

**Scenario 1: Resolution Upgrade**
- Source: Low-res scan (1000×800px)
- Target: High-res scan (2000×1600px) of same map
- Expected: Pure 2× scaling transformation

**Scenario 2: Rotated Map**
- Source: Portrait orientation
- Target: Same map rotated 90° to landscape
- Expected: Rotation + potential translation

**Scenario 3: Different Maps**
- Source: Old floor plan
- Target: Updated floor plan (walls moved, rooms resized)
- Expected: Complex transformation, higher RMSE in changed areas

**Scenario 4: Edge Cases**
- 3 points (minimum)
- 20 points (overdetermined system)
- Collinear points (should warn)
- Points outside map bounds (should error)

**Scenario 5: Large Data**
- Export with 5000 markers
- Export with 100 photos (large file)
- 4K map image (3840×2160px)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Initial | Created technical specifications |

