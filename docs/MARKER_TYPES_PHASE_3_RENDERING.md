# Phase 3: Custom Marker Types — Rendering Engine

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1 complete (Phase 2 recommended but not required for testing)

---

## Goals

Refactor the marker rendering system in `mapRenderer.js` to support custom marker type definitions:
1. Replace the binary `type === 'line'` check with a type-definition lookup system
2. Implement rendering for all four shapes: circle, square, diamond, arrow
3. Implement arrow direction rotation via `ctx.rotate()`
4. Color from type definition (with fallback to existing default coloring logic)
5. Size from type definition mapped to existing size settings
6. Ensure map rotation (0/90/180/270) composes correctly with arrow direction
7. Pass type definitions from app to MapRenderer

---

## Rendering Specification

### Type Definition Lookup Logic

When rendering a marker, the renderer needs to determine its effective type definition:

```javascript
function getEffectiveTypeDef(marker, typeDefs) {
  // 1. If marker has explicit markerTypeId, look up the definition
  if (marker.markerTypeId) {
    return typeDefs.get(marker.markerTypeId)
  }
  
  // 2. Otherwise, infer from legacy marker.type
  if (marker.type === 'line') {
    return typeDefs.get('builtin-line-marker')  // Line Marker built-in (behavior: line-pair)
  }
  
  // 3. Default: Photo Marker built-in (behavior: point)
  return typeDefs.get('builtin-photo-marker')
}

// Behavior dispatch — replaces all `marker.type === 'line'` checks:
function getBehavior(marker, typeDef) {
  if (marker.markerTypeId && typeDef) return typeDef.behavior
  if (marker.type === 'line') return 'line-pair'
  return 'point'
}
```

The `typeDefs` map is a `Map<string, MarkerTypeDefinition>` keyed by ID, passed from the app layer.

### Shape Rendering

All shapes are drawn at the marker's screen coordinates `(x, y)`.

**Circle:**
```javascript
ctx.beginPath()
ctx.arc(x, y, radius, 0, Math.PI * 2)
ctx.fillStyle = color
ctx.fill()
ctx.strokeStyle = borderColor
ctx.lineWidth = 1.5
ctx.stroke()
```

**Square:**
```javascript
ctx.fillStyle = color
ctx.strokeStyle = borderColor
ctx.lineWidth = 1.5
ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2)
```

**Diamond:**
```javascript
ctx.save()
ctx.translate(x, y)
ctx.rotate(Math.PI / 4)  // 45 degrees
ctx.fillStyle = color
ctx.strokeStyle = borderColor
ctx.lineWidth = 1.5
ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
ctx.strokeRect(-radius, -radius, radius * 2, radius * 2)
ctx.restore()
```

**Arrow:**
```javascript
ctx.save()
ctx.translate(x, y)

// Apply direction rotation (0° = up)
// direction comes from marker.direction (0-360)
ctx.rotate((direction || 0) * Math.PI / 180)

// Draw stem (line from center upward)
ctx.beginPath()
ctx.moveTo(0, 0)
ctx.lineTo(0, -radius * 2)
ctx.strokeStyle = color
ctx.lineWidth = 2
ctx.stroke()

// Draw arrowhead (triangle at tip)
ctx.beginPath()
ctx.moveTo(0, -radius * 2)        // Tip
ctx.lineTo(-radius * 0.8, -radius * 1.2)  // Left wing
ctx.lineTo(radius * 0.8, -radius * 1.2)   // Right wing
ctx.closePath()
ctx.fillStyle = color
ctx.fill()

ctx.restore()
```

### Color Logic

For custom marker types (markers with `markerTypeId`):
- Use the type definition's `color` directly as fill
- Border color: slightly darker variant of the color (darken by 15%)
- Text color: white

For markers without `markerTypeId` (legacy behavior fallback):
- Keep the existing default coloring logic (editable/hasPhotos state colors)
- The built-in "Photo Marker" definition's color is used as a hint but the existing logic takes precedence since it's contextual (locked vs unlocked, has photos vs no photos)

**Decision:** Custom marker types with `markerTypeId` set ALWAYS use the type definition color. Legacy markers without `markerTypeId` continue using the existing contextual coloring logic. This gives users explicit control: if you assign a type, you get that type's color consistently.

### Size Logic

