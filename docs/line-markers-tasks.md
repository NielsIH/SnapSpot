# Line Markers – Implementation Tasks

> Related design document: [line-markers-design.md](line-markers-design.md)

Work is organised into four phases. Complete each phase in order and verify the manual tests before moving on.

---

## Phase 1 – Data Layer & Export Compatibility

### Tasks

- [ ] **1.1 – `lib/snapspot-data/writer.js`**  
  In the `markers.map()` call inside `buildExport()`, add conditional spread for the four new optional fields: `type`, `lineGroupId`, `lineColor`, `lineCaption`. Fields are included only when present and non-empty, preserving identical output for existing maps.

- [ ] **1.2 – `lib/snapspot-data/validator.js`**  
  Confirm the validator does not reject marker objects that contain extra fields. If strict validation exists, add the four new fields as optional/allowed entries. Do not make them required.

- [ ] **1.3 – `js/storage.js`**  
  In `addMarker()`, update the constructed marker object to also forward `type`, `lineGroupId`, `lineColor`, and `lineCaption` from `markerData` when present. No DB version bump needed – no schema change, just additional optional document fields.

### Manual Tests – Phase 1

- Export a map that has no line markers and verify the JSON output is unchanged (no new fields present).
- Manually insert a line marker document into IndexedDB (using DevTools) with the four new fields and verify it round-trips through export/import without data loss.

---

## Phase 2 – Rendering

### Tasks

- [ ] **2.1 – `js/mapRenderer.js` – `renderMarkers()` refactor**  
  Split the marker array into `photoMarkers` (no `type` or `type !== 'line'`) and `lineMarkers` (`type === 'line'`). Call a new `renderLineConnectors()` method first, then render photo markers, then line marker endpoints.

- [ ] **2.2 – `js/mapRenderer.js` – add `renderLineConnectors()`**  
  Group `lineMarkers` by `lineGroupId`. For each complete pair:
  - Convert both endpoints to screen coordinates.
  - Draw a stroked line using `lineColor` (fall back to `'#e53e3e'` if absent), `lineWidth = 3`, `lineCap = 'round'`.
  - If `lineCaption` is set and non-empty, draw the text centred at the line midpoint: white shadow pass first, then coloured text pass.  
  Orphan endpoints (partner not found/not in view) are rendered without a connecting line.

- [ ] **2.3 – `js/mapRenderer.js` – `drawMarker()` diamond branch**  
  At the top of `drawMarker()`, check `if (marker.type === 'line')`. If true, skip all existing circle/number logic and instead:
  - Determine colour from `marker.lineColor` (or default red).
  - Apply editable-state outline (glow) using `this.markersAreEditable`.
  - Draw a diamond (rotated square) using `r` from the current marker size settings.
  - Return early; do not fall through to photo-marker drawing.

### Manual Tests – Phase 2

- Temporarily hard-code two line markers into `app.markers` with the same `lineGroupId` and verify the connecting line and diamond endpoints appear on canvas.
- Pan and zoom the map; verify the line and endpoints stay correctly positioned.
- Rotate the map; verify the line redraws correctly under rotation.
- Test the `large` and `extraLarge` marker size settings; verify line endpoints scale accordingly.

---

## Phase 3 – Placement UI & Interaction

### Tasks

- [ ] **3.1 – `js/ui/line-marker-modal.js`** *(new file)*  
  Create `createLinePlacementModal(modalManager, onPlace, onCancel)`. The modal contains:
  - A row of six colour swatches (see design doc colour palette) with `aria-label` and keyboard support. Selected swatch has an active outline. Default selection: red.
  - A native `<input type="color">` for custom colour input, synced with the swatch selection.
  - A text input for an optional caption (max 40 chars, `placeholder="Short caption (optional)"`).
  - **Place** button: calls `onPlace({ color, caption })` and closes the modal.
  - **Cancel** button: calls `onCancel()` and closes the modal.

- [ ] **3.2 – `css/modals/line-marker.css`** *(new file)*  
  Styles for colour swatches (≥44 px, rounded, border on focus/active), the modal layout, and the diamond icon used as a visual hint inside the modal.

- [ ] **3.3 – `css/main.css`**  
  Import `css/modals/line-marker.css`.

- [ ] **3.4 – `js/ui/modals.js`**  
  Add `createLinePlacementModal()` as a method on `ModalManager` (delegating to the new module), following the existing pattern used for `createUploadModal`, etc.

