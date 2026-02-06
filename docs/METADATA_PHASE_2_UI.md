# Phase 2: Metadata Definition UI

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1 complete

---

## Goals

Build user interface for creating and managing metadata field definitions:
1. Add "Metadata Definitions" tab to Settings modal
2. Create UI for adding/editing/deleting field definitions
3. Implement field configuration (name, type, scope, applies-to)
4. Add preview/test functionality
5. Handle global vs map-specific metadata
6. Responsive design for desktop and mobile

---

## UI Design Specification

### Settings Modal Structure

**New Tab:** "Metadata Definitions" (alongside existing Preferences, Storage, etc.)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Settings                               [X]  │
├─────────────────────────────────────────────┤
│ Preferences │ Storage │ Metadata │ About    │
├─────────────────────────────────────────────┤
│                                             │
│  [Global Fields] [Map-Specific Fields]      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Global Metadata Definitions          │  │
│  │                                      │  │
│  │  ☐ Inscription Author (text)        │  │
│  │     Applies to: Marker, Photo       │  │
│  │     [Edit] [Delete]                 │  │
│  │                                      │  │
│  │  ☐ Date Documented (date)           │  │
│  │     Applies to: Map, Marker, Photo  │  │
│  │     [Edit] [Delete]                 │  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [+ Add Field Definition]                   │
│                                             │
│  [Export Definitions] [Import Definitions]  │
│                                             │
└─────────────────────────────────────────────┘
```

### Field Definition Form (Modal within Modal)

```
┌──────────────────────────────────────────┐
│ Create Metadata Field               [X] │
├──────────────────────────────────────────┤
│                                          │
│  Field Name: *                           │
│  [________________]                      │
│                                          │
│  Description:                            │
│  [________________________________]      │
│  [________________________________]      │
│                                          │
│  Field Type: *                           │
│  [▼ Text         ]                       │
│                                          │
│  Applies To: * (check at least one)      │
│  ☐ Map   ☐ Marker   ☐ Photo            │
│                                          │
│  Scope: *                                │
│  ◉ Global (all maps)                     │
│  ○ This Map Only                         │
│                                          │
│  ☐ Required Field                        │
│                                          │
│  [For 'select' type only:]               │
│  Options: (one per line)                 │
│  [Option 1____________]                  │
│  [Option 2____________]                  │
│  [+ Add Option]                          │
│                                          │
│         [Cancel]  [Save Definition]      │
│                                          │
└──────────────────────────────────────────┘
```

---

## Tasks

### ☐ Task 2.1: Add Metadata Tab to Settings Modal

**Actions:**
1. Update `js/ui/settings-modal.js`:
   - Add "Metadata" tab button
   - Add tab content container
   - Implement tab switching

2. Update `css/modals/settings.css`:
   - Style metadata tab button
   - Style metadata tab content area
   - Responsive styles for mobile

3. Add event listeners:
   - Tab click to switch to metadata view
   - Load metadata definitions when tab opens

**Files to modify:**
- `js/ui/settings-modal.js`
- `css/modals/settings.css`

**Acceptance Criteria:**
- [ ] New "Metadata" tab appears in settings modal
- [ ] Tab switches correctly when clicked
- [ ] Tab content area renders properly
- [ ] Responsive on mobile (tabs stack or scroll)

---

### ☐ Task 2.2: Create Metadata Definitions List View

**Actions:**
1. Implement `renderMetadataDefinitions()` method in settings modal:
   - Fetch all global definitions
   - Fetch map-specific definitions (if map is active)
   - Group by scope (Global vs Map-Specific)
   - Render as list with details

2. Display for each definition:
   - Field name
   - Field type (badge/pill)
   - Applies to (list of entity types)
   - Description (truncated with expand)
   - Required indicator
   - Edit and Delete buttons

3. Add empty state:
   - "No metadata fields defined yet"
   - "Add your first field to get started" message
   - CTA button to add field

4. Add filter/toggle:
   - [ ] Show Global Fields
   - [ ] Show Map-Specific Fields
   - Default: both shown, with sections

**Files to modify:**
- `js/ui/settings-modal.js`
- `css/modals/settings.css`

**Acceptance Criteria:**
- [ ] Definitions render in organized list
- [ ] Empty state displays correctly
- [ ] Edit/Delete buttons for each definition
- [ ] Visual distinction between global and map-specific
- [ ] Type badges are color-coded (text, number, date, boolean, select)

---

### ☐ Task 2.3: Create "Add/Edit Definition" Form Modal

**Actions:**
1. Create new modal or sub-modal for definition form
2. Implement form fields:
   - **Field Name** (text input, required, max 100 chars)
   - **Description** (textarea, optional, max 500 chars)
   - **Field Type** (dropdown: text, number, date, boolean, select)
   - **Applies To** (checkboxes: Map, Marker, Photo, at least one required)
   - **Scope** (radio buttons: Global, This Map Only)
   - **Required** (checkbox)
   - **Options** (for select type only, dynamic list of text inputs)

3. Add conditional rendering:
   - Show "Options" section only when fieldType === 'select'
   - Disable "This Map Only" if no active map

4. Implement validation:
   - Field name required and non-empty
   - At least one "Applies To" checked
   - For select type, at least 2 options
   - Show validation errors inline

5. Add "Preview" section:
   - Show what the field will look like when entering data
   - Update in real-time as user configures

**Files to modify:**
- `js/ui/settings-modal.js` (or new `js/ui/metadata-definition-modal.js`)
- `css/modals/settings.css` (or new `css/modals/metadata-definition.css`)

**Acceptance Criteria:**
- [ ] Form renders with all required fields
- [ ] Field Type dropdown changes options visibility
- [ ] Applies To checkboxes require at least one
- [ ] Scope radio buttons work correctly
- [ ] Select type shows dynamic options inputs
- [ ] Validation messages display properly
- [ ] Preview updates in real-time

---

### ☐ Task 2.4: Implement Save Definition Logic

**Actions:**
1. Add `saveMetadataDefinition()` method:
   - Collect form data
   - Validate all fields
   - Generate ID if new (crypto.randomUUID())
   - Set createdDate for new, update lastModified
   - Call `app.storage.addMetadataDefinition()` or `updateMetadataDefinition()`
   - Handle errors with user-friendly messages
   - Close form modal
   - Refresh definitions list

2. Handle edit mode:
   - Pre-populate form with existing definition
   - Update instead of create
   - Preserve createdDate

3. Add success feedback:
   - Show notification: "Field definition saved"
   - Highlight new/updated definition in list

**Files to modify:**
- `js/ui/settings-modal.js`
- `js/app.js` (if orchestration needed)

**Acceptance Criteria:**
- [ ] New definitions save successfully
- [ ] Existing definitions update correctly
- [ ] Validation prevents invalid saves
- [ ] Error messages are user-friendly
- [ ] Success notification appears
- [ ] List refreshes after save

---

### ☐ Task 2.5: Implement Delete Definition Logic

**Actions:**
1. Add `deleteMetadataDefinition()` method:
   - Show confirmation dialog:
     - "Delete '[Field Name]'?"
     - "This will also delete all values for this field. This cannot be undone."
   - If confirmed, call `app.storage.deleteMetadataDefinition(id)`
   - Handle cascade delete of values (already in storage layer)
   - Show success notification
   - Refresh list

2. Add warning if definition has values:
   - Query `getMetadataValuesByDefinition(id)`
   - Show count in confirmation: "This field has 42 values that will also be deleted."

**Files to modify:**
- `js/ui/settings-modal.js`

**Acceptance Criteria:**
- [ ] Confirmation dialog appears
- [ ] Shows count of values if applicable
- [ ] Deletes definition and values on confirm
- [ ] Cancels delete correctly
- [ ] List updates after deletion
- [ ] Success notification shown

---

### ☐ Task 2.6: Add Export/Import Definitions Buttons

**Actions:**
1. Add "Export Definitions" button:
   - Export all global definitions to JSON file
   - Use format:
     ```javascript
     {
       version: '1.2',
       type: 'snapspot-metadata-definitions',
       sourceApp: 'SnapSpot',
       timestamp: '2026-02-05T...',
       definitions: [ /* MetadataDefinition objects */ ]
     }
     ```
   - Prompt download: `snapspot-metadata-definitions-YYYY-MM-DD.json`

2. Add "Import Definitions" button:
   - Open file picker for JSON
   - Parse and validate file
   - Show preview of definitions to import
   - Handle conflicts (duplicate names)
   - Options:
     - ☐ Skip duplicates
     - ☐ Overwrite duplicates
     - ☐ Rename duplicates (append number)
   - Import selected definitions
   - Refresh list

3. Validation for import:
   - Check file structure
   - Validate each definition
   - Show errors clearly

**Files to modify:**
- `js/ui/settings-modal.js`
- `lib/snapspot-data/validator.js` (if not already supporting this format)

**Acceptance Criteria:**
- [ ] Export creates valid JSON file
- [ ] Import parses and validates file
- [ ] Conflict resolution works
- [ ] Invalid files show clear error messages
- [ ] Successful import updates list

---

### ☐ Task 2.7: Add Reordering Functionality (Optional Enhancement)

**Actions:**
1. Add drag handles to definition list items
2. Implement drag-and-drop reordering
3. Update `order` field on definitions
4. Save new order to storage

**Note:** This is optional for initial release. Can be added later if needed.

**Files to modify:**
- `js/ui/settings-modal.js`
- `css/modals/settings.css`

**Acceptance Criteria:**
- [ ] Definitions can be reordered by dragging
- [ ] Order persists to storage
- [ ] Order reflected in entry forms (Phase 3)

---

### ☐ Task 2.8: Responsive Design and Mobile Optimization

**Actions:**
1. Test on mobile viewport (375px - 768px)
2. Ensure form is usable on mobile:
   - Proper input sizing
   - Scrollable if needed
   - Accessible buttons
   - Touch-friendly checkboxes and radios

3. Optimize definition list for mobile:
   - Stack information vertically
   - Collapsible descriptions
   - Accessible edit/delete buttons

**Files to modify:**
- `css/modals/settings.css`
- `css/modals/metadata-definition.css`

**Acceptance Criteria:**
- [ ] All fields are accessible on 375px viewport
- [ ] Buttons are touch-friendly (44px minimum)
- [ ] No horizontal scrolling required
- [ ] Modal fits in viewport with proper scrolling

---

## Manual Testing

**After completing all tasks, perform these tests:**

### Test 2.1: Access Metadata Tab
1. Open Settings modal
2. Click on "Metadata" tab
3. Verify:
   - [ ] Tab switches correctly
   - [ ] Empty state shows (if no definitions)
   - [ ] No console errors

### Test 2.2: Create Global Text Field
1. Click "+ Add Field Definition"
2. Fill form:
   - Name: "Inscription Author"
   - Type: Text
   - Applies To: Marker, Photo
   - Scope: Global
3. Click "Save Definition"
4. Verify:
   - [ ] Success notification appears
   - [ ] Definition appears in Global list
   - [ ] No console errors
   - [ ] Definition saved to IndexedDB

### Test 2.3: Create Select Field with Options
1. Add new field
2. Fill form:
   - Name: "Condition"
   - Type: Select
   - Options: "Excellent", "Good", "Fair", "Poor"
   - Applies To: Marker
   - Scope: Global
3. Save
4. Verify:
   - [ ] Options section appeared when select type chosen
   - [ ] All options saved correctly
   - [ ] Definition displays options in list

### Test 2.4: Create Map-Specific Field
1. Open a map
2. Add new field
3. Set Scope to "This Map Only"
4. Save
5. Verify:
   - [ ] Definition appears in Map-Specific section
   - [ ] Scope shows map name/ID
   - [ ] Definition is linked to current map

### Test 2.5: Edit Definition
1. Click "Edit" on existing definition
2. Change name and description
3. Save
4. Verify:
   - [ ] Form pre-populated correctly
   - [ ] Changes saved
   - [ ] lastModified timestamp updated
   - [ ] List updates with new name

### Test 2.6: Delete Definition (No Values)
1. Create a new definition
2. Click "Delete" immediately
3. Confirm deletion
4. Verify:
   - [ ] Confirmation dialog appears
   - [ ] No values warning not shown (new field)
   - [ ] Definition removed from list
   - [ ] Removed from IndexedDB

### Test 2.7: Delete Definition (With Values)
1. Create definition and add values (in console using storage methods from Phase 1)
2. Click "Delete"
3. Verify:
   - [ ] Confirmation shows value count
   - [ ] Warning about cascade delete shown
   - [ ] On confirm, definition and values deleted

### Test 2.8: Export Definitions
1. Create 2-3 definitions
2. Click "Export Definitions"
3. Verify:
   - [ ] File downloads
   - [ ] Filename format: `snapspot-metadata-definitions-YYYY-MM-DD.json`
   - [ ] JSON is valid and complete
   - [ ] All definitions included

### Test 2.9: Import Definitions (No Conflicts)
1. Export definitions from one browser/profile
2. Clear storage or use different browser
3. Import the file
4. Verify:
   - [ ] File picker opens
   - [ ] Import succeeds
   - [ ] All definitions appear
   - [ ] No errors

### Test 2.10: Import Definitions (With Conflicts)
1. Create definition named "Test Field"
2. Export definitions
3. Import the same file
4. Verify:
   - [ ] Conflict detected
   - [ ] Options presented (skip, overwrite, rename)
   - [ ] Selected option works correctly

### Test 2.11: Validation - Empty Name
1. Try to create definition with empty name
2. Verify:
   - [ ] Validation error shown
   - [ ] Save button disabled or shows error
   - [ ] Definition not created

### Test 2.12: Validation - No Applies To
1. Try to create definition without checking any "Applies To"
2. Verify:
   - [ ] Validation error shown
   - [ ] Cannot save

### Test 2.13: Validation - Select Without Options
1. Choose "Select" type
2. Don't add any options
3. Try to save
4. Verify:
   - [ ] Validation error shown
   - [ ] Requires at least 2 options

### Test 2.14: Mobile View
1. Open Settings → Metadata on mobile viewport (375px)
2. Add a new definition
3. Verify:
   - [ ] Form is usable
   - [ ] All fields accessible
   - [ ] Buttons are touch-friendly
   - [ ] No horizontal scrolling
   - [ ] Modal scrolls properly

### Test 2.15: Preview Functionality
1. Open add definition form
2. Fill in fields
3. Verify:
   - [ ] Preview section shows field as it will appear
   - [ ] Preview updates in real-time
   - [ ] Different field types render correctly in preview

---

## Acceptance Criteria (Phase Complete)

- [ ] All tasks marked complete
- [ ] All manual tests passed
- [ ] Zero linting errors (`npm run lint`)
- [ ] Responsive design tested on mobile
- [ ] All modals/forms accessible and usable
- [ ] Export/import works correctly
- [ ] Documentation comments added

---

## Commit Message

```
feat: add metadata definition UI in settings modal

- Add "Metadata Definitions" tab to Settings
- Implement definition list view with global/map-specific sections
- Create add/edit definition form with all field types
- Add delete with cascade warning
- Implement export/import for definition sharing
- Responsive design for desktop and mobile

Phase 2 of 6 for metadata system implementation.
```

---

## Notes

- Keep UI consistent with existing SnapSpot modal styles
- Follow existing button and form patterns from settings modal
- Use existing notification system for success/error messages
- Ensure all user-facing text is clear and helpful
- Consider adding tooltips for complex options
- Test on Safari for compatibility

---

**Next Phase:** [METADATA_PHASE_3_ENTRY.md](METADATA_PHASE_3_ENTRY.md) - Build UI for entering metadata values
