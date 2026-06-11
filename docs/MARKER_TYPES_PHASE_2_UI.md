# Phase 2: Custom Marker Types — Definition UI

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1 complete

---

## Goals

Build the user interface for creating and managing marker type definitions:
1. Add "Marker Types" section to the Settings modal
2. Create a modal for adding/editing marker type definitions
3. Implement shape picker with visual icons
4. Implement color picker (reuse pattern from line marker details)
5. Add live preview canvas showing the marker as it will appear
6. Handle global vs map-specific scope
7. Protect built-in types from deletion and shape changes

---

## UI Design Specification

### Settings Modal — Marker Types Section

**New tab in settings:** "Marker Types" (alongside Preferences, Storage, Metadata, etc.)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Settings                                   [X]  │
├─────────────────────────────────────────────────┤
│ Prefs │ Storage │ Metadata │ Marker Types │ ··· │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Global Types] [Map-Specific Types]            │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Marker Type Definitions                 │   │
│  │                                         │   │
│  │  ● Photo Marker (default)               │   │
│  │     Circle · #ef4444 · Normal           │   │
│  │     [Edit Color]                        │   │
│  │                                         │   │
│  │  ◆ Line Marker (default)                │   │
│  │     Diamond · #e53e3e · Normal          │   │
│  │     [Edit Color]                        │   │
│  │                                         │   │
│  │  ▲ Direction Arrow                      │   │
│  │     Arrow · #3b82f6 · Normal · Rotatable│   │
│  │     [Edit] [Delete]                     │   │
│  │                                         │   │
│  │  ■ Hazard Zone                          │   │
│  │     Square · #f59e0b · Large            │   │
│  │     [Edit] [Delete]                     │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [+ Create Marker Type]                         │
│                                                 │
│  [Export Types] [Import Types]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Marker Type Definition Modal

```
┌──────────────────────────────────────────────┐
│ Create Marker Type                      [X]  │
├──────────────────────────────────────────────┤
│                                              │
│  Name: *                                     │
│  [Direction Arrow___________________]        │
│                                              │
│  Shape: *                                    │
│  [● Circle] [■ Square] [◆ Diamond] [▲ Arrow]│
│    (visual radio buttons with shape icons)   │
│                                              │
│  Color:                                      │
│  [🔴] [🟠] [🟡] [🟢] [🔵] [🟣]           │
│  (preset swatches, clickable)                │
│  Custom: [#3b82f6________] (hex input)       │
│                                              │
│  Size:                                       │
│  [● Small] [● Normal] [● Large]             │
│    (radio buttons with preview dots)         │
│                                              │
│  Map Label (optional):                       │
│  [Dir_] (max 4 characters)                   │
│                                              │
│  Direction:  ☑ This marker can be rotated   │
│  (auto-checked and locked for arrow shape)   │
│                                              │
│  Scope:                                      │
│  ◉ Global (all maps)                         │
│  ○ This Map Only                             │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │         Live Preview                 │   │
│  │                                      │   │
│  │         ▲   (rendered marker)        │   │
│  │       Dir                            │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│            [Cancel]  [Save Type]             │
│                                              │
└──────────────────────────────────────────────┘
```

**Note for edit mode:** When editing a built-in type, the shape picker is locked/disabled. Only color and size can be changed. The delete button is hidden.

---

## Tasks

### ☐ Task 2.1: Add "Marker Types" Tab to Settings Modal

**Actions:**
1. Add a new tab button "Marker Types" to the settings modal tab bar in `js/ui/settings-modal.js`
2. Create the marker types panel HTML structure:
   - Sub-tabs: "Global Types" / "Map-Specific Types"
   - List container for type definition cards
   - "Create Marker Type" button
   - "Export Types" / "Import Types" buttons (functional in Phase 5)
3. Each type card shows:
   - Shape icon (use Unicode: ● ■ ◆ ▲)
   - Name (with "(default)" badge for built-in types)
   - Properties: shape name, color swatch, size
   - For arrow types: also show "↻" icon to indicate rotatable
   - Edit button (for built-in: "Edit Color" label)
   - Delete button (hidden for built-in types)
4. Wire up the sub-tab switching (global vs map-specific)
5. Load and display definitions from `app.storage`

**Files to modify:**
- `js/ui/settings-modal.js`
- `css/modals/settings.css` (if styling needed)

