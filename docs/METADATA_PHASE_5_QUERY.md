# Phase 5: Metadata Search and Query

**Status:** Not Started  
**Estimated Duration:** 1-2 days  
**Started:** TBD  
**Completed:** TBD  
**Prerequisites:** Phase 1, 2, 3, and 4 complete

---

## Goals

Extend search functionality to query and filter based on metadata:
1. Add metadata field search to existing search functionality
2. Filter maps, markers, and photos by metadata values
3. Display metadata in search results
4. Advanced search UI for metadata queries
5. Support for different query types (exact match, contains, range, etc.)

---

## Search Features Specification

### Basic Metadata Search

**Search by metadata value:**
- User enters search term
- Search queries metadata values for matches
- Returns entities (maps/markers/photos) with matching metadata
- Shows which field matched in results

**Example:**
- Search for "John Doe"
- Returns markers where "Inscription Author" = "John Doe"

### Advanced Metadata Filters

**Filter by specific field:**
- Dropdown to select metadata field
- Input/select based on field type
- Apply filter to results

**Example:**
- Field: "Condition" (select)
- Value: "Good"
- Shows only markers where Condition = Good

### Metadata in Search Results

**Show metadata in result cards:**
```
┌────────────────────────────────────┐
│ 📍 Marker #5                       │
│ Description: Inscription on wall   │
│                                    │
│ 📝 Metadata:                       │
│ Author: John Doe                   │
│ Date: 2026-02-05                   │
│ Condition: Good                    │
└────────────────────────────────────┘
```

---

## Tasks

### ☐ Task 5.1: Extend SearchManager for Metadata Queries

**Actions:**
1. Update `js/searchManager.js`:
   - Add metadata to search indexes
   - Implement `searchMetadata(query, entityType)` method
   - Join metadata values with definitions for display
   - Return results with metadata highlighted

2. Search implementation:
   ```javascript
   async searchMetadata(query, entityType = null) {
     // Get all metadata values
     const allValues = await this.storage.getAllMetadataValues()
     
     // Filter by entityType if specified
     let values = entityType 
       ? allValues.filter(v => v.entityType === entityType)
       : allValues
     
     // Search in value field (case-insensitive)
     const matched = values.filter(v => {
       const valueStr = String(v.value).toLowerCase()
       return valueStr.includes(query.toLowerCase())
     })
     
     // Get unique entity IDs
     const entityIds = [...new Set(matched.map(v => v.entityId))]
     
     // Fetch entities
     // ... fetch maps/markers/photos by IDs
     
     return results
   }
   ```

3. Integrate with existing search:
   - Add metadata results to general search
   - Combine with description/name searches
   - Deduplicate results

**Files to modify:**
- `js/searchManager.js`

**Acceptance Criteria:**
- [ ] Metadata values searchable
- [ ] Returns correct entities
- [ ] Case-insensitive search
- [ ] Integrates with existing search

---

### ☐ Task 5.2: Add Metadata to Search Results Display

**Actions:**
1. Update `js/ui/search-modal.js`:
   - For each result, fetch metadata
   - Display metadata in result cards
   - Show field names and values
   - Limit displayed fields (e.g., max 3, expandable)

2. Update result card rendering:
   ```javascript
   async renderSearchResult(entity, entityType) {
     // ... existing card HTML
     
     // Add metadata section
     const metadata = await this.loadMetadataForEntity(entityType, entity.id)
     if (metadata.length > 0) {
       html += `
         <div class="result-metadata">
           <strong>Metadata:</strong><br>
           ${metadata.slice(0, 3).map(m => 
             `${m.definition.name}: ${m.value}`
           ).join('<br>')}
           ${metadata.length > 3 ? '<br><em>+' + (metadata.length - 3) + ' more...</em>' : ''}
         </div>
       `
     }
     
     return html
   }
   ```

3. Style metadata in results:
   - Distinguish from description
   - Use icons or badges for metadata
   - Truncate long values

**Files to modify:**
- `js/ui/search-modal.js`
- `css/modals/search.css`

**Acceptance Criteria:**
- [ ] Metadata displays in search results
- [ ] Shows field names and values
- [ ] Limited display (not overwhelming)
- [ ] Styled consistently

