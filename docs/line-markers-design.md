# Line Markers – Feature Design Document

## Overview

Line markers allow users to mark boundaries or zones on a map by placing pairs of connected markers. A common use case is field work where an area must be flagged as dangerous, restricted, or otherwise notable. Two line markers are placed at once; a line is drawn between them. Users drag each marker to the desired boundary points. For longer or more complex boundaries, users place multiple pairs.

---

## Goals

- Let users define linear boundaries on any map.
- Keep the UI simple: always work with a fixed pair of two markers per line.
- Provide a choice of line colour and an optional short caption along the line.
- Minimise IndexedDB schema changes and remain fully backwards compatible with existing SnapSpot exports.

---

## Non-Goals

- Chains of more than 2 connected markers (polygon/polyline) are out of scope.
- Line editing beyond dragging the two endpoints is out of scope.

---

## User Experience

### Placing a Line

1. User taps/clicks **Place Line** in the toolbar or menu.
2. A colour picker and optional caption input are presented in a compact dialog (reuse the existing modal system).
3. On confirmation SnapSpot places two line markers near the current view centre, slightly offset from each other, and draws a line between them.
4. The user drags the two endpoints to the desired positions using the existing marker-drag interaction.
5. Repeat for additional segments of the boundary.

### Visual Design

| Element | Appearance |
|---|---|
| Line marker pin | Diamond shape (rotated square), no number badge |
| Line between paired markers | Solid or semi-transparent coloured stroke, 3 px default width |
| Caption (if set) | Short text drawn centred on the line midpoint, same colour as the line, with a white shadow for legibility |
| Selected / editable state | Outline glow matching the line colour |

Line markers are visually distinct from photo markers (circle with number). They intentionally do not support photos.

### Interacting with a Line Marker

- **Drag** either endpoint to reposition it; the line redraws live.
- **Tap/click** an endpoint to open a compact details panel showing the colour, caption, and a **Delete pair** action that removes both markers at once.

---

## Data Model

### Principle: zero new DB object stores, no DB version bump

Line markers are stored as regular marker documents in the existing `markers` object store. Three optional fields are added to the existing marker schema:

| Field | Type | Description |
|---|---|---|
| `type` | `'line' \| undefined` | `'line'` for a line marker; `undefined` (absent) means a standard photo marker. Existing records are unaffected. |
| `lineGroupId` | `string \| undefined` | UUID shared by the two markers that form a pair. Used to find the partner when rendering the connecting line. |
| `lineColor` | `string \| undefined` | CSS colour string (e.g. `'#e53e3e'`). Defaults to `'#e53e3e'` (red) if absent. |
| `lineCaption` | `string \| undefined` | Short caption drawn along the line. Empty string or absent means no caption. |

The existing `description` field is repurposed as a human-visible label for the line marker (displayed in the details panel). For line markers the default description will be something like `"Line boundary"`.

### Example stored document

```json
{
  "id": "uuid-a",
  "mapId": "uuid-map",
  "x": 450,
  "y": 320,
  "description": "Dangerous zone – north edge",
  "photoIds": [],
  "createdDate": "2026-02-24T10:00:00.000Z",
  "lastModified": "2026-02-24T10:00:00.000Z",
  "type": "line",
  "lineGroupId": "uuid-group",
  "lineColor": "#e53e3e",
  "lineCaption": "Danger"
}
```

---

## Export / Import Compatibility

### Writing (export)

`lib/snapspot-data/writer.js` currently maps each marker to a fixed set of fields. It must be updated to also forward `type`, `lineGroupId`, `lineColor`, and `lineCaption` when they are present, so line markers survive a round-trip through an export file.

The change is additive: fields are included only when truthy/present, so existing export files for maps without line markers are byte-for-byte identical.

```js
// writer.js – updated marker mapping (abbreviated)
{
  id: marker.id,
  x: marker.x,
  y: marker.y,
  description: marker.description || '',
  photoIds: marker.photoIds || [],
  createdDate: marker.createdDate || now,
  // Conditionally include line-marker fields
  ...(marker.type       ? { type: marker.type }             : {}),
  ...(marker.lineGroupId ? { lineGroupId: marker.lineGroupId } : {}),
  ...(marker.lineColor  ? { lineColor: marker.lineColor }   : {}),
  ...(marker.lineCaption !== undefined && marker.lineCaption !== ''
       ? { lineCaption: marker.lineCaption }
       : {})
}
```

### Reading (import)

`lib/snapspot-data/parser.js` passes marker objects through to storage as-is after validation. The additional fields are simply preserved. No changes needed here.