Map type definition sizes to the existing `markerSizeSettings`:
- `'small'` → `{ radius: 8, fontSizeFactor: 0.85 }`
- `'normal'` → `{ radius: 12, fontSizeFactor: 1.0 }`
- `'large'` → `{ radius: 18, fontSizeFactor: 1.2 }`

The global `markerCurrentDisplaySizeKey` setting in MapRenderer (normal/large/extraLarge) acts as a multiplier. Custom type's size is the "base" and the global setting scales it:

```javascript
const baseSize = TYPE_SIZE_MAP[typeDef.size]
const globalScale = this.markerSizeSettings[this.markerCurrentDisplaySizeKey]
const effectiveRadius = baseSize.radius * (globalScale.radius / 12) // 12 is normal baseline
```

### Arrow Direction + Map Rotation

The tricky part: arrow direction (marker property, stored in original map coordinate space) must compose correctly with map rotation (canvas transform).

- `marker.direction` is stored in the **original map coordinate space** (0° = up on the unrotated map)
- When rendering, the marker is already positioned via `mapToScreen()` which accounts for map rotation
- The arrow direction rotation is applied ON TOP of the map rotation

Since `drawMarker()` operates in screen space (after `mapToScreen()`), and the map rotation is part of the `mapToScreen()` transform, the arrow direction should be applied relative to the screen-space marker orientation.

**Simpler approach:** Apply arrow direction rotation directly. Since markers are already positioned on the rotated map via `mapToScreen()`, just rotate the arrow by `marker.direction` degrees. The map rotation is already baked into the marker's screen position — we don't need to adjust the arrow direction for map rotation.

Wait — this needs more thought. If a marker is at (100, 200) on a map rotated 90°, and the direction is 0° (up), what should the user see?
- 0° on the unrotated map = pointing toward y=0 on the original map
- After 90° rotation, "up" on the original map becomes "left" on screen
- The arrow should point toward what was originally "up"

So YES, we need to compose: `effectiveDirection = (marker.direction + currentMapRotation) % 360`

```javascript
const effectiveDirection = ((marker.direction || 0) + this.currentMapRotation) % 360
ctx.rotate(effectiveDirection * Math.PI / 180)
```

This ensures the arrow always points to the same geographic direction regardless of how the map is rotated on screen.

---

## Tasks

### ☐ Task 3.1: Add Type Definition Storage to MapRenderer

**Actions:**
1. Add `this.markerTypeDefinitions = new Map()` to MapRenderer constructor

2. Add method `setMarkerTypeDefinitions(definitions)`:
   - Accepts an array of MarkerTypeDefinition objects
   - Stores them in the Map keyed by `id`
   - Also stores built-in definitions under their fixed IDs for fallback lookup
   - Calls `this.render()` if markers are already set

3. Add method `getEffectiveTypeDef(marker)`:
   - Returns the MarkerTypeDefinition for this marker
   - Implements the lookup logic described above

**Files to modify:**
- `js/mapRenderer.js`

**Acceptance Criteria:**
- [ ] `setMarkerTypeDefinitions()` correctly indexes definitions by ID
- [ ] `getEffectiveTypeDef()` returns built-in Photo Marker for markers without markerTypeId
- [ ] `getEffectiveTypeDef()` returns built-in Line Marker for markers with type='line'
- [ ] `getEffectiveTypeDef()` returns custom type for markers with markerTypeId
- [ ] Falls back gracefully if definition ID not found (treat as Photo Marker)

---

### ☐ Task 3.2: Refactor `drawMarker()` for Shape Dispatch

**Actions:**
1. Refactor `drawMarker(x, y, number, marker)`:

2. **Replace the binary `marker.type === 'line'` check** with behavior dispatch:
```javascript
const typeDef = this.getEffectiveTypeDef(marker)
const behavior = getBehavior(marker, typeDef)
```

