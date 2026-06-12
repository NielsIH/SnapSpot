# Phase 4: Custom Marker Types — Marker Creation and Type Selection

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1, 2, and 3 complete

---

## Design Rationale

Custom marker placement is **sporadic** — the vast majority of markers will use the default "Photo Marker" type. Showing a type picker on every placement would be constant friction for the 90% case.

**Design decision:** Two separate toolbar buttons with clear intent:

- **📌 Place Marker** — Always places the **default marker type** (Photo Marker, configurable in Settings). Single tap, zero friction.
- **✦ Place Custom** — Opens a type picker popup. For the occasional custom marker or line pair.

The old dedicated "Place Line" button is removed; line placement is now accessed through the Custom picker.

---

## Goals

1. Add a **"Place Custom" button** that opens a type picker popup with all non-default marker types
2. Remove the dedicated **"Place Line" button**; fold line placement into the Custom picker as "Line Marker (pair)"
3. **"Place Marker" button** always places the default type (Photo Marker, configurable via `app.defaultMarkerTypeId`)
4. Add a **default marker type setting** in Settings → Marker Types tab
5. Update `placeMarker()` to accept a `markerTypeId` parameter
6. Add direction rotation control to marker details modal for arrow markers
7. Display marker type info in the marker details modal
8. Allow changing a marker's type after creation

---

## UI Design Specification

### Toolbar Layout

```
Desktop:
[🔍 Maps] [+][−] [📌 Place Marker] [✦ Place Custom] [🔒 Locked] [📏 Size] [🔄 Rotate]

Mobile (<480px, zoom already hidden):
[🔍] [📌] [✦] [🔒] [📏] [🔄]
```

### "Place Custom" Type Picker Popup

Tapping **✦ Place Custom** opens a popup anchored near the button:

```
┌──────────────────────────────┐
│ ● Hazard Zone                │
│ ▲ Direction Arrow            │
│ ───────────────────────────  │
│ ♦ Line Marker  (pair)        │
│ ───────────────────────────  │
│ + Create New Type...         │
└──────────────────────────────┘
```

Key behaviors:
- Each entry shows: **shape icon + name + color swatch**
- The default Photo Marker is **not listed** (use the main "Place Marker" button for that)
- **"Line Marker (pair)"** is listed with a `(pair)` suffix to indicate it places two connected markers
- Selecting a point type (Hazard Zone, Direction Arrow, etc.) → **places one marker** of that type at the crosshair and dismisses the popup
- Selecting "Line Marker (pair)" → triggers the existing **line pair placement flow** (two markers with offset) and dismisses the popup
- **"+ Create New Type"** → opens the marker type definition modal (Phase 2), returns to map after save
- Popup dismisses on: selection made, tapping outside, or pressing Escape

### Default Marker Type Setting (Settings → Marker Types)

In the Marker Types tab of Settings, add a "Default Marker Type" selector:

```
┌──────────────────────────────────────────┐
│ Default Marker Type                      │
│                                          │
│  [● Photo Marker           ▼]           │
│                                          │
│  This type is used when tapping          │
│  "Place Marker" in the toolbar.          │
└──────────────────────────────────────────┘
```

- Lists all available (enabled) marker types
- Default: "Photo Marker" (built-in)
- The built-in "Line Marker" is excluded from the dropdown (line markers use the pair placement flow)
- Stored as `app.defaultMarkerTypeId` in localStorage
- When changed, the "Place Marker" button's tooltip updates to reflect the current default

### Direction Control in Marker Details Modal

For markers whose type supports direction (`behavior === 'point' && shape === 'arrow'`), the marker details modal shows a rotation slider in edit mode:

```
┌──────────────────────────────────────────────┐
│ Marker Details                          [X]  │
├──────────────────────────────────────────────┤
│                                              │
│  Type: ▲ Direction Arrow                     │
│  ID: marker-abc123                           │
│  Coordinates: 250, 400                       │
│                                              │
│  ── Direction ──────────────────────────────│
│                                              │
│       ┌──────────┐                           │
│       │    ▲     │   Live preview            │
│       │   ╱ ╲    │   rotates in real-time    │
│       │   ▏▕     │   as slider moves         │
│       └──────────┘                           │
│                                              │
│  0°  ├────────●───────────┤  360°            │
│             45°                               │
│                                              │
│  (drag the slider to rotate)                 │
│                                              │
│  ── Photos ─────────────────────────────────│
│  ...                                         │
│                                              │
│  [Add Photos] [Edit] [Delete Marker]         │
│                                              │
└──────────────────────────────────────────────┘
```