---

### ☐ Task 5.3: Add MapStorage Query Methods

**Actions:**
1. Add query methods to `js/storage.js`:
   - `getAllMetadataValues()` - Get all values (for search indexing)
   - `searchMetadataValues(query)` - Search across all value fields
   - `getEntitiesByMetadataValue(definitionId, value)` - Find entities with specific value
   - `getMetadataValuesByFieldName(fieldName, value)` - Search by field name

2. Implement efficient queries:
   - Use IndexedDB indexes where possible
   - Consider caching for performance
   - Return joined data (value + definition)

**Files to modify:**
- `js/storage.js`

**Acceptance Criteria:**
- [ ] Query methods implemented
- [ ] Efficient database queries
- [ ] Returns expected data structure
- [ ] Error handling in place

---

### ☐ Task 5.4: Implement Advanced Metadata Filters UI

**Actions:**
1. Add "Advanced Filters" section to search modal:
   - Collapsible section
   - "Filter by Metadata" heading
   - Dynamic form based on defined metadata fields

2. Create filter interface:
   ```
   ┌─────────────────────────────────────┐
   │ Filter by Metadata                  │
   ├─────────────────────────────────────┤
   │                                     │
   │ Add Filter: [Select Field ▼]       │
   │                                     │
   │ Active Filters:                     │
   │                                     │
   │ Inscription Author = "John"  [X]    │
   │ Date >= 2026-01-01            [X]    │
   │ Condition = "Good"             [X]    │
   │                                     │
   │ [Clear All Filters]                 │
   │                                     │
   └─────────────────────────────────────┘
   ```

3. Implement filter logic:
   - Select field from dropdown
   - Show appropriate input based on field type:
     - **Text**: contains, exact match, starts with
     - **Number**: =, <, >, <=, >=, range
     - **Date**: before, after, between
     - **Boolean**: is true, is false
     - **Select**: equals (dropdown)
   - Add to active filters list
   - Apply all filters to search results

4. Filter combination:
   - AND logic (all filters must match)
   - OR support for future (optional)

**Files to modify:**
- `js/ui/search-modal.js`
- `css/modals/search.css`

**Acceptance Criteria:**
- [ ] Advanced filters UI functional
- [ ] All field types supported
- [ ] Filters apply correctly
- [ ] Can add/remove filters
- [ ] Results update dynamically

---

### ☐ Task 5.5: Implement Filter Query Logic

**Actions:**
1. Create filter execution engine:
   - Parse active filters
   - Query metadata values based on filters
   - Apply operators (=, <, >, contains, etc.)
   - Combine results (AND logic)
   - Return matching entities

2. Implement filter matching:
   ```javascript
   applyFilters(entities, filters) {
     return entities.filter(entity => {
       return filters.every(filter => {
         const value = this.getMetadataValue(entity, filter.definitionId)
         return this.matchesFilter(value, filter.operator, filter.filterValue)
       })
     })
   }
   
   matchesFilter(actualValue, operator, filterValue) {
     switch (operator) {
       case 'equals':
         return actualValue === filterValue
       case 'contains':
         return String(actualValue).toLowerCase().includes(String(filterValue).toLowerCase())
       case 'greaterThan':
         return actualValue > filterValue
       // ... more operators
     }
   }
   ```

**Files to modify:**
- `js/searchManager.js` or new `js/metadata-query-engine.js`

**Acceptance Criteria:**
- [ ] Filters execute correctly
- [ ] All operators work
- [ ] Handles type conversions (string to number/date)
- [ ] Empty results handled gracefully

---

### ☐ Task 5.6: Add "Has Metadata" Filter

**Actions:**
1. Add special filter: "Has any metadata"
   - Shows only entities that have metadata values
   - Shows only entities missing metadata (inverse)

2. Add field-specific: "Has [Field Name]"
   - Shows entities with value for specific field
   - Useful for finding incomplete data

**Files to modify:**
- `js/ui/search-modal.js`
- `js/searchManager.js`

**Acceptance Criteria:**
- [ ] "Has metadata" filter works
- [ ] Field-specific presence filter works
- [ ] Useful for data completeness checks

---

