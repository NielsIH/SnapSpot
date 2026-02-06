# Phase 3: Metadata Entry UI

**Status:** Not Started  
**Estimated Duration:** 2-3 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1 and Phase 2 complete

---

## Goals

Build user interface for entering and editing metadata values on maps, markers, and photos:
1. Generate dynamic forms from metadata definitions
2. Add metadata sections to Upload Map modal
3. Add metadata sections to Marker Details modal
4. Add metadata sections to Photo Upload
5. Display metadata in detail views (read mode)
6. Validate and save metadata values
7. Edit existing metadata values

---

## UI Design Specification

### Dynamic Metadata Form Structure

**Forms are generated dynamically based on active definitions**

```
┌──────────────────────────────────────────┐
│ Additional Information (Metadata)        │
├──────────────────────────────────────────┤
│                                          │
│  Inscription Author:                     │
│  [___________________________]           │
│                                          │
│  Date Documented:                        │
│  [____/____/________]  (date picker)     │
│                                          │
│  Condition:                              │
│  [▼ Select...        ]                   │
│                                          │
│  Verified: ☐                             │
│                                          │
└──────────────────────────────────────────┘
```

### Integration Points

1. **Upload Map Modal** - Add metadata section for map-level fields
2. **Marker Details Modal** - Add metadata section for marker-level fields
3. **Photo Upload** - Add metadata section for photo-level fields

---

## Tasks

### ☐ Task 3.1: Create Metadata Form Generator

**Actions:**
1. Create new utility file: `js/ui/metadata-form-generator.js`

2. Implement `MetadataFormGenerator` class with methods:
   - `generateForm(definitions, existingValues, entityType)`
     - Returns HTML for metadata form based on definitions
     - Pre-fills with existingValues if editing
   
   - `renderField(definition, existingValue)`
     - Renders individual field based on fieldType
     - Includes label, input, and help text
   
   - `validateForm(formElement, definitions)`
     - Validates all fields meet requirements
     - Returns validation result and errors
   
   - `extractValues(formElement, definitions)`
     - Extracts values from form
     - Returns array of MetadataValue objects

3. Field rendering by type:
   - **text**: `<input type="text">`
   - **number**: `<input type="number">`
   - **date**: `<input type="date">` (HTML5 date picker)
   - **boolean**: `<input type="checkbox">`
   - **select**: `<select>` with options from definition

4. Add required field indicators:
   - Visual asterisk (*) for required fields
   - Validation highlighting for empty required fields

5. Add help text display:
   - Show definition.description below field (if present)
   - Use muted text style

**Files to create:**
- `js/ui/metadata-form-generator.js`

**Files to modify:**
- Add CSS for metadata form styling (see Task 3.2)

**Acceptance Criteria:**
- [ ] Class structure complete
- [ ] All field types render correctly
- [ ] Required indicators show
- [ ] Validation works for all types
- [ ] Values extract properly
- [ ] JSDoc comments added

---

### ☐ Task 3.2: Add Metadata Form Styles

**Actions:**
1. Create new CSS file: `css/components/metadata-form.css`

2. Add styles for:
   - Metadata section container
   - Field labels (with required indicators)
   - Input fields (consistent with existing form inputs)
   - Help text (muted, smaller font)
   - Error messages (validation feedback)
   - Empty state message ("No custom fields defined")

3. Ensure responsive design:
   - Stack labels and inputs on mobile
   - Proper spacing and padding
   - Touch-friendly input sizes

4. Import in `css/main.css`

**Files to create:**
- `css/components/metadata-form.css`

**Files to modify:**
- `css/main.css` (add import)

**Acceptance Criteria:**
- [ ] Styles match existing SnapSpot design
- [ ] Forms are readable and usable
- [ ] Responsive on mobile
- [ ] Error states are clear

---

### ☐ Task 3.3: Integrate Metadata into Upload Map Modal

**Actions:**
1. Update `js/ui/upload-modal.js`:
   - Import MetadataFormGenerator
   - After map name field, add metadata section
   - Query definitions: `getMetadataDefinitionsForEntity('map', scope)`
   - Generate and insert metadata form
   - If no definitions, show message: "No custom fields defined for maps"

2. Update save logic:
   - Extract metadata values from form
   - Validate metadata before saving map
   - Save map first, then save metadata values with mapId
   - Handle errors gracefully