Key behaviors:
- **Linear range slider** (0–360), styled touch-friendly: thick track, large thumb
- **Live preview canvas** (~72×72px) above the slider, updating in real-time as the slider moves
- **Current value** displayed below the thumb as degrees
- **Snap behavior** (optional): subtle detents at 0°/90°/180°/270° — the slider lightly "catches" at cardinals but doesn't lock
- **Touch:** natural thumb drag on the slider
- **Desktop:** drag thumb, click track to jump, or use keyboard arrows (1°) / Shift+arrow (15°)
- **View mode:** direction shown as static text: "Direction: 45°" (no slider)
- **Edit mode only:** slider + preview appear only when editing
- Direction changes mark the form as dirty but do NOT auto-save

---

## Tasks

### ☐ Task 4.1: Replace "Place Line" Button with "Place Custom" Button

**Actions:**
1. In `index.html`, replace the existing "Place Line" button (`id="btn-place-line"`) with a new "Place Custom" button:

```html
<button class="btn btn-primary control-btn" id="btn-place-custom">
    ✦ <span class="btn-text">Place Custom</span>
</button>
```

2. In `js/app.js`, replace the `placeLineBtn` event listener with a new `placeCustomBtn` listener that opens the type picker popup:

```javascript
const placeCustomBtn = document.getElementById('btn-place-custom')
if (placeCustomBtn) {
  placeCustomBtn.addEventListener('click', () => openCustomTypePicker(this))
}
```

3. Create the `openCustomTypePicker(app)` function in `js/app-marker-photo-manager.js`:
   - Queries all marker types via `app.storage.getAllMarkerTypeDefinitions()`
   - Filters out the current default type (avoids redundancy with the main "Place Marker" button)
   - Renders a popup anchored near the "Place Custom" button
   - Each entry: shape icon (Unicode) + name + small color swatch
   - "Line Marker (pair)" entry triggers `placeLinePair(app)` on selection
   - Other point types trigger `placeMarker(app, { markerTypeId })` on selection
   - "+ Create New Type" opens the Phase 2 definition modal
   - Popup dismisses on: selection made, outside click, or Escape

4. Style the popup in `css/components.css`:
   - Compact dropdown list anchored below the button
   - Touch-friendly row height (min 44px per row)
   - Color swatch as a small circle (12×12px) next to each entry
   - Subtle divider before "Line Marker (pair)" and "+ Create New Type"
   - Backdrop overlay to catch outside clicks

5. Mobile considerations:
   - On narrow screens, the popup should be full-width below the toolbar
   - Popup rows large enough for finger taps
   - The popup must work reliably on iOS Safari

**Files to modify:**
- `index.html` (replace `btn-place-line` with `btn-place-custom`)
- `js/app.js` (replace line button listener with custom button listener)
- `js/app-marker-photo-manager.js` (add `openCustomTypePicker()`)
- `css/components.css` (type picker popup styling)

**Acceptance Criteria:**
- [ ] "Place Line" button removed, "Place Custom" button present
- [ ] Tapping "Place Custom" opens popup with all non-default marker types
- [ ] Selecting a point type places one marker of that type at crosshair
- [ ] Selecting "Line Marker (pair)" triggers the line pair placement flow
- [ ] "+ Create New Type" opens the definition modal
- [ ] Popup dismisses on outside click and Escape
- [ ] Popup works on mobile (touch-friendly, iOS Safari)
- [ ] Popup refreshes when types are added/deleted in Settings

---

### ☐ Task 4.2: Update `placeMarker()` and Add Default Type Support

**Actions:**
1. In `js/app-marker-photo-manager.js`, update `placeMarker(app)` to accept an optional options parameter:

