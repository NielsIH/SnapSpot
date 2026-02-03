# Phase 7D: Organizer CLI Tool

**Status:** ⏳ PLANNED  
**Parent Phase:** Phase 7 - Node.js CLI Utilities  
**Duration:** 1 day (estimated)  
**Dependencies:** Phase 7A complete (CLI Foundation), Phase 7B complete (Photo Finder)  
**Goal:** Build tool for creating organized archives containing exports and original photos

---

## Overview

Organizer creates organized directory structures containing SnapSpot exports and original high-quality photos. It internally invokes Photo Finder for photo search, eliminating code duplication.

**Purpose:**
- Create shareable archives with exports and photos
- Organize project files for archival
- Create backups with original photos
- Generate browsable photo collections

**Key Features:**
- Multiple organization schemes (by-map, by-marker, by-date, etc.)
- Internally invokes Photo Finder (zero duplicate search logic)
- Optional HTML index for browsing
- Handles missing photos gracefully
- Creates README explaining structure

---

## Deliverables

- [ ] `cli/tools/organizer/organizer.js` - Main tool
- [ ] `cli/tools/organizer/schemes.js` - Organization schemes
- [ ] `cli/tools/organizer/README.md` - Tool documentation
- [ ] Unit tests for all organization schemes
- [ ] Example workflows and usage documentation

---

## Tasks

### 7.3.3 Organizer Tool (`cli/tools/organizer/`)

**Core Functionality (`organizer.js`):**

- [ ] Import shared libraries:
  - [ ] **`lib/snapspot-data/parser.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-data/validator.js`** - Reuse from browser utilities
  - [ ] `cli/shared/export-loader.js` - Wrapper around lib/snapspot-data
  - [ ] `cli/shared/prompt-helpers.js`
  - [ ] `cli/shared/progress-bar.js`
  - [ ] `cli/shared/report-generator.js`
  - [ ] `fs-extra` for directory operations
  - [ ] **`cli/tools/photo-finder/photo-finder.js`** - For programmatic photo search

- [ ] Implement `invokePhotoFinder(exportPath, searchPaths)`
  - [ ] **Import Photo Finder as Node.js module (not spawn process)**
  - [ ] Call Photo Finder's `generateInternalManifest()` function
  - [ ] Pass export path and search directories
  - [ ] Receive internal manifest (not saved to disk)
  - [ ] Return manifest with found photos and metadata
  - [ ] Handle Photo Finder errors gracefully

- [ ] Implement organization schemes (`schemes.js`):
  - [ ] `organizeByMap(exportData, foundPhotos, outputDir)`
    - [ ] Structure: `{outputDir}/{mapName}/export.json` + photos
  - [ ] `organizeByMarker(exportData, foundPhotos, outputDir)`
    - [ ] Structure: `{outputDir}/{mapName}/{markerNumber}-{description}/` + photos
  - [ ] `organizeByDate(exportData, foundPhotos, outputDir)`
    - [ ] Structure: `{outputDir}/YYYY-MM-DD/` (by creation date)
  - [ ] `organizeCategorized(exportData, foundPhotos, outputDir)`
    - [ ] Structure: `{outputDir}/exports/`, `{outputDir}/photos/by-map/`, etc.
  - [ ] `organizeFlat(exportData, foundPhotos, outputDir)`
    - [ ] All in one directory with prefixes

- [ ] Implement core operations:
  - [ ] Create directory structure for chosen scheme
  - [ ] Copy export file to appropriate location(s)
  - [ ] Copy found photos to appropriate location(s)
  - [ ] Handle filename collisions (append number or ask user)
  - [ ] Create README.txt in output directory explaining structure
  - [ ] Optionally create index.html for browsing

- [ ] Implement interactive mode:
  - [ ] Prompt for export file path
  - [ ] Prompt for photo search directory(ies)
  - [ ] **Invoke Photo Finder to search for photos (internal manifest)**
  - [ ] Display found/missing summary from Photo Finder
  - [ ] Prompt for organization scheme (with descriptions)
  - [ ] Prompt for output directory
  - [ ] Preview directory structure
  - [ ] Confirm before creating
  - [ ] Copy files with progress bar
  - [ ] Generate completion report

- [ ] Implement CLI mode with flags:
  - [ ] `--export <path>` - Export file path
  - [ ] `--search <paths>` - Photo search directories (passed to Photo Finder)
  - [ ] `--output <path>` - Output directory
  - [ ] `--scheme <by-map|by-marker|by-date|categorized|flat>` - Organization scheme
  - [ ] `--create-index` - Generate browsable HTML index
  - [ ] `--copy-export` - Include export file in archive
  - [ ] `--missing-ok` - Proceed even if Photo Finder reports missing photos
  - [ ] `--dry-run` - Show structure without creating
  - [ ] `--report <path>` - Save report

**Documentation (`README.md`):**

- [ ] Tool overview and use cases (archival, sharing, backup)
- [ ] All organization schemes explained with diagrams
- [ ] Interactive mode walkthrough
- [ ] CLI mode examples
- [ ] **How Organizer invokes Photo Finder internally**
- [ ] Use case examples:
  - [ ] Creating shareable archive with photos
  - [ ] Organizing project files for archival
  - [ ] Creating backup with original photos
  - [ ] **Validating export before organizing (run Photo Finder first)**
- [ ] Troubleshooting section

---

## Example Workflows

**Workflow 1: Organize Export with Photos**
```bash
# Organizer automatically invokes Photo Finder to search for photos
organizer --export data.json --search /photos --output /archive --scheme by-marker
```

