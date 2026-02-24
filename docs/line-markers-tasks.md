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

## Phase 3 – Placement & Interaction

### Tasks

- [ ] **3.1 – `js/app-marker-photo-manager.js` – add `placeLinePair()`**
  ```
  async placeLinePair(app):
    - Generate a shared lineGroupId (crypto.randomUUID()).
    - Compute two screen positions offset from the canvas centre (e.g. ±15 % of canvas width).
    - Convert both to map coordinates via screenToMap().
    - Build two marker objects with type='line', lineGroupId, lineColor='#e53e3e',
      lineCaption='', description='Line boundary'.
    - Save both via app.storage.addMarker() in sequence.
    - Push both to app.markers.
    - Ensure markers are in editable/unlocked state so the user can drag immediately
      (call app.mapRenderer.setMarkersEditable(true) or the equivalent unlock mechanism).
    - Call app.mapRenderer.setMarkers() and app.mapRenderer.render().
    - Show a brief notification: 'Line placed – drag the endpoints to position it.'.
  ```
  No modal is opened during placement.

- [ ] **3.2 – `js/app-marker-photo-manager.js` – update `deleteMarker()`**
  After deleting a marker, check if it had `type === 'line'` and a `lineGroupId`. If so, find the partner in `app.markers` and delete it too (storage + local array), keeping them in sync.

- [ ] **3.3 – `js/app.js`**
  Wire up a **Place Line** toolbar action that calls `placeLinePair(app)` directly, with no intermediate modal.

- [ ] **3.4 – `index.html`**
  Add a **Place Line** button to the toolbar/menu alongside the existing **Place Marker** button.

### Manual Tests – Phase 3

- Open a map and tap **Place Line**. Verify two diamond endpoints appear immediately with a red connecting line – no dialog is shown.
- Verify the markers are in the unlocked/editable state after placement so they can be dragged without any extra step.
- Drag each endpoint; verify the connecting line redraws live.
- Tap a line marker endpoint to confirm a details modal opens (can be a stub at this stage).

---

## Phase 4 – Line Marker Details Modal & Deletion

### Tasks

- [ ] **4.1 – `js/ui/line-marker-details-modal.js`** *(new file)*
  Create `createLineMarkerDetailsModal(modalManager, markerData, callbacks)`. The modal contains:
  - **Line label** – editable text field bound to `marker.description`. Saved via `onSaveLabel(id, newLabel)`.
  - **Colour swatches** – a row of six preset swatches (see design doc palette) plus a native `<input type="color">`. Pre-selects the marker's current `lineColor`. Saved via `onSaveColor(id, newColor)` which updates **both** markers in the pair.
  - **Caption** – editable short text field (max 40 chars) bound to `marker.lineCaption`. Saved via `onSaveCaption(id, newCaption)` which also updates the partner.
  - **Delete pair** button – calls `onDeletePair(id)` and closes the modal.
  - **Close** button / backdrop click – calls `onClose()`.

  `js/ui/marker-details-modal.js` is **not modified**.

- [ ] **4.2 – `css/modals/line-marker-details.css`** *(new file)*
  Styles for colour swatches (≥44 px, rounded, border on focus/active), the modal layout, and the diamond icon used as a visual hint.

- [ ] **4.3 – `css/main.css`**
  Import `css/modals/line-marker-details.css`.

- [ ] **4.4 – `js/ui/modals.js`**
  Add `createLineMarkerDetailsModal()` as a method on `ModalManager`, delegating to the new module.

- [ ] **4.5 – `js/app-marker-photo-manager.js` – `showMarkerDetails()` update**
  At the top of the function, check `if (marker.type === 'line')`. If true, call `app.modalManager.createLineMarkerDetailsModal(...)` with the appropriate callbacks and return early. The existing photo-marker code path is unchanged.

- [ ] **4.6 – Implement save callbacks in `app-marker-photo-manager.js`**
  - `onSaveLabel`: call `app.storage.updateMarker()` for the tapped endpoint; update local `app.markers` entry; re-render.
  - `onSaveColor`: call `app.storage.updateMarker()` for **both** markers in the pair (find partner by `lineGroupId` in `app.markers`); update both local objects; re-render.
  - `onSaveCaption`: same pair-update pattern as colour.
  - `onDeletePair`: delegate to `deleteMarker()` (which already handles partner deletion after task 3.2).

### Manual Tests – Phase 4

- Tap a line marker endpoint; verify the **Line Marker Details** modal opens (not the regular marker details modal).
- Verify the modal shows the current label, correct colour swatch pre-selected, and caption field.
- Edit the caption and save; verify the caption text appears on the canvas midline immediately.
- Change the colour to blue; verify the line and both endpoints update to blue immediately.
- Tap **Delete pair** on one endpoint; verify both endpoints and the connecting line disappear.
- Delete one endpoint via DevTools (direct storage delete) and verify the orphan endpoint renders without a connecting line and without throwing an error.

---

## Phase 5 – Polish, Linting & Service Worker

### Tasks

- [ ] **5.1 – Run linter**  
  `npx standard --fix` on all modified/new JS files. Resolve any remaining warnings manually.

- [ ] **5.2 – `service-worker.js`**
  Add `js/ui/line-marker-details-modal.js` and `css/modals/line-marker-details.css` to `STATIC_ASSETS`. Bump the cache version string.

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
