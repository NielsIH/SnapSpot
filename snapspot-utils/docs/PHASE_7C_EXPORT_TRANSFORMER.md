# Phase 7C: Export Transformer CLI Tool

**Status:** ⏳ PLANNED  
**Parent Phase:** Phase 7 - Node.js CLI Utilities  
**Duration:** 1 day (estimated)  
**Dependencies:** Phase 7A complete (CLI Foundation established)  
**Goal:** Build tool for batch modification of SnapSpot export files and photo extraction

---

## Overview

Export Transformer enables batch modification of SnapSpot export files with operations like:
- Removing embedded photos (reduce file size)
- Extracting embedded Base64 photos to JPEG files
- Renaming maps and markers
- Removing maps or markers
- Setting custom metadata
- Batch processing multiple exports with same transformations

**Key Features:**
- Dry-run mode for preview
- Automatic backups
- Batch processing with glob patterns
- Chain multiple transformations
- Extract photos while preserving reference data

---

## Deliverables

- [ ] `cli/tools/export-transformer/export-transformer.js` - Main tool
- [ ] `cli/tools/export-transformer/transformations.js` - Transformation operations
- [ ] `cli/tools/export-transformer/README.md` - Tool documentation
- [ ] Unit tests for all transformations
- [ ] Example workflows and usage documentation

---

## Tasks

### 7.3.2 Export Transformer Tool (`cli/tools/export-transformer/`)

**Core Functionality (`export-transformer.js`):**

- [ ] Import shared libraries:
  - [ ] **`lib/snapspot-data/parser.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-data/validator.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-data/writer.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-image/converter.js`** - For photo extraction
  - [ ] `cli/shared/export-loader.js` - Wrapper around lib/snapspot-data
  - [ ] `cli/shared/export-writer.js` - Wrapper around lib/snapspot-data
  - [ ] `cli/shared/prompt-helpers.js`
  - [ ] `cli/shared/report-generator.js`

- [ ] Implement transformation operations (`transformations.js`):
  - [ ] `removeAllPhotos(exportData)` - Strip photo data for smaller files
  - [ ] `removePhotosFromMap(exportData, mapName)`
  - [ ] `removePhotosFromMarker(exportData, mapName, markerNumber)`
  - [ ] **`extractPhotosToFiles(exportData, outputDir, options)`** - Extract embedded photos:
    - [ ] Read photo data (base64) from export
    - [ ] Convert base64 to image blobs using `lib/snapspot-image/converter.js`
    - [ ] Save as JPEG files with original filenames
    - [ ] Organize in subdirectories (by map, by marker, or flat)
    - [ ] Generate mapping file (photo ID → filename)
    - [ ] Optionally remove photos from export after extraction
    - [ ] Verify extraction with hash validation
  - [ ] `renameMap(exportData, oldName, newName)`
  - [ ] `renameAllMaps(exportData, transformFn)` - Apply function to all map names
  - [ ] `updateMarkerDescriptions(exportData, mapName, transformFn)`
  - [ ] `removeMap(exportData, mapName)`
  - [ ] `removeMarker(exportData, mapName, markerNumber)`
  - [ ] `setCustomMetadata(exportData, metadata)` - Add custom properties
  - [ ] `updateCreationDates(exportData, offsetDays)` - Shift all dates

- [ ] Implement batch processing:
  - [ ] Process single export file
  - [ ] Process multiple export files (glob patterns)
  - [ ] Apply same transformations to all files
  - [ ] Create backups before modification (optional)

- [ ] Implement interactive mode:
  - [ ] Prompt for export file(s) or pattern
  - [ ] Display available transformations (checkbox list)
  - [ ] Configure each transformation (prompts for parameters)
  - [ ] Preview changes (show what will be modified)
  - [ ] Confirm before applying
  - [ ] Apply transformations with progress tracking
  - [ ] Show results report