3. Add to upload workflow:
   - User uploads image → fills name → **fills metadata** → saves
   - Metadata is optional unless fields are marked required

**Files to modify:**
- `js/ui/upload-modal.js`
- `css/modals/upload.css` (if styling needed)

**Acceptance Criteria:**
- [ ] Metadata section appears in upload modal
- [ ] Form generates correctly from definitions
- [ ] Values save to storage when map is saved
- [ ] Required validation works
- [ ] Empty state shows if no definitions
- [ ] No console errors

---

### ☐ Task 3.4: Integrate Metadata into Marker Details Modal

**Actions:**
1. Update `js/ui/marker-details-modal.js`:
   - Import MetadataFormGenerator
   - Add metadata section (after description, before photos)
   - Two modes: View mode and Edit mode

2. **View Mode** (when viewing existing marker):
   - Fetch metadata values for marker
   - Display in read-only format:
     ```
     Inscription Author: John Doe
     Date Documented: 2026-02-05
     Condition: Good
     Verified: Yes
     ```
   - If no metadata, don't show section
   - Only show metadata with a value
   - Add "Edit" button to switch to edit mode

3. **Edit Mode** (when creating or editing marker):
   - Generate editable form
   - Pre-fill with existing values
   - Save/cancel buttons

4. Update save logic:
   - Save marker first
   - Then save/update metadata values
   - Refresh view mode after save

**Files to modify:**
- `js/ui/marker-details-modal.js`
- `css/modals/marker-details.css`

**Acceptance Criteria:**
- [ ] Metadata displays in view mode
- [ ] Edit mode shows editable form
- [ ] Values save correctly
- [ ] Switching modes works smoothly
- [ ] No metadata shows nothing (graceful)

---

### ☐ Task 3.5: Integrate Metadata into Photo Upload

**Actions:**
1. Determine where photo metadata entry happens:
   - Option A: In marker details modal when adding photo
   - Option B: Separate photo details modal
   - **Decision: Option A** (simpler UX)

2. Approach:
   - Add metadata to photo gallery modal
   - Edit button on each photo → shows photo details + metadata form

4. Save photo metadata:
   - Save photo first
   - Then save metadata values with photoId

**Files to modify:**
- `js/ui/marker-details-modal.js` (or `photo-gallery-modal.js`)
- Relevant CSS files

**Acceptance Criteria:**
- [ ] Photo metadata entry is accessible
- [ ] UX is clear (not confusing)
- [ ] Values save with photoId
- [ ] Can edit photo metadata after upload

---

### ☐ Task 3.6: Add Metadata Display/Edit in Photo Gallery

**Actions:**
1. Update `js/ui/photo-gallery-modal.js`:
   - When viewing a photo, show metadata below image
   - Display as read-only key-value pairs
   - Add "Edit" button

2. Edit mode for photo metadata:
   - Show editable form
   - Save/cancel buttons
   - Update values in storage

3. Consider layout:
   - Photo at top
   - Metadata section below
   - Scrollable if needed

**Files to modify:**
- `js/ui/photo-gallery-modal.js`
- `css/modals/photo-gallery.css`

**Acceptance Criteria:**
- [ ] Photo metadata displays in gallery
- [ ] Edit button works
- [ ] Values update correctly
- [ ] Pleasant UX (not cluttered)

---

### ☐ Task 3.7: Implement Metadata Value Lifecycle Management

**Actions:**
1. Create helper methods in `app.js` or new module:
   - `saveMetadataForEntity(entityType, entityId, formValues)`
     - Validates values
     - Saves or updates each value
     - Returns success/failure
   
   - `loadMetadataForEntity(entityType, entityId)`
     - Fetches all metadata values for entity
     - Joins with definitions for display
     - Returns array of {definition, value} pairs
   
   - `deleteMetadataForEntity(entityType, entityId)`
     - Deletes all metadata values for entity
     - Called when entity is deleted (already in storage cascade)

2. Handle edge cases:
   - Definition deleted but values exist → skip display
   - Required field but no value → show warning/error
   - Value type mismatch → handle gracefully

**Files to modify:**
- `js/app.js` or new `js/app-metadata-manager.js`

**Acceptance Criteria:**
- [ ] Helper methods implemented
- [ ] Edge cases handled
- [ ] Error handling in place
- [ ] Logging for debugging

---

### ☐ Task 3.8: Add Empty State Messaging