- [ ] **3.5 – `js/app-marker-photo-manager.js` – add `placeLinePair()`**  
  ```
  async placeLinePair(app, color, caption):
    - Generate a shared lineGroupId (crypto.randomUUID()).
    - Compute two screen positions offset from the canvas centre (e.g. ±15 % of canvas width).
    - Convert both to map coordinates via screenToMap().
    - Build two marker objects with type='line', lineGroupId, lineColor, lineCaption, description='Line boundary'.
    - Save both via app.storage.addMarker() in sequence.
    - Push both to app.markers, call app.mapRenderer.setMarkers() and app.mapRenderer.render().
    - Show a success notification.
  ```

- [ ] **3.6 – `js/app-marker-photo-manager.js` – update `deleteMarker()`**  
  After deleting a marker, check if it had `type === 'line'` and a `lineGroupId`. If so, find the partner in `app.markers` and delete it too (storage + local array), keeping them in sync.

- [ ] **3.7 – `js/app.js`**  
  Wire up a **Place Line** toolbar action:
  - Call `app.modalManager.createLinePlacementModal(...)`.
  - In the `onPlace` callback call `placeLinePair(app, color, caption)`.

- [ ] **3.8 – `index.html`**  
  Add a **Place Line** button to the toolbar/menu alongside the existing **Place Marker** button.

### Manual Tests – Phase 3

- Open a map and tap **Place Line**. Verify the modal appears with colour swatches and caption field.
- Select a non-default colour, enter a caption, tap **Place**. Verify two diamond markers appear with a connecting line in the chosen colour and the caption text rendered midline.
- Tap **Cancel** and verify nothing is placed.
- Tap a line marker endpoint to confirm the marker details modal opens (can be a stub at this stage).
- Drag a line endpoint to a new position; verify the line redraws.

---

## Phase 4 – Line Marker Details & Deletion

### Tasks

- [ ] **4.1 – `js/ui/marker-details-modal.js`**  
  Accept an additional `isLineMarker` flag (derived from `marker.type === 'line'`). When true:
  - Hide the photo gallery / add photo section.
  - Replace the generic description field label with "Line label".
  - Show a read-only colour swatch reflecting `marker.lineColor`.
  - Show an editable caption field reflecting `marker.lineCaption` (saved on blur/submit via existing `onSaveDescription`-style callback).
  - Replace the existing **Delete** button with **Delete pair** (label and tooltip updated).

- [ ] **4.2 – `js/app-marker-photo-manager.js` – `showMarkerDetails()` update**  
  When opening details for a line marker, pass `isLineMarker: true` and `lineColor`/`lineCaption` to the modal constructor. Wire the **Delete pair** callback to `deleteMarker()` (which already handles partner deletion after task 3.6).

- [ ] **4.3 – Save caption edits**  
  The caption field save should call `app.storage.updateMarker()` with `{ lineCaption: newCaption }` and update the local marker object in `app.markers`, then re-render.

- [ ] **4.4 – Save colour edits (stretch goal)**  
  If time permits, allow the user to change the line colour from the details modal via a compact swatch row, saving via `app.storage.updateMarker()` and re-rendering. This is optional for the initial implementation.

### Manual Tests – Phase 4

- Tap a line marker endpoint; verify the details modal opens showing label, colour swatch, and caption (no photo section).
- Edit the caption and save; verify the caption updates on the canvas immediately.
- Tap **Delete pair** on one endpoint; verify both endpoints and the connecting line disappear.
- Delete one endpoint via a non-pair path (direct storage delete in DevTools) and verify the orphan endpoint renders without a connecting line (no crash).

---

## Phase 5 – Polish, Linting & Service Worker

### Tasks

- [ ] **5.1 – Run linter**  
  `npx standard --fix` on all modified/new JS files. Resolve any remaining warnings manually.

- [ ] **5.2 – `service-worker.js`**  
  Add `js/ui/line-marker-modal.js` and `css/modals/line-marker.css` to `STATIC_ASSETS`. Bump the cache version string.

- [ ] **5.3 – Offline test**  
  DevTools → Application → Service Workers → Offline. Load the app, place a line, pan/zoom, delete. Verify everything works offline.

- [ ] **5.4 – Cross-platform smoke test**  
  Test on at least: Chrome desktop, Chrome Android (or Firefox Android), and Safari iOS.

- [ ] **5.5 – Update `README.md`**  
  Add a brief description of the Line Markers feature under the relevant section.

- [ ] **5.6 – Remove `docs/line-markers-design.md` and `docs/line-markers-tasks.md`**  
  Per project conventions, planning docs are removed after the feature is merged.

---

## Definition of Done

- All tasks above are checked.
- All manual tests pass on Chrome desktop and at least one mobile browser.
- No `npx standard` errors.
- Service worker caches the new assets.
- `README.md` is updated.
- Planning docs removed.
- PR is opened targeting `main` with a description linking the relevant work items.