```javascript
export async function placeMarker(app, options = {}) {
  // ... existing validation ...

  const markerTypeId = options.markerTypeId || app.defaultMarkerTypeId || null

  const newMarker = {
    mapId: app.currentMap.id,
    x: mapCoords.x,
    y: mapCoords.y,
    description: `Marker at ${mapCoords.x.toFixed(0)}, ${mapCoords.y.toFixed(0)}`,
    markerTypeId  // null = legacy/default Photo Marker behavior
  }

  // If the type supports direction (point behavior + arrow shape), initialize to 0
  if (markerTypeId) {
    const typeDef = await app.storage.getMarkerTypeDefinition(markerTypeId)
    const hasDirection = typeDef && typeDef.behavior === 'point' && typeDef.shape === 'arrow'
    if (hasDirection) {
      newMarker.direction = 0
    }
  }

  // ... existing save and render logic ...
}
```

2. Add `app.defaultMarkerTypeId` property in `js/app.js`:
   - Initialize from `localStorage.getItem('defaultMarkerTypeId')` (default: `null` = Photo Marker)
   - When `null`, the "Place Marker" button places a legacy Photo Marker (no `markerTypeId`)
   - The button tooltip/label reflects the current default type name

3. Add a "Default Marker Type" selector in the Marker Types tab of Settings:
   - Modify `js/ui/settings-modal.js` (or the Phase 2 marker type settings section)
   - Dropdown lists all available types excluding "Line Marker" built-in
   - Changing the selection updates `app.defaultMarkerTypeId` and persists to localStorage
   - Updating the default refreshes the "Place Marker" button tooltip

4. In `js/app.js`, update the "Place Marker" button click handler to pass the default type:

```javascript
placeMarkerBtn.addEventListener('click', () => placeMarker(this, {
  markerTypeId: this.defaultMarkerTypeId
}))
```

5. Ensure `addMarker()` in `js/storage.js` accepts `markerTypeId` and `direction` as optional fields (IndexedDB is schema-flexible — no DB change needed, just pass them through).

6. For `placeLinePair()`: when triggered from the Custom picker, explicitly set `markerTypeId: 'builtin-line-marker'` on the line markers.

**Files to modify:**
- `js/app-marker-photo-manager.js` (update `placeMarker` signature, add `openCustomTypePicker`)
- `js/app.js` (add `defaultMarkerTypeId`, update button handler)
- `js/ui/settings-modal.js` (add default type selector)

**Acceptance Criteria:**
- [ ] `placeMarker()` with no options uses `app.defaultMarkerTypeId`
- [ ] `placeMarker()` with `{ markerTypeId: 'custom-id' }` uses that type
- [ ] `defaultMarkerTypeId = null` places legacy Photo Markers (backward compatible)
- [ ] Arrow types auto-initialize `direction` to 0
- [ ] Non-arrow types do not get a `direction` property
- [ ] Default type selector works in Settings and persists to localStorage
- [ ] Changing default type updates "Place Marker" button tooltip
- [ ] Existing marker placement still works (no regression)
- [ ] `placeLinePair()` sets `markerTypeId: 'builtin-line-marker'`

---

### ☐ Task 4.3: Add Direction Slider to Marker Details Modal

**Actions:**
1. In `js/ui/marker-details-renderer.js`, detect if the marker's type supports direction:
   ```javascript
   const hasDirection = typeDef && typeDef.behavior === 'point' && typeDef.shape === 'arrow'
   ```

2. When direction is supported and the modal is in **edit mode**, add a Direction section:

   a. **Live preview canvas** (~72×72px):
      - Renders a small arrow at the current direction using the same arrow-drawing logic as `mapRenderer.js`
      - Updates in real-time as the slider moves (no debounce needed — canvas redraw is cheap)
      - Neutral background (e.g., `#f9fafb`) with subtle border to separate from the form
   
   b. **Range slider** (0–360):
      - `<input type="range" min="0" max="360" value="0" step="1">`
      - Styled with custom CSS: thick track (~8px), large thumb (~28px for touch)
      - Thumb shows current value via a data attribute or adjacent label
      - Optional: subtle tick marks or snap detents at cardinal angles (0/90/180/270)
      - Keyboard accessible: left/right arrows change by 1°, Shift+arrow by 15°
   
   c. **Current value display:**
      - A label below or beside the slider showing `{value}°`
      - Updates on `input` event (live) not just `change` (on release)