**Actions:**
1. For each integration point, add friendly empty states:
   - **No definitions**: "No custom fields defined. Add fields in Settings → Metadata."
   - **No values**: Don't show metadata section (or show collapsed/optional)

2. Make empty states actionable:
   - Link to Settings → Metadata tab
   - "Add Field" quick action (if feasible)

**Files to modify:**
- All modal files from previous tasks

**Acceptance Criteria:**
- [ ] Empty states are clear and helpful
- [ ] Links to settings work
- [ ] User understands why metadata section is empty/missing

---

### ☐ Task 3.9: Implement Validation and Error Handling

**Actions:**
1. Add real-time validation:
   - Required fields turn red if empty and user tries to save
   - Number fields reject non-numeric input
   - Date fields use native validation
   - Select fields require selection if required

2. Show validation errors:
   - Inline below field: "This field is required"
   - Summary at top of form: "Please fix 2 errors"
   - Prevent save until valid

3. Handle save errors:
   - If metadata save fails, show error but don't lose data
   - Allow user to retry or skip metadata
   - Log errors to console

**Files to modify:**
- `js/ui/metadata-form-generator.js`
- All modal integration files

**Acceptance Criteria:**
- [ ] Required fields validated
- [ ] Type validation works
- [ ] Error messages are clear
- [ ] User can recover from errors

---

### ☐ Task 3.10: Responsive Design Testing

**Actions:**
1. Test all metadata forms on mobile viewport (375px - 768px)
2. Ensure:
   - Forms are scrollable
   - Inputs are touch-friendly
   - Date pickers work on mobile
   - Buttons are accessible

3. Optimize for small screens:
   - Stack labels above inputs
   - Full-width inputs
   - Adequate spacing for touch

**Files to modify:**
- `css/components/metadata-form.css`
- Modal-specific CSS files

**Acceptance Criteria:**
- [ ] All forms usable on 375px viewport
- [ ] No horizontal scrolling
- [ ] Touch-friendly UI


---

## Manual Testing

**After completing all tasks, perform these tests:**

### Test 3.1: Upload Map with Metadata
1. Create a map-level metadata definition (e.g., "Project Name" - text)
2. Open Upload Map modal
3. Fill map details and metadata field
4. Save map
5. Verify:
   - [ ] Metadata field appears in modal
   - [ ] Value saves to MetadataValues store
   - [ ] Map saves successfully
   - [ ] No console errors

### Test 3.2: View Map Metadata (Future - when map details view exists)
*Note: SnapSpot may not have a dedicated map details view yet*
1. If map details view exists, open it
2. Verify metadata displays
3. Or check in console:
   ```javascript
   const values = await app.storage.getMetadataValuesForEntity('map', 'MAP_ID')
   console.log(values)
   ```
4. Verify:
   - [ ] Metadata values retrieved correctly

### Test 3.3: Create Marker with Metadata
1. Create marker-level definition (e.g., "Inscription Text" - text)
2. Place a marker on map
3. Open marker details
4. Fill description and metadata field
5. Save marker
6. Verify:
   - [ ] Metadata form appears in marker details
   - [ ] Value saves correctly
   - [ ] Marker saves successfully

### Test 3.4: View Marker Metadata
1. Open existing marker with metadata
2. Verify:
   - [ ] Metadata displays in read-only mode
   - [ ] Values are correct
   - [ ] "Edit" button shows

### Test 3.5: Edit Marker Metadata
1. Click "Edit" on marker metadata
2. Change value
3. Save
4. Reopen marker
5. Verify:
   - [ ] Edit mode appears with form
   - [ ] Value updates in storage
   - [ ] Updated value displays in view mode

### Test 3.6: Add Photo with Metadata
1. Create photo-level definition (e.g., "Photo Notes" - text)
2. Add photo to marker
3. Fill photo metadata (wherever in UX)
4. Save
5. Verify:
   - [ ] Metadata entry is accessible
   - [ ] Value saves with photoId
   - [ ] Photo saves successfully

### Test 3.7: View/Edit Photo Metadata in Gallery
1. Open photo gallery
2. View photo with metadata
3. Verify metadata displays
4. Click edit and change value
5. Save
6. Verify:
   - [ ] Metadata shows in gallery
   - [ ] Edit works
   - [ ] Value updates

### Test 3.8: Required Field Validation
1. Create required metadata field
2. Try to save map/marker/photo without filling it
3. Verify:
   - [ ] Validation error shows
   - [ ] Save is prevented
   - [ ] Error message is clear