### ☐ Task 5.7: Implement Export Filtered Results

**Actions:**
1. Add "Export Results" button to search modal
2. Export currently filtered/searched entities:
   - Create new map export with only matching markers/photos
   - Include metadata for exported entities
   - Prompt download

3. Use existing export functionality:
   - Filter markers/photos to only those in results
   - Call standard export with filtered data

**Files to modify:**
- `js/ui/search-modal.js`

**Acceptance Criteria:**
- [ ] Export button appears
- [ ] Exports filtered results only
- [ ] Includes relevant metadata
- [ ] File downloads correctly

---

### ☐ Task 5.8: Add Metadata Statistics/Summary

**Actions:**
1. Add "Statistics" section to search modal or settings:
   - Show metadata field usage
   - Count entities with each field
   - Value distributions (for select fields)

2. Display format:
   ```
   Metadata Statistics:
   
   Inscription Author: 42 markers
   Date Documented: 38 markers, 12 photos
   Condition:
     - Excellent: 10
     - Good: 18
     - Fair: 8
     - Poor: 6
   ```

3. Useful for:
   - Data completeness checks
   - Understanding collection
   - Finding gaps

**Files to modify:**
- `js/ui/search-modal.js` or `js/ui/settings-modal.js`

**Acceptance Criteria:**
- [ ] Statistics display correctly
- [ ] Shows field usage counts
- [ ] Value distributions for select fields
- [ ] Updates in real-time

---

### ☐ Task 5.9: Optimize Search Performance

**Actions:**
1. Add search indexing:
   - Build metadata search index on app load
   - Update index when metadata changes
   - Use index for fast queries

2. Implement caching:
   - Cache metadata queries
   - Invalidate cache on changes
   - Store in memory (not IndexedDB)

3. Optimize for large datasets:
   - Test with 500+ markers with metadata
   - Ensure search completes < 500ms
   - Use virtual scrolling for results if needed

**Files to modify:**
- `js/searchManager.js`
- `js/app.js` (initialization)

**Acceptance Criteria:**
- [ ] Search performance acceptable
- [ ] No lag with large datasets
- [ ] Index updates correctly

---

### ☐ Task 5.10: Add Metadata to Quick Search

**Actions:**
1. Update quick search (top search bar, if exists):
   - Include metadata in results
   - Show matched metadata field in preview
   - Link to full search for refinement

2. Highlight metadata matches:
   - Show which field matched
   - Preview value snippet

**Files to modify:**
- Wherever quick search is implemented

**Acceptance Criteria:**
- [ ] Quick search includes metadata
- [ ] Match highlighting works
- [ ] Performance remains fast

---

## Manual Testing

**After completing all tasks, perform these tests:**

### Test 5.1: Basic Metadata Search
1. Create markers with metadata (e.g., Author: "John Doe")
2. Open search modal
3. Search for "John"
4. Verify:
   - [ ] Markers with Author containing "John" appear
   - [ ] Metadata shows in results
   - [ ] Other matches (descriptions) also appear if relevant

### Test 5.2: Search by Specific Field Value
1. Create markers with different "Condition" values
2. Search for "Condition = Good"
3. Verify:
   - [ ] Only markers with Condition = Good appear
   - [ ] Other markers filtered out

### Test 5.3: Advanced Filter - Text Contains
1. Add filter: "Inscription Text contains 'inscription'"
2. Verify:
   - [ ] Results show markers with matching text
   - [ ] Case-insensitive matching works

### Test 5.4: Advanced Filter - Number Range
1. Add number field (e.g., "Width" in mm)
2. Add filter: "Width >= 100 AND Width <= 200"
3. Verify:
   - [ ] Only markers in range appear
   - [ ] Range logic correct

### Test 5.5: Advanced Filter - Date Range
1. Add date field
2. Add filter: "Date between 2026-01-01 and 2026-02-01"
3. Verify:
   - [ ] Only entities in date range appear
   - [ ] Date comparison works correctly

### Test 5.6: Advanced Filter - Boolean
1. Add boolean field (e.g., "Verified")
2. Add filter: "Verified = true"
3. Verify:
   - [ ] Only verified entities appear
   - [ ] Boolean logic correct

