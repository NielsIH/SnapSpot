# SnapSpot Utilities Suite - Architecture & Design Decisions

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Status:** Planning & Design Phase

## Table of Contents

- [Executive Summary](#executive-summary)
- [Design Decisions](#design-decisions)
- [Architecture Overview](#architecture-overview)
- [Module Specifications](#module-specifications)
- [Dependencies & Constraints](#dependencies--constraints)
- [Security & Privacy](#security--privacy)
- [Future Extensibility](#future-extensibility)

---

## Executive Summary

The SnapSpot Utilities Suite is a collection of desktop-focused browser-based tools for advanced SnapSpot data operations. The first tool, **Map Migrator**, enables coordinate transformation of markers between different map images using affine transformation based on user-selected reference points.

### Key Characteristics

- **Desktop-First:** Optimized for 1280px+ screens with keyboard/mouse input
- **Modular Architecture:** Clean separation between transformation logic, format handling, and UI
- **Privacy-Focused:** All processing in-browser, no server uploads
- **Extensible:** Designed to support future tools (format converters, batch processors, analyzers)
- **Standalone:** Separate from main SnapSpot PWA, used offline on workstations

---

## Design Decisions

### D1: Standalone Suite vs SnapSpot Integration

**Decision:** Build as separate utility suite, not integrated into main SnapSpot PWA.

**Rationale:**
- Migration is a rare, desktop-oriented workflow unsuitable for field use on mobile
- Keeps main SnapSpot app lean and focused on core functionality
- Allows specialized UI/UX for power users without mobile compromises
- Easier to test transformation logic in isolation
- Users can access utilities only when needed, reducing cognitive load in main app

**Trade-offs:**
- Users must manage separate tool (minor inconvenience)
- Cannot directly manipulate maps in SnapSpot storage (must export→transform→import)
- Duplicate code for file parsing (mitigated by shared format modules)

**Alternatives Considered:**
- Integrate as SnapSpot feature: Rejected due to mobile UI complexity and infrequent use
- Server-based tool: Rejected to maintain privacy and offline-first principles

---

### D2: Desktop-Only UI (No Responsive Design)

**Decision:** Target 1280px+ screens exclusively, no mobile/tablet support.

**Rationale:**
- Map migration requires side-by-side comparison (dual canvas layout)
- Precision clicking on reference points needs mouse accuracy
- Keyboard shortcuts significantly improve workflow efficiency
- Development cost savings: no responsive breakpoints, touch handlers, or gesture detection
- User context: Migration done on workstations, not in field

**Minimum Requirements:**
- Screen width: 1280px
- Input: Mouse + keyboard
- Browser: Modern desktop browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

**Implications:**
- Explicitly show "desktop-only" warning in documentation
- No touch event handlers required
- Can use hover states liberally
- CSS can use fixed layouts instead of complex flexbox/grid

---

### D3: Modular Architecture with Pluggable Formats

**Decision:** Separate transformation core from format-specific I/O handlers.

**Rationale:**
- Enables future support for other formats (GeoJSON, CSV, KML, other mapping apps)
- Transformation math (affine-transform.js) is pure, testable, reusable
- Format parsers/writers can be developed independently
- Allows npm packaging of core modules for Node.js use cases
- Clear separation of concerns improves maintainability

**Architecture Layers:**

```
┌─────────────────────────────────────┐
│         UI Layer (Tool)             │  ← Tool-specific (migrator.js)
├─────────────────────────────────────┤
│      Format Handlers (I/O)          │  ← Pluggable (snapspot/, geojson/)
├─────────────────────────────────────┤
│   Transformation Core (Pure Math)   │  ← Format-agnostic (affine-transform.js)
└─────────────────────────────────────┘
```

**Module Boundaries:**
- **Core:** No DOM, no file I/O, no format knowledge—pure functions
- **Formats:** No UI logic, only data transformation to/from standard internal format
- **Tools:** Orchestrates core + formats, handles all UI/DOM

**Alternative Considered:**
- Monolithic design: Rejected due to inflexibility for future tools/formats

---

### D4: Affine Transformation (vs Projective/Polynomial)

**Decision:** Use 6-parameter affine transformation as primary method.

**Rationale:**
- Floor plans, blueprints, architectural drawings have minimal perspective distortion
- Affine handles: translation, rotation, scaling, shear (sufficient for 95% of use cases)
- Requires minimum 3 reference points (user-friendly)
- Computationally simple: least-squares solution for overdetermined systems
- Deterministic and well-understood (no convergence issues like polynomial fitting)

**When Affine is Sufficient:**
- Scanned maps at different resolutions
- Rotated or skewed document scans
- Maps with minor stretching/compression
- Floor plans from different blueprint generations

**Limitations:**
- Cannot handle perspective distortion (photo of map at angle)
- Cannot handle non-linear warping (curved surfaces, lens distortion)

**Future Extensions:**
- Add projective transformation (8 parameters, 4+ points) if users report perspective issues
- Add thin-plate spline for non-linear warping (advanced use cases)

**Mathematics:**
```
Affine transformation matrix:
[x']   [a  b] [x]   [e]
[y'] = [c  d] [y] + [f]

6 unknowns (a,b,c,d,e,f) solve with 3+ point pairs via least-squares
```

---

### D5: Browser-Based Processing (No Server)

**Decision:** All computation occurs in browser, no backend required.

**Rationale:**
- Aligns with SnapSpot's privacy-first philosophy (no data uploaded)
- Works offline after initial page load
- No infrastructure costs or maintenance
- Instant processing (no network latency)
- Modern browsers have sufficient computation power for transformation math

**Implications:**
- File size limited by browser memory (~100MB practically safe)
- No cross-device syncing of reference points (acceptable for rare-use tool)
- Users retain full control of their data

**Performance Expectations:**
- 1000 markers: <100ms transformation time
- 10,000 markers: <1s transformation time
- Map images: 10MB+ process smoothly with canvas rendering

---

### D6: ES Modules (No Build Process)

**Decision:** Use native ES6 modules, no bundlers (Webpack/Vite/Rollup).

**Rationale:**
- Consistency with main SnapSpot architecture
- Simpler deployment: just open HTML file in browser
- No build step or Node.js requirement for users
- Easier debugging with readable source maps
- Modern browser support is universal (2026)

**Module Loading:**
```html
<script type="module" src="./migrator.js"></script>
```

```javascript
// In migrator.js
import { calculateAffineMatrix } from '../../core/transformation/affine-transform.js'
import { parseExport } from '../../core/formats/snapspot/parser.js'
```

**Trade-off:**
- Slightly more HTTP requests vs bundled file (negligible for local use)
- No tree-shaking optimization (acceptable for small codebase)

---

### D7: Stateless Tools (No Persistent Database)

**Decision:** Tools operate on files, do not maintain IndexedDB or persistent state.

**Rationale:**
- Utilities are single-session workflows (load → transform → export → done)
- Reduces complexity compared to SnapSpot's full storage layer
- Users keep reference points in saved JSON files if reuse needed
- Avoids data synchronization issues between utilities and SnapSpot

**Session State:**
- Use `localStorage` for UI preferences (marker color, zoom level)
- Optional: Save reference point sets as downloadable JSON
- All work is file-based: input file → processing → output file

---

### D8: Coordinate System Preservation

**Decision:** Use pixel coordinates (image space), not geographic coordinates.

**Rationale:**
- SnapSpot stores markers in image pixel coordinates (x, y from top-left)
- Floor plans/blueprints have no geographic metadata (no lat/lon)
- Simpler transformation math without datum/projection concerns
- Consistent with existing SnapSpot architecture

**Coordinate Details:**
- Origin: (0, 0) at top-left corner of image
- Units: Pixels
- Range: (0, 0) to (map.width, map.height)
- Marker coordinates rounded to nearest integer pixel

---

## Architecture Overview

### Directory Structure

```
snapspot-utils/
├── index.html                          # Landing page / tool selector
├── shared/                             # Shared across all tools
│   ├── styles/
│   │   ├── variables.css               # Design tokens (colors, spacing)
│   │   └── common.css                  # Shared UI components
│   └── utils/
│       ├── file-loader.js              # Generic file input handling
│       └── canvas-helpers.js           # Pan/zoom/render utilities
├── core/                               # Format-agnostic business logic
│   ├── transformation/
│   │   ├── affine-transform.js         # Pure transformation math
│   │   └── transform-validator.js      # Quality metrics & validation
│   └── formats/                        # Pluggable format handlers
│       └── snapspot/
│           ├── parser.js               # Read SnapSpot export JSON
│           ├── writer.js               # Write SnapSpot export JSON
│           └── validator.js            # Schema validation
├── tools/                              # Individual utility tools
│   └── map-migrator/
│       ├── index.html                  # UI for map migration
│       ├── migrator.js                 # Tool orchestration logic
│       ├── ui-controller.js            # Canvas interactions, state
│       └── styles.css                  # Tool-specific styles
└── docs/
    ├── README.md                       # User-facing documentation
    ├── ARCHITECTURE.md                 # This file
    ├── SPECIFICATIONS.md               # Technical specifications
    ├── IMPLEMENTATION.md               # Phased task list
    └── map-migrator-guide.md           # Tool-specific user guide
```

### Data Flow Diagram

```
User Actions:
  1. Load Export File
  2. Load New Map
  3. Select Reference Points
  4. Calculate Transformation
  5. Preview Results
  6. Generate Export

┌─────────────────────────────────────────────────────────────┐
│                     Map Migrator Tool                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              UI Controller                           │   │
│  │  - File drop zones                                   │   │
│  │  - Canvas rendering (dual maps)                      │   │
│  │  - Reference point selection                         │   │
│  │  - Preview overlay                                   │   │
│  └──────────────┬──────────────────┬────────────────────┘   │
│                 │                  │                         │
│                 ▼                  ▼                         │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │  SnapSpot Parser     │  │  Transformation      │         │
│  │  - Extract map       │  │  - Calculate matrix  │         │
│  │  - Extract markers   │  │  - Apply transform   │         │
│  │  - Validate schema   │  │  - Validate quality  │         │
│  └──────────────────────┘  └──────────────────────┘         │
│                 │                  │                         │
│                 ▼                  ▼                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SnapSpot Writer                         │   │
│  │  - Build new export structure                        │   │
│  │  - Generate IDs & hashes                             │   │
│  │  - Serialize to JSON                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                 │                                            │
│                 ▼                                            │
│         Download JSON File                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Specifications

### Core Modules

#### 1. `core/transformation/affine-transform.js`

**Purpose:** Pure mathematical transformation engine.

**Exports:**
```javascript
export function calculateAffineMatrix(sourcePoints, targetPoints)
  // Input: [{x, y}] arrays of 3+ corresponding points
  // Output: {matrix: [[a,b],[c,d],[e,f]], determinant, isDegenerate}
  // Method: Least-squares solution via normal equations

export function applyTransform(point, matrix)
  // Input: {x, y}, matrix
  // Output: {x: x', y: y'}

export function batchTransform(points, matrix)
  // Optimized for arrays of points

export function inverseTransform(matrix)
  // Returns inverse transformation matrix
```

**No Dependencies:** Pure functions, no imports.

**Testing Strategy:** Unit tests with known transformations (identity, translation, rotation, scaling).

---

#### 2. `core/transformation/transform-validator.js`

**Purpose:** Quality metrics and anomaly detection.

**Exports:**
```javascript
export function calculateRMSE(referencePairs, matrix)
  // Root mean square error of transformation

export function detectAnomalies(matrix)
  // Returns warnings: { hasExtremeScale, hasExtremeShear, hasNegativeDeterminant }

export function validatePointDistribution(points)
  // Warns if collinear or poorly distributed

export function suggestAdditionalPoints(currentPoints, mapBounds)
  // Recommends areas for additional reference points
```

**Dependencies:** Imports from `affine-transform.js`

---

#### 3. `core/formats/snapspot/parser.js`

**Purpose:** Read and validate SnapSpot export files.

**Exports:**
```javascript
export async function parseExport(jsonString)
  // Returns: { map, markers, photos, metadata }
  // Validates version, schema, required fields
  // Converts base64 to Blob where needed

export function extractMapImage(mapObject)
  // Returns: { blob, width, height, hash }
```

**Dependencies:** Uses `validator.js` for schema checks.

---

#### 4. `core/formats/snapspot/writer.js`

**Purpose:** Generate SnapSpot export JSON.

**Exports:**
```javascript
export async function buildExport(map, markers, photos, options)
  // Generates complete export structure
  // Creates IDs, timestamps, hashes
  // Converts Blobs to base64
  // Returns: JSON string ready for download

export function generateMapHash(imageData)
  // SHA-256 hash for duplicate detection
```

**Dependencies:** Imports SnapSpot schema constants.

---

### Tool Modules

#### 5. `tools/map-migrator/migrator.js`

**Purpose:** Main orchestration logic for migration tool.

**Responsibilities:**
- Load and parse files
- Coordinate UI controller and core modules
- Execute transformation pipeline
- Generate output file

**Key Functions:**
```javascript
async function loadExportFile(file)
async function loadMapImage(file)
function calculateTransformation(referencePairs)
function previewTransformation()
async function generateMigratedExport()
```

---

#### 6. `tools/map-migrator/ui-controller.js`

**Purpose:** Canvas rendering and user interactions.

**Responsibilities:**
- Render maps on dual canvases
- Handle mouse events (click, drag, wheel)
- Manage reference point markers
- Display preview overlays
- Synchronize UI state

**State Management:**
```javascript
const state = {
  sourceMap: { image, width, height },
  targetMap: { image, width, height },
  referencePairs: [{source: {x,y}, target: {x,y}}],
  canvasStates: { zoom, pan, activeCanvas },
  transformMatrix: null,
  previewMode: false
}
```

---

## Dependencies & Constraints

### External Dependencies

**None for runtime.** The utilities are pure vanilla JavaScript.

### Browser Requirements

- **Minimum Versions:**
  - Chrome/Edge: 90+ (May 2021)
  - Firefox: 88+ (April 2021)
  - Safari: 14+ (September 2020)

- **Required APIs:**
  - ES6 Modules
  - Canvas 2D API
  - File API (FileReader, Blob, URL.createObjectURL)
  - Async/Await
  - Crypto.subtle (for SHA-256 hashing)

### Performance Constraints

- **Maximum markers:** 50,000 (practical limit based on rendering)
- **Maximum map size:** 50MB image file
- **Transformation time:** <200ms for 1000 markers
- **Canvas size:** 8192×8192px (browser limit)

### Code Standards

- **Style:** JavaScript Standard Style (no semicolons, 2-space indent)
- **Compatibility:** No transpilation, ES6+ only
- **Comments:** JSDoc for public functions

---

## Security & Privacy

### Data Privacy

- **No Network Requests:** All data stays in browser memory
- **No Telemetry:** No analytics or tracking
- **No Storage:** No IndexedDB or persistent cookies (only localStorage for preferences)
- **User Control:** All exports downloaded to user's device

### Input Validation

- **File Type Checks:** Validate JSON structure and image MIME types
- **Schema Validation:** Verify SnapSpot export version and required fields
- **Sanitization:** Escape HTML in user-provided text (descriptions, file names)
- **Error Handling:** Graceful failures with user-friendly messages

### Potential Risks

- **Memory Exhaustion:** Large files (>100MB) may cause browser slowdown
  - Mitigation: Document file size limits, show file size warnings
- **Malicious JSON:** Crafted files could contain XSS payloads
  - Mitigation: Never use `innerHTML` with unsanitized data, use `textContent`

---

## Future Extensibility

### Planned Tools (Suite Expansion)

1. **Format Converter** (Phase 2)
   - Export SnapSpot data to GeoJSON, CSV, KML
   - Import from other mapping formats (if coordinates can be extracted)

2. **Batch Processor** (Phase 3)
   - Apply operations to multiple maps at once
   - Bulk export filtered markers by date/criteria

3. **Data Analyzer** (Phase 4)
   - Statistics dashboard (markers per map, photos per marker)
   - Timeline visualizations
   - Export reports (PDF/HTML)

### Format Handler Interface

To add new formats (e.g., GeoJSON), implement:

```javascript
// core/formats/geojson/parser.js
export async function parseGeoJSON(jsonString)
  // Returns standardized: { features: [...] }

// core/formats/geojson/writer.js
export async function buildGeoJSON(markers, options)
  // Converts from internal format to GeoJSON
```

**Standard Internal Format:**
```javascript
{
  points: [{id, x, y, metadata}],  // Coordinates in source system
  images: [{id, data, type}],       // Associated media
  metadata: {name, created, ...}    // Contextual info
}
```

### Coordinate System Extensions

Future support for geographic coordinates:

```javascript
// core/transformation/geo-transform.js
export function affineToGeoTransform(affineMatrix, referenceGeoPoints)
  // Convert pixel transform to lat/lon transform
```

---

## Appendix: Alternatives Considered

### A1: React/Vue Framework

**Considered:** Using React or Vue for UI reactivity.

**Rejected Because:**
- Adds build complexity (webpack/vite required)
- Increases bundle size and load time
- Overkill for stateless tools with simple UI updates
- Inconsistent with SnapSpot's vanilla approach

**Chosen Instead:** Vanilla JS with explicit DOM manipulation (similar to SnapSpot).

---

### A2: WebAssembly for Transformation

**Considered:** Implement transformation math in Rust/C++ compiled to WASM.

**Rejected Because:**
- Affine transformation is computationally simple (matrix multiply)
- JavaScript performance is sufficient (<1ms per marker)
- Adds build complexity and binary blob to repository
- Harder to debug and maintain

**Chosen Instead:** Pure JavaScript implementation.

---

### A3: Server-Based Processing

**Considered:** Backend server for transformation calculations.

**Rejected Because:**
- Violates privacy principle (requires data upload)
- Adds infrastructure complexity and costs
- Requires network connection
- No performance benefit for client-side math

**Chosen Instead:** 100% client-side browser processing.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | Initial | Created architecture document for utilities suite |