3. **Use behavior to determine rendering path:**
```javascript
if (behavior === 'line-pair') {
  // Existing diamond + line connector rendering
  this._drawDiamondMarker(...)
} else {
  // Shape-based dispatch for point behavior
  switch (typeDef.shape) {
    case 'circle':  this._drawCircleMarker(...); break
    case 'square':  this._drawSquareMarker(...); break
    case 'diamond': this._drawDiamondMarker(...); break
    case 'arrow':   this._drawArrowMarker(...); break
  }
}

5. **Extract helper methods** for each shape (keep `drawMarker` clean):
   - `_drawCircleMarker(x, y, radius, fillColor, borderColor, number, ...)`
   - `_drawSquareMarker(x, y, radius, fillColor, borderColor, number, ...)`
   - `_drawDiamondMarker(x, y, radius, fillColor, borderColor, number, ...)`
   - `_drawArrowMarker(x, y, radius, color, marker, ...)`

6. **Number rendering:** Numbers are only drawn for circle and square shapes (and only when `number !== null`). Diamonds and arrows don't get numbers (matching current line marker behavior). Numbers use chronological ordering across ALL marker types (the `index` passed from `renderMarkers()`).

7. **Color determination for custom types:**
```javascript
if (marker.markerTypeId) {
  fillColor = typeDef.color
  borderColor = darken(typeDef.color, 0.15)
  textColor = '#ffffff'
} else {
  // Existing default logic (editable/hasPhotos state)
}
```

8. Add a `_darkenColor(hex, factor)` utility to MapRenderer:
```javascript
_darkenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const dr = Math.round(r * (1 - factor))
  const dg = Math.round(g * (1 - factor))
  const db = Math.round(b * (1 - factor))
  return '#' + [dr, dg, db].map(c => c.toString(16).padStart(2, '0')).join('')
}
```

**Files to modify:**
- `js/mapRenderer.js`

**Acceptance Criteria:**
- [ ] Circle markers render as before (photo markers unchanged)
- [ ] Diamond markers render like current line markers (45° rotated square)
- [ ] Square markers render as filled rectangles
- [ ] Arrow markers render with stem + arrowhead, pointing in direction
- [ ] Legacy markers without markerTypeId render exactly as they do today (no visual regression)
- [ ] Highlight ring still works for all shapes
- [ ] Custom color rules still apply when markerTypeId is null

---

### ☐ Task 3.3: Implement Arrow Rendering

**Actions:**
1. Implement `_drawArrowMarker(x, y, radius, color, marker)`:

2. Arrow design:
   - **Stem:** A line from center (x, y) extending upward by `radius * 2` pixels
   - **Arrowhead:** A filled triangle at the tip
   - Arrowhead width: `radius * 0.8` on each side
   - Arrowhead height: `radius * 0.8` (from tip back toward center)

3. Rotation (direction derived from behavior + shape, not a stored field):
```javascript
const hasDirection = typeDef.behavior === 'point' && typeDef.shape === 'arrow'
const direction = hasDirection ? (marker.direction || 0) : 0
const effectiveDirection = (direction + this.currentMapRotation) % 360

ctx.save()
ctx.translate(x, y)
ctx.rotate(effectiveDirection * Math.PI / 180)
// Draw arrow pointing up (at 0°)
ctx.restore()
```

4. Arrow color: Uses the type definition color for both fill and stroke. No separate fill/border — arrow is a solid shape.

5. **Label rendering:** If the type definition has a `label`, draw it near the marker:
   - Position: slightly below and to the right of the marker center
   - Font: 10px bold sans-serif
   - Color: type definition color
   - Background: semi-transparent white pill behind text for readability

6. **No numbers on arrows:** The `number` parameter is ignored for arrow shapes.

**Files to modify:**
- `js/mapRenderer.js`

**Acceptance Criteria:**
- [ ] Arrow points in the direction specified by marker.direction
- [ ] Arrow direction composes with map rotation (0/90/180/270)
- [ ] Arrowhead is visible and proportional at all size settings
- [ ] Label appears near arrow if type has label
- [ ] No number drawn on arrow markers

---

### ☐ Task 3.4: Update `renderMarkers()` for Unified Loop

**Actions:**
1. In `renderMarkers()`, the current split into `photoMarkers`/`lineMarkers` is replaced:

2. **Line connectors still rendered first** (unchanged — they key off `marker.type === 'line'` and `lineGroupId`).

3. **Main marker loop** becomes unified:
```javascript
// Sort all markers chronologically by createdDate for consistent numbering
const sortedMarkers = [...this.markers].sort((a, b) => 
  new Date(a.createdDate) - new Date(b.createdDate)
)