### Test 3.9: Number Field Validation
1. Create number field
2. Try to enter text
3. Verify:
   - [ ] Input rejects non-numeric characters (or shows error)
   - [ ] Only valid numbers accepted

### Test 3.10: Date Field
1. Create date field
2. Open date picker
3. Select date
4. Save
5. Verify:
   - [ ] Date picker works (native HTML5 or custom)
   - [ ] Date saves in ISO format
   - [ ] Date displays correctly

### Test 3.11: Boolean Field
1. Create boolean field
2. Check/uncheck checkbox
3. Save
4. Verify:
   - [ ] Checkbox state saves correctly (true/false)
   - [ ] Displays correctly in view mode ("Yes"/"No" or similar)

### Test 3.12: Select Field
1. Create select field with options
2. Choose option from dropdown
3. Save
4. Verify:
   - [ ] Dropdown shows all options
   - [ ] Selected value saves
   - [ ] Displays correctly in view mode

### Test 3.13: Multiple Fields
1. Create 3-4 different field types
2. Fill all in marker details
3. Save
4. View
5. Verify:
   - [ ] All fields render
   - [ ] All values save
   - [ ] All values display correctly

### Test 3.14: Global + Map-Specific Fields
1. Create global field and map-specific field (both for markers)
2. Create marker
3. Verify:
   - [ ] Both fields show in form
   - [ ] Both values save
   - [ ] Clear which is global vs map-specific (if shown)

### Test 3.15: No Metadata Defined
1. Clear all metadata definitions
2. Open map upload modal
3. Verify:
   - [ ] No metadata section shows (or shows helpful message)
   - [ ] Can still save map without metadata

### Test 3.16: Metadata with No Values
1. Create definitions but don't fill values
2. View entity details
3. Verify:
   - [ ] No error occurs
   - [ ] Metadata section gracefully handles empty values
   - [ ] Or doesn't show if no values

### Test 3.17: Mobile - Upload Map with Metadata
1. Switch to mobile viewport (375px)
2. Upload map and fill metadata
3. Verify:
   - [ ] Form is usable
   - [ ] Inputs are touch-friendly
   - [ ] Can scroll to all fields
   - [ ] Save button accessible

### Test 3.18: Mobile - Marker Metadata Entry
1. On mobile viewport
2. Create marker with metadata
3. Verify:
   - [ ] Form fits on screen
   - [ ] Can switch between view and edit mode
   - [ ] All field types work on mobile

### Test 3.19: Mobile - Photo Metadata
1. On mobile viewport
2. Add photo with metadata
3. Verify:
   - [ ] Metadata entry is accessible
   - [ ] Forms work properly
   - [ ] Touch-friendly

### Test 3.20: Error Recovery
1. Fill metadata form
2. Cause a save error (disconnect network, or mock error)
3. Verify:
   - [ ] Error message shows
   - [ ] Data not lost
   - [ ] User can retry

---

## Acceptance Criteria (Phase Complete)

- [ ] All tasks marked complete
- [ ] All 20 manual tests passed
- [ ] Zero linting errors (`npm run lint`)
- [ ] Metadata forms work for maps, markers, and photos
- [ ] All field types render and validate correctly
- [ ] Responsive design works on mobile
- [ ] Empty states are user-friendly
- [ ] Validation prevents invalid data
- [ ] Documentation comments added

---

## Commit Message

```
feat: add metadata entry forms to map/marker/photo modals

- Create MetadataFormGenerator for dynamic form generation
- Integrate metadata into Upload Map modal
- Add metadata view/edit in Marker Details modal
- Add metadata to photo upload and gallery
- Implement validation for all field types
- Add responsive design for mobile
- Handle empty states gracefully

Phase 3 of 6 for metadata system implementation.
```

---

## Notes

- Keep UX simple and unobtrusive - metadata should enhance, not complicate
- Consider showing metadata section collapsed by default if there are many fields
- Ensure metadata doesn't slow down primary workflows (map upload, marker creation)
- Test performance with 10+ metadata fields
- Consider adding "batch edit" for changing metadata on multiple markers (future enhancement)

---

**Next Phase:** [METADATA_PHASE_4_EXPORT_IMPORT.md](METADATA_PHASE_4_EXPORT_IMPORT.md) - Export/import metadata