**Files to create:**
- `js/ui/marker-type-definition-modal.js` (in Task 2.2)

**Acceptance Criteria:**
- [ ] "Marker Types" tab appears in settings
- [ ] Global and map-specific sub-tabs switch correctly
- [ ] Built-in types shown with "(default)" badge and limited actions
- [ ] Custom types show full edit/delete actions
- [ ] Type cards display shape icon, name, color, size correctly
- [ ] Empty state: "No custom marker types defined yet" message

---

### ☐ Task 2.2: Create Marker Type Definition Modal

**Actions:**
1. Create new file: `js/ui/marker-type-definition-modal.js`

2. Implement `MarkerTypeDefinitionModal` class (or function-based like existing modals):
   - `createMarkerTypeDefinitionModal({ definition, onSave, onCancel, storage })` 
   - If `definition` is null → create mode
   - If `definition` is provided → edit mode

3. Modal content:
   - **Name input:** text input, required, max 100 chars, focused on open
   - **Shape picker:** 4 visual radio buttons with shape icons:
     ```
     [● Circle] [■ Square] [◆ Diamond] [▲ Arrow]
     ```
     Each button shows the shape + name. Selected button has highlighted border.
     When a shape is selected, update the live preview.
     For built-in types in edit mode: shape picker is disabled/read-only.
   
   - **Color picker:** Reuse the pattern from `js/ui/line-marker-details-modal.js`:
     - 6 preset color swatches: Red (#e53e3e), Orange (#f59e0b), Yellow (#eab308), Green (#22c55e), Blue (#3b82f6), Purple (#a855f7)
     - Custom hex color input below swatches
     - Clicking a swatch sets the color and updates live preview
     - Hex input updates on swatch click, and vice versa
   
   - **Size selector:** 3 radio buttons with visual preview dots:
     ```
     [● Small] [● Normal] [● Large]
     ```
     (Using different sized dots for visual distinction)
   
   - **Map Label:** Optional text input, max 4 characters. Placeholder: "e.g., Dir"
     Shown below in muted text: "Displayed on the map next to the marker"
   
   - **Direction toggle:** Checkbox "This marker can be rotated"
     - Auto-checked and disabled when shape is 'arrow'
     - Hidden/not shown for non-arrow shapes (or shown but disabled)
     - Decision: show it disabled for non-arrow to communicate the capability
   
   - **Scope:** Radio buttons "Global (all maps)" / "This Map Only"
     - "This Map Only" only available when a map is loaded
     - If no map loaded, default to global and disable the map-specific option
   
   - **Live preview canvas:** A small canvas element (~120×120px) that renders the marker:
     - Draws the selected shape with selected color and size
     - Shows the label text if provided
     - For arrow shape with hasDirection: shows arrow pointing up (0°) at rest
     - Updates instantly when any property changes
   
   - **Footer:** Cancel and Save buttons
     - Save validates and calls `onSave(definition)`
     - Cancel calls `onCancel()`

4. Implement live preview rendering:
   - Use a 2D canvas context in a small canvas element
   - Listen for changes on all inputs and re-render
   - Circle: ctx.arc()
   - Square: ctx.fillRect()
   - Diamond: ctx.save() → ctx.rotate(Math.PI/4) → ctx.fillRect() → ctx.restore()
   - Arrow: draw triangle (arrowhead) + line (stem)

**Files to create:**
- `js/ui/marker-type-definition-modal.js`

**Acceptance Criteria:**
- [ ] Modal opens for create (empty) and edit (pre-filled) modes
- [ ] Shape picker shows 4 visual options, selection updates preview
- [ ] Color swatches clickable, hex input syncs bidirectionally
- [ ] Size selector updates preview marker size
- [ ] Label input limited to 4 chars, preview shows label
- [ ] Direction toggle auto-checked for arrow, disabled for others
- [ ] Scope radio buttons work correctly
- [ ] Live preview updates instantly on any change
- [ ] Save validates required fields (name, shape, color, scope)
- [ ] For built-in types: shape locked, delete button hidden

---

### ☐ Task 2.3: Wire Up CRUD Callbacks in app-settings.js

**Actions:**
1. In `js/app-settings.js`, add handler functions for marker type CRUD:
   - `handleCreateMarkerType()` — Opens definition modal in create mode
   - `handleEditMarkerType(typeId)` — Opens definition modal in edit mode, pre-filled
   - `handleDeleteMarkerType(typeId)` — Confirm dialog, then delete via storage
   - `handleExportMarkerTypes()` — Functional in Phase 5 (placeholder for now)
   - `handleImportMarkerTypes()` — Functional in Phase 5 (placeholder for now)

2. On save:
   - For create: call `app.storage.addMarkerTypeDefinition(definition)` → refresh list
   - For edit: call `app.storage.updateMarkerTypeDefinition(definition)` → refresh list
   - Show success notification
   - Close the definition modal (or keep open if user wants to create another?)

3. On delete:
   - Show confirmation dialog: "Delete '{name}' marker type? This cannot be undone."
   - Try `app.storage.deleteMarkerTypeDefinition(id)`
   - If markers reference this type, show error: "Cannot delete: N markers use this type"
   - On success, refresh list and show notification

4. Refresh the marker types list after any CRUD operation.

**Files to modify:**
- `js/app-settings.js`

**Acceptance Criteria:**
- [ ] Create flow: button → modal → fill → save → appears in list → notification
- [ ] Edit flow: click edit → modal pre-filled → modify → save → list updated
- [ ] Delete flow: click delete → confirm → deleted from list → notification
- [ ] Delete blocked when markers reference the type
- [ ] Error notifications for failed operations
- [ ] Success notifications for successful operations

---

### ☐ Task 2.4: Add CSS Styling

**Actions:**
1. Create or update CSS for marker type UI elements:
   - Shape picker radio buttons (styled as icon cards)
   - Color swatch grid
   - Size selector with visual dots
   - Type definition cards in the list
   - Live preview canvas border
   - Built-in type badge styling

2. Ensure responsive design:
   - Shape picker: 2×2 grid on mobile, 4-in-row on desktop
   - Color swatches: flexible grid
   - Modal scrolls on small screens

**Files to create/modify:**
- `css/modals/marker-type-definition.css` (new)
- `css/modals/settings.css` (update if needed)
- `css/modals/responsive.css` (update if needed)

**Acceptance Criteria:**
- [ ] Shape picker looks good on desktop and mobile
- [ ] Color swatches are clearly clickable with hover/active states
- [ ] Live preview has subtle border and background
- [ ] Built-in badge visually distinct
- [ ] No layout breakage at 375px width

---

## Manual Testing Checklist

### Test 1: Create Marker Type
- [ ] Open Settings → Marker Types
- [ ] Click "Create Marker Type"
- [ ] Fill in name: "Test Arrow"
- [ ] Select "Arrow" shape
- [ ] Verify direction toggle auto-checks and locks
- [ ] Pick blue color from swatches
- [ ] Select "Large" size
- [ ] Enter label "Tst" (4 chars)
- [ ] Verify live preview shows blue arrow with "Tst" label
- [ ] Select scope "Global"
- [ ] Click Save
- [ ] Verify type appears in global types list
- [ ] Verify notification "Marker type created"

### Test 2: Edit Custom Type
- [ ] Click Edit on "Test Arrow"
- [ ] Change color to green via hex input
- [ ] Verify live preview updates
- [ ] Change size to "Small"
- [ ] Click Save
- [ ] Verify updated in list

### Test 3: Edit Built-in Type
- [ ] Click "Edit Color" on "Photo Marker"
- [ ] Verify shape picker is locked/disabled
- [ ] Verify delete button is hidden
- [ ] Change color to amber
- [ ] Click Save
- [ ] Verify color updated, shape unchanged

### Test 4: Delete Custom Type
- [ ] Click Delete on "Test Arrow"
- [ ] Confirm deletion in dialog
- [ ] Verify type removed from list

### Test 5: Delete With References
- [ ] (After Phase 4) Create markers using a custom type
- [ ] Try to delete that type
- [ ] Verify error: "Cannot delete: N markers use this type"

### Test 6: Map-Specific Scope
- [ ] With a map loaded, create a type with "This Map Only" scope
- [ ] Switch to a different map
- [ ] Open Settings → Marker Types → Map-Specific
- [ ] Verify the type is NOT visible for the other map

### Test 7: Label Validation
- [ ] Try entering more than 4 characters in label — should be prevented
- [ ] Try saving with empty name — should show validation error

### Test 8: Responsive
- [ ] Open on mobile (375px viewport)
- [ ] Shape picker should be 2×2 grid
- [ ] Modal should scroll without overflow