sortedMarkers.forEach((marker, index) => {
  const screenCoords = this.mapToScreen(marker.x, marker.y)
  if (/* culling check */) {
    const typeDef = this.getEffectiveTypeDef(marker)
    const showNumber = typeDef.shape === 'circle' || typeDef.shape === 'square'
    this.drawMarker(
      screenCoords.x, screenCoords.y,
      showNumber ? index + 1 : null,
      marker
    )
  }
})
```

4. The separation into `photoMarkers`/`lineMarkers` arrays is removed. Line markers still get their connectors drawn in a separate pass (before the main loop), but they also get their diamond endpoints drawn in the main loop.

5. **Numbering:** Photos are still numbered chronologically (1-indexed). The number is only shown for circle and square shapes. Diamonds and arrows get no number.

**Files to modify:**
- `js/mapRenderer.js`

**Acceptance Criteria:**
- [ ] All markers render in a single pass
- [ ] Line connectors still draw before markers (behind them visually)
- [ ] Numbers only appear on circle and square markers
- [ ] Chronological numbering is consistent across all marker types
- [ ] No visual regression for existing maps

---

### ☐ Task 3.5: Wire Up Type Definitions from App

**Actions:**
1. In `js/app.js`, after loading markers for a map, also load marker type definitions:
```javascript
const typeDefs = await this.storage.getMarkerTypeDefinitionsForMap(this.currentMap.id)
this.mapRenderer.setMarkerTypeDefinitions(typeDefs)
```

2. Re-load type definitions when:
   - A new map is loaded
   - A marker type is created/edited/deleted in settings
   - An import brings in new type definitions

3. Call `setMarkerTypeDefinitions()` AFTER `setMarkers()` so the renderer has both when it renders.

**Files to modify:**
- `js/app.js`
- `js/app-settings.js` (refresh types after CRUD)

**Acceptance Criteria:**
- [ ] Type definitions loaded when map loads
- [ ] MapRenderer has type definitions before rendering markers
- [ ] Type definition changes in settings cause re-render with new colors/shapes
- [ ] No errors if no custom types exist (fallback to built-in defaults works)

---

## Manual Testing Checklist

### Test 1: Legacy Markers Unchanged
- [ ] Open existing map with photo markers and line markers
- [ ] Verify photo markers look exactly as before (color, size, numbers)
- [ ] Verify line markers look exactly as before (diamond shape, line connectors)
- [ ] Verify locked/unlocked state colors still work on legacy markers

### Test 2: Custom Type — Circle
- [ ] (After Phase 4) Place a marker with a custom circle type (different color)
- [ ] Verify it renders as a circle with the custom color
- [ ] Verify number is displayed
- [ ] Verify size setting affects it

### Test 3: Custom Type — Square
- [ ] Place a marker with a custom square type
- [ ] Verify square shape with custom color
- [ ] Verify number displayed

### Test 4: Custom Type — Diamond
- [ ] Place a marker with a custom diamond type
- [ ] Verify 45° rotated square
- [ ] Verify no number displayed
- [ ] Verify custom color (not line red)

### Test 5: Custom Type — Arrow
- [ ] Place a marker with arrow type, direction 0°
- [ ] Verify arrow points up
- [ ] Change direction to 90° → verify points right
- [ ] Change direction to 180° → verify points down
- [ ] Change direction to 270° → verify points left
- [ ] Set direction to 45° → verify diagonal

### Test 6: Arrow + Map Rotation
- [ ] Place arrow marker with direction 0° (up)
- [ ] Rotate map to 90°
- [ ] Verify arrow still points to the same geographic direction (should appear to point right on screen since "up on original map" is now "right on rotated map")
- [ ] Test with 180° and 270° map rotation

### Test 7: Size Settings
- [ ] Create a "small" custom circle type and "large" custom circle type
- [ ] Place both on map
- [ ] Verify size difference is visible
- [ ] Change global marker size setting (normal/large/extraLarge)
- [ ] Verify both scale proportionally

### Test 8: Highlight
- [ ] Click a custom type marker in search results
- [ ] Verify highlight ring appears around it
- [ ] Verify highlight works for all shapes

### Test 9: Label on Map
- [ ] Create a type with 4-char label
- [ ] Place marker of that type
- [ ] Verify label text appears near marker on map
- [ ] Verify label is readable (white pill background)