### Test 5.7: Advanced Filter - Select
1. Use select field with options
2. Add filter: "Condition = Excellent"
3. Verify:
   - [ ] Only entities with selected option appear

### Test 5.8: Multiple Filters (AND Logic)
1. Add filter: "Author contains 'John'"
2. Add filter: "Condition = Good"
3. Verify:
   - [ ] Only entities matching BOTH filters appear
   - [ ] AND logic works correctly

### Test 5.9: Remove Filter
1. Add 2-3 filters
2. Remove one filter
3. Verify:
   - [ ] Results update to reflect remaining filters
   - [ ] Removed filter no longer applies

### Test 5.10: Clear All Filters
1. Add multiple filters
2. Click "Clear All Filters"
3. Verify:
   - [ ] All filters removed
   - [ ] Search results reset

### Test 5.11: Has Metadata Filter
1. Create some markers with metadata, some without
2. Add filter: "Has any metadata"
3. Verify:
   - [ ] Only markers with metadata appear
   - [ ] Markers without metadata excluded

### Test 5.12: Specific Field Presence
1. Add filter: "Has Inscription Author"
2. Verify:
   - [ ] Only entities with that field filled appear
   - [ ] Useful for finding incomplete data

### Test 5.13: Metadata in Search Results
1. Search for anything
2. Verify results display:
   - [ ] Metadata fields and values shown
   - [ ] Formatted nicely
   - [ ] Not too many fields (limited display)
   - [ ] Expandable if needed

### Test 5.14: Export Filtered Results
1. Apply filters to narrow results
2. Click "Export Results"
3. Verify:
   - [ ] Only filtered markers export
   - [ ] Metadata included
   - [ ] File downloads correctly

### Test 5.15: Metadata Statistics
1. Open statistics view (if implemented)
2. Verify:
   - [ ] Shows field usage counts
   - [ ] Shows value distributions
   - [ ] Data is accurate

### Test 5.16: Search Performance with 100+ Markers
1. Create 100+ markers with metadata
2. Perform various searches and filters
3. Verify:
   - [ ] Search completes quickly (< 500ms)
   - [ ] No UI lag
   - [ ] Results are accurate

### Test 5.17: Search with No Results
1. Search for non-existent value
2. Verify:
   - [ ] "No results" message shows
   - [ ] UI handles gracefully
   - [ ] No errors

### Test 5.18: Mobile - Advanced Filters
1. On mobile viewport
2. Use advanced filters
3. Verify:
   - [ ] Filters UI is usable
   - [ ] Touch-friendly
   - [ ] Scrollable if needed

### Test 5.19: Quick Search with Metadata
1. Use quick search (if exists)
2. Search for metadata value
3. Verify:
   - [ ] Results include metadata matches
   - [ ] Preview shows matched field

### Test 5.20: Edge Case - Special Characters
1. Create metadata with special characters: "Author: O'Brien"
2. Search for "O'Brien"
3. Verify:
   - [ ] Match found
   - [ ] Special characters handled correctly

---

## Acceptance Criteria (Phase Complete)

- [ ] All tasks marked complete
- [ ] All 20 manual tests passed
- [ ] Zero linting errors (`npm run lint`)
- [ ] Metadata searchable in all search interfaces
- [ ] Advanced filters work for all field types
- [ ] Search results display metadata
- [ ] Performance acceptable with large datasets
- [ ] Mobile-friendly search UI

---

## Commit Message

```
feat: add metadata search and query functionality

- Extend SearchManager to query metadata values
- Display metadata in search results
- Implement advanced filters UI for metadata fields
- Add filter logic for all field types (text, number, date, boolean, select)
- Support "has metadata" filters
- Add export filtered results feature
- Optimize search performance for large datasets

Phase 5 of 6 for metadata system implementation.
```

---

## Notes

- Search index should update when metadata changes
- Consider fuzzy matching for text fields (future enhancement)
- Add saved filters/queries feature (future enhancement)
- Think about multi-user scenarios (sharing saved queries)
- Ensure search respects user permissions (if added later)

---

**Next Phase:** [METADATA_PHASE_6_POLISH.md](METADATA_PHASE_6_POLISH.md) - Final polish and documentation