3. In **view mode**: show direction as static text — "Direction: 45°". No slider, no preview.

4. Event handling in `js/ui/marker-details-actions.js`:
   - Slider `input` event → update preview canvas + value label
   - Slider `change` event → mark form as dirty (direction changed)
   - Direction changes do NOT auto-save — they're saved when the user clicks "Save"

5. CSS styling in `css/modals/marker-details.css`:
   - Custom slider track and thumb (vendor-prefixed: `-webkit-slider-thumb`, `-moz-range-thumb`)
   - Slider track color matches the marker's color for visual connection
   - Touch-friendly: thumb at least 28×28px, track at least 8px tall
   - Preview canvas: subtle rounded border, light background

**Files to modify:**
- `js/ui/marker-details-renderer.js` (HTML generation for direction section)
- `js/ui/marker-details-actions.js` (event handlers for slider + preview)
- `css/modals/marker-details.css` (slider styling, preview canvas)

**Acceptance Criteria:**
- [ ] Direction section appears for arrow-type markers in edit mode
- [ ] Direction section does NOT appear for non-arrow markers
- [ ] Slider range is 0–360 with 1° increments
- [ ] Live preview canvas updates in real-time as slider moves
- [ ] Current value label shows degrees and updates live
- [ ] Slider is touch-friendly (large thumb, smooth drag)
- [ ] Slider is keyboard accessible (arrow keys, Shift+arrow)
- [ ] Subtle snap/catch at cardinal angles (0/90/180/270) — optional enhancement
- [ ] Direction is saved when user clicks "Save" (not on slider release)
- [ ] In view mode, direction shown as static text only
- [ ] Works on iOS Safari (range input + canvas compatibility)

---

### ☐ Task 4.4: Display Marker Type Info in Details Modal

**Actions:**
1. In the marker details modal header/info section, show the marker's type:
   - Shape icon + type name (e.g., "▲ Direction Arrow")
   - Small color swatch next to the name
   - Label display: "Type: Direction Arrow"

2. If the marker has no `markerTypeId`:
   - If `type === 'line'`: show "◆ Line Marker (default)"
   - Otherwise: show "● Photo Marker (default)"

3. Allow type change in edit mode:
   - Dropdown showing all available types
   - Changing the type immediately updates the appearance on the map (re-render)
   - Warning if changing from/to line marker type (line markers work in pairs)
   - If changing from an arrow type to a non-arrow type, warn that direction data will be lost

**Files to modify:**
- `js/ui/marker-details-renderer.js`

**Acceptance Criteria:**
- [ ] Type info shown in marker details (view and edit mode)
- [ ] Type can be changed in edit mode via dropdown
- [ ] Changing type updates map rendering immediately
- [ ] Warning shown when changing from arrow → non-arrow (direction loss)
- [ ] Warning shown when changing from/to line marker type

---

### ☐ Task 4.5: Handle Type Change on Existing Markers

**Actions:**
1. In `js/storage.js`, `updateMarker(marker)` should accept and persist `markerTypeId` and `direction` fields.

2. When type is changed in the details modal and saved:
   - If changing TO an arrow type: set `direction = 0` if not already set
   - If changing FROM an arrow type: remove `direction` field
   - If changing FROM a line marker: ensure `type` and `lineGroupId` are handled (complex — this may be blocked)

3. **Constraint:** For Phase 4, disallow type changes on line markers (markers with `type === 'line'`). Line markers have pair semantics that don't translate to other types. Show a message: "Line marker type cannot be changed."

4. Similarly, a non-line marker cannot be changed TO a line marker type (would need a pair).

**Files to modify:**
- `js/storage.js` (updateMarker)
- `js/ui/marker-details-actions.js` (save logic)

**Acceptance Criteria:**
- [ ] Changing type on a regular marker works (e.g., Photo Marker → Direction Arrow)
- [ ] direction auto-initialized to 0 when changing to arrow type
- [ ] direction removed when changing from arrow to non-arrow
- [ ] Line marker type changes are blocked with explanation
- [ ] Saved markers persist their new type after page reload

---

## Manual Testing Checklist