- [ ] Implement CLI mode with flags:
  - [ ] `--export <path|pattern>` - Export file(s) to transform
  - [ ] `--transform <name>` - Transformation to apply (can be repeated)
  - [ ] `--backup` - Create backup before modifying
  - [ ] `--dry-run` - Show changes without applying
  - [ ] `--output-dir <path>` - Save modified exports to different directory
  - [ ] `--report <path>` - Save transformation report
  - [ ] Transformation-specific flags:
    - [ ] `--remove-photos [mapName]` - Remove photos (all or from specific map)
    - [ ] `--extract-photos <dir>` - Extract embedded photos to directory
    - [ ] `--extract-scheme <by-map|by-marker|flat>` - Organization for extracted photos
    - [ ] `--extract-and-remove` - Extract photos then remove from export
    - [ ] `--rename-map <old>:<new>` - Rename map
    - [ ] `--remove-map <name>` - Remove map
    - [ ] `--set-metadata <key>:<value>` - Set custom metadata

**Documentation (`README.md`):**

- [ ] Tool overview and use cases
- [ ] List of all available transformations
- [ ] Interactive mode walkthrough
- [ ] CLI mode examples for common tasks
- [ ] How to chain multiple transformations
- [ ] Photo extraction documentation
- [ ] Safety features (backups, dry-run)
- [ ] Troubleshooting section

---

## Example Workflows

**Workflow 1: Remove All Photos**
```bash
# Remove all photos from export
export-transformer --export my-site.json --transform removePhotos

# Remove photos from specific map only
export-transformer --export my-site.json --transform removePhotos --remove-photos "Floor 1"

# Create backup first
export-transformer --export my-site.json --transform removePhotos --backup
```

**Workflow 2: Extract Embedded Photos**
```bash
# Extract all photos organized by map
export-transformer --export my-site.json --transform extractPhotos \
  --extract-photos ./photos --extract-scheme by-map
# Creates: ./photos/Floor-1/marker-001-photo-001.jpg

# Extract organized by marker
export-transformer --export my-site.json --transform extractPhotos \
  --extract-photos ./photos --extract-scheme by-marker
# Creates: ./photos/marker-001/photo-001.jpg

# Extract to flat directory
export-transformer --export my-site.json --transform extractPhotos \
  --extract-photos ./photos --extract-scheme flat

# Extract and remove from export (reduce export size)
export-transformer --export my-site.json --transform extractPhotos \
  --extract-photos ./photos --extract-and-remove
```

**Workflow 3: Rename Maps**
```bash
# Rename single map
export-transformer --export my-site.json --transform renameMap \
  --rename-map "Old Name:New Name"
```

**Workflow 4: Batch Transform Multiple Exports**
```bash
# Remove photos from all exports in directory
export-transformer --export "./exports/*.json" --transform removePhotos \
  --output-dir ./cleaned

# Extract photos from multiple exports
export-transformer --export "./exports/*.json" --transform extractPhotos \
  --extract-photos ./all-photos --extract-scheme by-map
```

**Workflow 5: Chain Multiple Transformations**
```bash
# Remove photos from specific map, rename another map, set metadata
export-transformer --export my-site.json \
  --transform removePhotos --remove-photos "Unused Floor" \
  --transform renameMap --rename-map "Floor 1:Ground Floor" \
  --transform setMetadata --set-metadata "project:Site A" \
  --backup
```

---

## Acceptance Criteria

- [ ] All transformations work correctly
- [ ] Can apply multiple transformations in sequence
- [ ] Dry-run mode shows accurate preview
- [ ] Backups created when requested
- [ ] Batch processing works for multiple files
- [ ] Modified exports are valid (pass validation)
- [ ] Reports show all changes made
- [ ] Works in both interactive and CLI modes
- [ ] **Photo extraction creates valid JPEG files**
- [ ] **Extracted photos match original embedded data (hash verification)**
- [ ] **All organization schemes work correctly**

---

## Testing Plan

### Unit Tests

**Scenario 7: Remove All Photos**
- [ ] Export with 50 photos (large file)
- [ ] Apply removeAllPhotos transformation
- [ ] Result file much smaller
- [ ] Maps and markers intact, photos removed
- [ ] Export still valid