`lib/snapspot-data/validator.js` should be updated to allow (not require) the new optional fields. The validator must not reject older files that lack these fields.

### Backwards Compatibility Summary

| Scenario | Behaviour |
|---|---|
| Old SnapSpot version opening a new export | Line markers appear as regular markers; no line is drawn, but no crash. |
| New SnapSpot version opening an old export | All markers have no `type` field → treated as photo markers, unchanged behaviour. |
| New export opened by new SnapSpot | Line markers render with their connecting line. Full fidelity. |

---

## Rendering Changes (`mapRenderer.js`)

### `renderMarkers()` – updated flow

```
1. Separate markers into: photoMarkers and lineMarkers.
2. Draw all connecting lines first (below markers):
   a. Group lineMarkers by lineGroupId.
   b. For each complete pair (2 members), compute screen coords for both,
      draw a stroked line in lineColor, optionally draw caption at midpoint.
   c. For incomplete pairs (1 member, e.g. partner deleted), render the
      orphan endpoint without a connecting line.
3. Draw all photo markers as before.
4. Draw all line marker endpoints on top of lines.
```

### `drawMarker()` – conditional branch

When `marker.type === 'line'`, skip the circle/number logic and instead draw a diamond shape:

```
ctx.save()
ctx.translate(x, y)
ctx.rotate(Math.PI / 4)  // 45° → square becomes diamond
ctx.fillRect(-r, -r, 2r, 2r)
ctx.strokeRect(-r, -r, 2r, 2r)
ctx.restore()
```

The diamond uses `lineColor` as both fill and stroke colour.

### Live redraw on drag

No extra work needed: the existing drag mechanism already calls `mapRenderer.render()` after each move event, which re-runs `renderMarkers()` and therefore redraws the line.

---

## New UI Components

### "Place Line" dialog

A minimal modal (similar pattern to the existing upload modal) presented before placing the pair:

- **Line colour** – a row of 5–6 preset swatches (red, orange, yellow, green, blue, purple) plus a small native `<input type="color">` for custom colours. Default: red.
- **Caption** – a single short text field (max ~40 chars, optional).
- **Place** / **Cancel** buttons.

Implementation location: `js/ui/line-marker-modal.js` (new file), registered in `js/ui/modals.js` following the existing pattern.

### Line marker details panel

Reuse the existing marker details modal structure but:

- Hide the photo section entirely for `type === 'line'` markers.
- Show colour swatch and caption fields as editable fields.
- Provide a **Delete pair** button that deletes both linked markers in a single operation.

The existing `marker-details-modal.js` will receive a `isLineMarker` flag and render conditionally.

---

## Module Changes Summary

| File | Change |
|---|---|
| `js/app-marker-photo-manager.js` | Add `placeLinePair()` function; update `deleteMarker()` to also delete the partner when `type === 'line'` |
| `js/mapRenderer.js` | Update `renderMarkers()` to draw lines before markers; update `drawMarker()` for diamond style |
| `js/ui/line-marker-modal.js` | **New file** – "Place Line" colour/caption dialog |
| `js/ui/modals.js` | Register `createLinePlacementModal()` |
| `js/ui/marker-details-modal.js` | Conditional rendering for line marker fields; Delete pair action |
| `js/app.js` | Wire up Place Line toolbar button/menu item |
| `lib/snapspot-data/writer.js` | Forward optional line-marker fields in export |
| `lib/snapspot-data/validator.js` | Allow (not require) new optional fields |
| `css/modals/line-marker.css` | **New file** – styles for colour swatches and diamond icon in modals |
| `css/main.css` | Import new stylesheet |
| `service-worker.js` | Add new JS/CSS files to `STATIC_ASSETS` |
| `index.html` | Add Place Line button/menu item to toolbar |

---

## Colour Palette

Six preset colours (chosen for visibility on typical map backgrounds):

| Name | Hex |
|---|---|
| Red (default) | `#e53e3e` |
| Orange | `#dd6b20` |
| Yellow | `#d69e2e` |
| Green | `#38a169` |
| Blue | `#3182ce` |
| Purple | `#805ad5` |

---

## Accessibility & Mobile Considerations

- Colour swatches are ≥44 px touch targets.
- Each swatch has an `aria-label` (e.g. "Red") and is keyboard focusable.
- The connecting line has sufficient contrast for the chosen colour on the map canvas.
- Diamond markers are sized consistently with the existing marker size settings (`normal`, `large`, `extraLarge`).

---

## Out-of-Scope / Future Ideas

- Polygon / multi-point boundaries.
- Line thickness control.
- Dashed or dotted line styles.
- Exporting line boundaries to SVG or GeoJSON.