### Test 1: Default Placement (Zero Friction)
- [ ] Tap "Place Marker" → verify a Photo Marker (circle) is placed at crosshair
- [ ] Tap "Place Marker" 5 times rapidly → verify all 5 are circles with sequential numbers
- [ ] Verify no popup, picker, or extra step appears (single tap = marker placed)
- [ ] Verify markerTypeId is null on each (check via console)

### Test 2: Custom Type Placement
- [ ] Tap "✦ Place Custom" → verify popup appears with all non-default types
- [ ] Verify Photo Marker is NOT in the popup (it's the default button)
- [ ] Verify each entry shows: shape icon + name + color swatch
- [ ] Verify "Line Marker (pair)" entry has the (pair) suffix
- [ ] Tap "Hazard Zone" → verify one square marker placed at crosshair, popup dismissed
- [ ] Tap "✦ Place Custom" → tap "Direction Arrow" → verify one arrow marker placed, popup dismissed
- [ ] Tap "✦ Place Custom" → tap "Line Marker (pair)" → verify line pair placement flow runs

### Test 3: Popup Dismissal
- [ ] Open "✦ Place Custom" popup → tap outside → verify popup dismisses
- [ ] Open "✦ Place Custom" popup → press Escape → verify popup dismisses
- [ ] Open "✦ Place Custom" popup → tap a type → verify marker placed AND popup dismissed

### Test 4: Default Type Setting
- [ ] Open Settings → Marker Types tab
- [ ] Verify "Default Marker Type" selector exists
- [ ] Verify it defaults to "Photo Marker"
- [ ] Change default to "Hazard Zone"
- [ ] Close Settings → tap "Place Marker" → verify Hazard Zone (square) marker placed
- [ ] Change default back to "Photo Marker" → tap "Place Marker" → verify Photo Marker placed
- [ ] Verify Line Marker is NOT in the default type dropdown
- [ ] Verify setting persists after page reload

### Test 5: Arrow Marker with Direction Slider
- [ ] Place an arrow marker via "Place Custom"
- [ ] Open its details modal → click Edit
- [ ] Verify direction section appears with slider and live preview
- [ ] Verify slider starts at 0° and preview shows arrow pointing up
- [ ] Drag slider to 90° → verify preview rotates to point right in real-time
- [ ] Drag slider to 180° → verify preview points down
- [ ] Drag slider to 270° → verify preview points left
- [ ] Verify slider "catches" or snaps lightly at cardinals (if implemented)
- [ ] Drag to 45° → verify value label shows "45°"
- [ ] Click Save → close and reopen → verify direction shows "45°" in view mode
- [ ] Verify arrow on map points at 45°

### Test 6: Type Change in Modal
- [ ] Open details for a Photo Marker → click Edit
- [ ] Change type to "Direction Arrow"
- [ ] Verify direction section appears with default 0°
- [ ] Click Save → verify marker now renders as arrow on map

### Test 7: Line Marker Type Protection
- [ ] Open details for a line marker → click Edit
- [ ] Verify type dropdown is disabled or shows warning
- [ ] Verify "Line marker type cannot be changed" message

### Test 8: Direction Slider Keyboard Accessibility
- [ ] Open an arrow marker in edit mode
- [ ] Focus the slider with Tab
- [ ] Press Right arrow → verify value increments by 1° and preview updates
- [ ] Press Shift+Right arrow → verify value increments by 15°
- [ ] Press Left arrow → verify value decrements by 1°
- [ ] Press Home → verify jumps to 0°
- [ ] Press End → verify jumps to 360°

### Test 9: Create New Type from Popup
- [ ] Tap "✦ Place Custom" → tap "+ Create New Type..."
- [ ] Verify the marker type definition modal opens
- [ ] Create a new type and save → verify popup refreshes with new type
- [ ] Select the new type → verify marker placed with new type

### Test 10: Mobile (Touch) Testing
- [ ] On mobile or emulated touch: tap "✦ Place Custom" → verify popup is touch-friendly
- [ ] Verify popup rows are at least 44px tall
- [ ] Verify color swatches are tappable (not too small)
- [ ] Verify popup works on iOS Safari
- [ ] Verify "Place Marker" single-tap works reliably on touch (no double-tap issues)