**Workflow 2: Validate Before Organizing**
```bash
# First, validate photos exist (Photo Finder read-only mode)
photo-finder --export data.json --search /photos --report validation.html

# Review validation report, then organize
organizer --export data.json --search /photos --output /archive --scheme by-map
```

**Workflow 3: Organize with Multiple Search Paths**
```bash
# Organizer passes all search paths to Photo Finder
organizer --export data.json --search /photos /backup /external \
  --output /archive --scheme by-date
```

**Workflow 4: Create Browsable Archive**
```bash
# Generate HTML index for browsing
organizer --export data.json --search /photos --output /archive \
  --scheme by-map --create-index
# Open /archive/index.html in browser
```

---

## Acceptance Criteria

- [ ] All organization schemes create correct structures
- [ ] Directory names are filesystem-safe
- [ ] Handles filename collisions gracefully
- [ ] Creates comprehensive README in archive
- [ ] Optional HTML index is browsable
- [ ] Dry-run shows accurate preview
- [ ] Works with partial photo matches (missing photos handled)
- [ ] Reports show complete archive structure
- [ ] Works in both interactive and CLI modes
- [ ] **Invokes Photo Finder internally for photo search (no duplicate code)**
- [ ] **Passes search directories to Photo Finder correctly**
- [ ] **Handles Photo Finder errors gracefully**

---

## Testing Plan

### Unit Tests

**Scenario 15: Organize by Map**
- [ ] Export with 3 maps, 15 photos total
- [ ] Organizer invokes Photo Finder to search
- [ ] Photo Finder finds all photos
- [ ] Choose organize-by-map scheme
- [ ] Creates 3 directories (one per map)
- [ ] Photos and export in correct locations
- [ ] README.txt created

**Scenario 16: Organize by Marker**
- [ ] Export with 10 markers
- [ ] Choose organize-by-marker scheme
- [ ] Creates nested structure: map/marker directories
- [ ] All photos in correct marker directories
- [ ] Marker directories named correctly

**Scenario 17: Missing Photos Handling**
- [ ] Export with 10 photos, only 6 found by Photo Finder
- [ ] Choose --missing-ok flag
- [ ] Organizer proceeds with 6 photos
- [ ] Report shows 4 missing
- [ ] Archive complete with available photos

**Scenario 18: Filename Collisions**
- [ ] Two photos named "photo.jpg" in different markers
- [ ] Organize with flat scheme
- [ ] Tool renames one to "photo-1.jpg"
- [ ] Both photos copied, no data loss

**Scenario 19: HTML Index Creation**
- [ ] Use --create-index flag
- [ ] index.html created in output directory
- [ ] HTML file opens in browser
- [ ] Shows browsable archive structure

**Scenario 20: Photo Finder Integration**
- [ ] Organizer invokes Photo Finder internally
- [ ] Photo Finder searches correctly
- [ ] Organizer receives internal manifest
- [ ] Photos organized based on Photo Finder results
- [ ] No files written by Photo Finder (internal only)

### Performance Tests
- [ ] Organize 1000 photos: <30 seconds
- [ ] Directory structure creation: <1 second
- [ ] HTML index for 1000 photos: <2 seconds

---

## Organization Scheme Examples

### by-map
```
/archive/
  Floor-1/
    export.json
    IMG_1001.jpg
    IMG_1002.jpg
  Floor-2/
    export.json
    IMG_2001.jpg
  README.txt
```

### by-marker
```
/archive/
  Floor-1/
    marker-001-Entrance/
      IMG_1001.jpg
      IMG_1002.jpg
    marker-002-Lobby/
      IMG_1003.jpg
  Floor-2/
    marker-003-Office/
      IMG_2001.jpg
  export.json
  README.txt
```

### by-date
```
/archive/
  2026-01-15/
    IMG_1001.jpg
    IMG_1002.jpg
  2026-01-16/
    IMG_1003.jpg
    IMG_2001.jpg
  export.json
  README.txt
```

### categorized
```
/archive/
  exports/
    Site-Survey-2026.json
  photos/
    by-map/
      Floor-1/
        IMG_1001.jpg
        IMG_1002.jpg
      Floor-2/
        IMG_2001.jpg
  README.txt
```

### flat
```
/archive/
  export.json
  IMG_1001.jpg
  IMG_1002.jpg
  IMG_1003.jpg
  IMG_2001.jpg
  README.txt
```

---

## Implementation Notes

### Photo Finder Integration

```javascript
import { generateInternalManifest } from '../photo-finder/photo-finder.js'

async function searchForPhotos(exportPath, searchPaths) {
  try {
    // Invoke Photo Finder programmatically (not spawn)
    const manifest = await generateInternalManifest(exportPath, searchPaths)
    
    // No files written - manifest is in-memory only
    return manifest
  } catch (error) {
    throw new Error(`Photo search failed: ${error.message}`)
  }
}
```

### README.txt Template

```
SnapSpot Archive
Created: 2026-02-03 10:30:00
Organization Scheme: by-marker

This archive contains:
- SnapSpot export file: export.json
- Original high-quality photos organized by marker
- HTML index for browsing: index.html

Directory Structure:
/Floor-1/
  /marker-001-Entrance/
    - Photo files for marker 1
  /marker-002-Lobby/
    - Photo files for marker 2
/Floor-2/
  /marker-003-Office/
    - Photo files for marker 3

Total Maps: 3
Total Markers: 25
Total Photos: 100

To view this archive:
1. Open index.html in a web browser
2. Or navigate the directories above
```

---

## Next Steps

After completing Phase 7D:
- Proceed to [Phase 7E: Testing & Polish](PHASE_7E_TESTING_POLISH.md)
- All three CLI tools complete
- Ready for comprehensive testing