**Scenario 8: Rename Map**
- [ ] Export with map named "Floor 1"
- [ ] Rename to "Ground Floor"
- [ ] All references updated correctly
- [ ] Markers still associated with renamed map

**Scenario 9: Batch Transformation**
- [ ] 3 export files in directory
- [ ] Apply same transformation to all
- [ ] All files modified correctly
- [ ] Backups created for all files

**Scenario 10: Dry-Run Mode**
- [ ] Run transformation with --dry-run
- [ ] Shows what would change
- [ ] No files actually modified
- [ ] Report accurate preview

**Scenario 11: Chain Multiple Transformations**
- [ ] Remove photos from specific map
- [ ] Rename another map
- [ ] Set custom metadata
- [ ] All applied in sequence correctly

**Scenario 12: Extract Photos to Files (by-map)**
- [ ] Export with 3 maps, 20 embedded photos (Base64)
- [ ] Apply extractPhotos transformation
- [ ] Use --extract-scheme by-map
- [ ] Creates 3 directories (one per map)
- [ ] All 20 photos extracted as JPEG files
- [ ] Original filenames preserved
- [ ] Mapping file created (photo ID → filename)

**Scenario 13: Extract Photos to Files (by-marker)**
- [ ] Export with 10 markers
- [ ] Apply extractPhotos transformation with --extract-scheme by-marker
- [ ] Creates nested map/marker directories
- [ ] All photos in correct marker directories
- [ ] Photo filenames match original names

**Scenario 14: Extract and Remove Photos**
- [ ] Export with 50 embedded photos (large file)
- [ ] Use --extract-and-remove flag
- [ ] Photos extracted to JPEG files successfully
- [ ] Export file modified to remove embedded photos
- [ ] Export file size significantly reduced
- [ ] Both export and JPEG files validated

### Performance Tests
- [ ] Transform single export: <100ms
- [ ] Batch 100 exports: <10 seconds
- [ ] Extract 1000 photos: <30 seconds
- [ ] Memory usage <500MB for 10k photos

---

## Implementation Notes

### Photo Extraction Process

```javascript
async function extractPhotosToFiles(exportData, outputDir, options) {
  const { scheme = 'by-map', removeAfterExtract = false } = options
  
  for (const map of exportData.maps) {
    for (const marker of map.markers) {
      for (const photo of marker.photos) {
        // Get base64 data
        const base64Data = photo.imageData
        
        // Convert to blob using lib/snapspot-image/converter.js
        const blob = await base64ToBlob(base64Data)
        
        // Determine output path based on scheme
        const outputPath = getOutputPath(scheme, map, marker, photo)
        
        // Write JPEG file
        await fs.writeFile(outputPath, Buffer.from(await blob.arrayBuffer()))
        
        // Verify with hash
        const hash = await generateImageHash(blob)
        if (hash !== photo.imageHash) {
          console.warn(`Hash mismatch for ${photo.filename}`)
        }
        
        // Optionally remove from export
        if (removeAfterExtract) {
          delete photo.imageData
        }
      }
    }
  }
}
```

### Directory Schemes

**by-map:**
```
output/
  Floor-1/
    marker-001-photo-001.jpg
    marker-001-photo-002.jpg
    marker-002-photo-001.jpg
  Floor-2/
    marker-003-photo-001.jpg
```

**by-marker:**
```
output/
  Floor-1/
    marker-001/
      photo-001.jpg
      photo-002.jpg
    marker-002/
      photo-001.jpg
  Floor-2/
    marker-003/
      photo-001.jpg
```

**flat:**
```
output/
  photo-001.jpg
  photo-002.jpg
  photo-003.jpg
  (uses hash suffix for collisions)
```

---

## Next Steps

After completing Phase 7C:
- Proceed to [Phase 7D: Organizer Tool](PHASE_7D_ORGANIZER.md)
- Extract transformation can be used before Organizer if needed
