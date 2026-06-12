# Phase 2: Custom Marker Types — Definition UI

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1 complete

---

## Design Rationale

Most users will never create a custom marker type. The preset library (5 types) covers common scenarios. The UI should make toggling presets effortless, and custom type creation possible but out of the way.

**Key decisions:**
- **Preset library first** — toggle grid is the primary interaction. No forms needed for 95% of users.
- **Stripped-down custom form** — 4 fields (name, shape, color, label). No live preview, no size selector, no scope. Everything defaults sensibly.
- **All types global** — map-specific scoping is dropped for simplicity. Can be added later if demanded.
- **No live preview canvas** — the shape icons and color swatches provide sufficient visual feedback for a 4-field form.

---

## Goals

1. Add "Marker Types" tab to the Settings modal
2. Show preset library as a toggle grid
3. Allow color editing for built-in types (Photo Marker, Line Marker)
4. Simple "+ Add Custom Type" form (name, shape, color, label)
5. Default marker type selector
6. Export/Import type definitions (functional in Phase 5)

---

## UI Design Specification

### Settings Modal — Marker Types Tab

```
┌─────────────────────────────────────────────────┐
│ Settings                                    [X] │
├─────────────────────────────────────────────────┤
│ Prefs │ Storage │ Metadata │ Marker Types │ ··· │
├─────────────────────────────────────────────────┤
│                                                 │
│  Marker Types                                   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ☑ ● Photo Marker      (built-in, default)      │
│       Circle · #ef4444          [Edit Color]    │
│                                                 │
│  ☑ ◆ Line Marker       (built-in)               │
│       Diamond · #e53e3e         [Edit Color]    │
│                                                 │
│  ── Presets ────────────────────────────────   │
│                                                 │
│  ☑ ● Point of Interest  Circle  · #22c55e       │
│  ☑ ■ Hazard Zone        Square  · #f59e0b       │
│  ☑ ▲ Direction Arrow    Arrow   · #3b82f6       │
│                                                 │
│  ── Custom ─────────────────────────────────   │
│                                                 │
│  (none yet)                                     │
│                                                 │
│  [+ Add Custom Type]                            │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Default marker type:                           │
│  [● Photo Marker                    ▼]          │
│  Used when tapping "Place Marker".              │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  [Export Types]  [Import Types]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

Key behaviors:
- **Built-in types:** Toggle always on (locked). "Edit Color" button opens a color-only picker.
- **Preset types:** Toggle on/off. Name/shape/color displayed but not editable. Presets can be duplicated to create a custom variant (future enhancement).
- **Custom types:** Full row with Edit and Delete buttons.
- **Default type selector:** Dropdown at the bottom. Lists all enabled point-behavior types (excludes Line Marker). Changing it updates `app.defaultMarkerTypeId` and the "Place Marker" button tooltip.
- Only **enabled** types appear in the "Place Custom" popup (Phase 4).

### Custom Type Form (minimal)

Opened by "+ Add Custom Type" or "Edit" on a custom type:

```
┌──────────────────────────────┐
│ Add Custom Marker Type       │
│                              │
│  Name:                       │
│  [___________________]       │
│                              │
│  Shape:                      │
│  [● Circle] [■ Square]      │
│  [◆ Diamond] [▲ Arrow]      │
│                              │
│  Color:                      │
│  [🔴] [🟠] [🟡] [🟢] [🔵] [🟣] │
│  Custom: [#______]           │
│                              │
│  Label (optional):           │
│  [__] max 4 chars            │
│                              │
│  ☑ Show number on map        │
│                              │
│         [Cancel]  [Save]     │
└──────────────────────────────┘
```

What's NOT in this form (by design):
- ~~Size selector~~ → everything defaults to `'normal'`
- ~~Direction toggle~~ → auto-derived: arrow shape gets direction, others don't
- ~~Scope selector~~ → all types are `'global'`
- ~~Live preview canvas~~ → shape icons + color swatches are sufficient
- ~~Behavior selector~~ → all custom types are `behavior: 'point'` (line-pair is built-in only)

For **edit mode**: same form, pre-filled. Name and shape can be changed freely on custom types.

---

## Tasks

### ☐ Task 2.1: Add "Marker Types" Tab to Settings Modal

**Actions:**
1. Add a new tab button "Marker Types" to the settings modal tab bar in `js/ui/settings-modal.js`.

2. Create the marker types panel HTML:
   - **Built-in section:** Photo Marker and Line Marker rows. Toggle locked ON. "Edit Color" button.
   - **Presets section:** Toggle grid for Point of Interest, Hazard Zone, Direction Arrow. Each row shows shape icon, name, color swatch.
   - **Custom section:** User-created types with Edit and Delete buttons.
   - **"+ Add Custom Type" button** at the bottom of the list.
   - **Default type selector:** Dropdown listing all enabled point-behavior types. Excludes Line Marker.
   - **Export/Import buttons** (placeholder, functional in Phase 5).

3. Toggle behavior:
   - Built-in types: toggle is visually checked and disabled (cannot turn off).
   - Preset types: toggle freely. State persisted to `localStorage` keyed by type ID.
   - On toggle change, refresh the default type dropdown and notify Phase 4's Place Custom popup to refresh.

4. Load types from `app.storage.getAllMarkerTypeDefinitions()`. Apply enabled/disabled state from localStorage.

**Files to modify:**
- `js/ui/settings-modal.js`
- `css/modals/settings.css`

**Acceptance Criteria:**
- [ ] "Marker Types" tab appears in Settings
- [ ] Built-in types shown with locked toggle and "Edit Color" button
- [ ] Preset types toggle on/off, state persists across page reloads
- [ ] Custom types shown with Edit and Delete buttons
- [ ] Default type selector works and persists
- [ ] Export/Import buttons visible (non-functional until Phase 5)
- [ ] Empty state for custom section: subtle "No custom types" message
- [ ] Panel works on mobile (375px+)

---

### ☐ Task 2.2: Create Custom Type Form (minimal)

**Actions:**
1. Create `js/ui/marker-type-definition-modal.js` with a function:
   ```javascript
   export function createMarkerTypeForm({ definition, onSave, onCancel })
   ```
   - `definition` null → create mode
   - `definition` provided → edit mode (pre-filled)

2. Form fields (4 total):
   - **Name:** text input, required, max 100 chars, autofocused
   - **Shape:** 2×2 grid of icon buttons: ● Circle, ■ Square, ◆ Diamond, ▲ Arrow. Selected button highlighted. Default: circle.
   - **Color:** 6 preset swatches + custom hex input. Reuse pattern from `line-marker-details-modal.js`. Default: `#ef4444`.
   - **Label:** optional text input, max 4 chars, placeholder "e.g. HZ"

3. Implicit defaults (not in form):
   - `behavior: 'point'` (always — line-pair is built-in only)
   - `size: 'normal'` (always)
   - `supportsPhotos: true` (always for point behavior)
   - `scope: 'global'` (always)
   - `isPreset: false`
   - `isBuiltIn: false`

4. On Save:
   - Validate name non-empty
   - Build definition object with all implicit defaults
   - Call `onSave(definition)`

5. The form should be a compact panel, not a full modal — embeds directly in the Settings panel or opens as a small centered dialog.

**Files to create:**
- `js/ui/marker-type-definition-modal.js`

**Files to modify:**
- `css/modals/marker-type-definition.css` (new, or add to existing)

**Acceptance Criteria:**
- [ ] Form opens in create mode (empty) and edit mode (pre-filled)
- [ ] Shape picker: 2×2 grid, visual selection highlight
- [ ] Color: 6 swatches clickable, hex input syncs bidirectionally
- [ ] Label limited to 4 characters
- [ ] Save validates and builds correct definition with all implicit defaults
- [ ] Cancel discards changes
- [ ] Form fits without scrolling on most screens (compact layout)

---

### ☐ Task 2.3: Wire Up CRUD Callbacks

**Actions:**
1. In `js/app-settings.js`, add handler functions:
   - `handleTogglePreset(typeId, enabled)` — update localStorage
   - `handleEditBuiltInColor(typeId)` — opens a color-only picker (reuse swatch grid from form)
   - `handleAddCustomType()` — opens custom type form in create mode
   - `handleEditCustomType(typeId)` — opens custom type form in edit mode
   - `handleDeleteCustomType(typeId)` — confirm dialog, then delete via storage (with reference check)
   - `handleChangeDefaultType(typeId)` — update `app.defaultMarkerTypeId`, persist to localStorage
   - `handleExportMarkerTypes()` — Phase 5 placeholder
   - `handleImportMarkerTypes()` — Phase 5 placeholder

2. On save (create/edit):
   - For create: `app.storage.addMarkerTypeDefinition(definition)` → refresh list → notification
   - For edit: `app.storage.updateMarkerTypeDefinition(definition)` → refresh list → notification

3. On delete:
   - Confirm dialog
   - Try `app.storage.deleteMarkerTypeDefinition(id)`
   - If markers reference: show error with count
   - On success: refresh list, notification

4. After any CRUD: refresh the Place Custom popup (Phase 4) and default type dropdown.

**Files to modify:**
- `js/app-settings.js`

**Acceptance Criteria:**
- [ ] Toggling a preset persists and updates Place Custom popup
- [ ] Editing built-in color works and updates rendering
- [ ] Creating custom type: form → save → appears in list
- [ ] Editing custom type: form pre-filled → save → updates
- [ ] Deleting custom type: confirm → removed (or blocked if referenced)
- [ ] Changing default type updates toolbar button tooltip
- [ ] All operations show success/error notifications

---

### ☐ Task 2.4: CSS Styling

**Actions:**
1. Style the marker types panel:
   - Toggle rows with clear on/off state
   - Color swatch as small circle (12×12px) inline with text
   - Section dividers between built-in, preset, and custom groups
   - Built-in badge styling

2. Style the custom type form:
   - Shape picker: 2×2 grid of large icon buttons, selected state with border highlight
   - Color swatches: horizontal row with hover/active states
   - Compact layout (no scrolling needed)

3. Responsive:
   - Shape picker stays 2×2 on all screen sizes
   - Panel scrolls on very narrow screens

**Files to create/modify:**
- `css/modals/settings.css`
- `css/modals/marker-type-definition.css` (new)

**Acceptance Criteria:**
- [ ] Toggle rows visually clear (on/off distinguishable)
- [ ] Color swatches tappable at 12px+ size
- [ ] Shape picker buttons have clear selected state
- [ ] No layout breakage at 375px width

---

## Manual Testing Checklist

### Test 1: Preset Toggle
- [ ] Open Settings → Marker Types
- [ ] Toggle "Hazard Zone" OFF
- [ ] Open "Place Custom" popup → verify Hazard Zone is gone
- [ ] Toggle "Hazard Zone" ON
- [ ] Open "Place Custom" popup → verify Hazard Zone is back
- [ ] Reload page → verify toggle state persisted

### Test 2: Built-in Color Edit
- [ ] Click "Edit Color" on Photo Marker
- [ ] Pick green from swatches → Save
- [ ] Place a default marker → verify it renders green
- [ ] Reset color to red → verify

### Test 3: Create Custom Type
- [ ] Click "+ Add Custom Type"
- [ ] Name: "Test Square", Shape: Square, Color: Purple, Label: "TS"
- [ ] Save → verify appears in Custom section
- [ ] Open "Place Custom" popup → verify "Test Square" appears
- [ ] Select it → verify marker placed as purple square with "TS" label

### Test 4: Edit Custom Type
- [ ] Click Edit on "Test Square"
- [ ] Change name to "Test Diamond", shape to Diamond
- [ ] Save → verify updated in list

### Test 5: Delete Custom Type
- [ ] Click Delete on "Test Square"
- [ ] Confirm → verify removed from list
- [ ] Open "Place Custom" popup → verify type is gone

### Test 6: Delete With References
- [ ] (After Phase 4) Place markers using a custom type
- [ ] Try to delete that type
- [ ] Verify error: "Cannot delete: N markers use this type"

### Test 7: Default Type Selector
- [ ] Change default to "Point of Interest"
- [ ] Tap "Place Marker" → verify green circle placed
- [ ] Change default back to "Photo Marker"
- [ ] Tap "Place Marker" → verify red circle placed
- [ ] Reload page → verify default persists

### Test 8: Form Validation
- [ ] Open custom type form, leave name empty, click Save → verify error
- [ ] Enter 5 chars in label → verify prevented at 4
- [ ] Enter invalid hex in color → verify rejected or corrected
