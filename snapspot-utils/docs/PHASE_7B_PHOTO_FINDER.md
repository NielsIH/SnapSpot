# Phase 7B: Photo Finder CLI Tool

**Status:** ⏳ PLANNED  
**Parent Phase:** Phase 7 - Node.js CLI Utilities  
**Duration:** 1 day (estimated)  
**Dependencies:** Phase 7A complete (CLI Foundation established)  
**Goal:** Build read-only validation tool for finding original photos referenced in SnapSpot exports

---

## Overview

Photo Finder is a read-only validation tool that searches the file system for original high-quality photos referenced in SnapSpot export files. It generates detailed reports and logs but does NOT copy or organize files.

**Purpose:**
- Verify all photos exist before creating an archive
- Generate reports of missing photos for data recovery
- Audit photo collections across multiple directories
- Create logs documenting photo locations for record-keeping
- Validate data integrity before backup or migration

**When to Use:**
- Before running Organizer to ensure all photos are available
- To identify which photos need to be recovered
- For audit trails documenting where photos are stored
- As a validation step in backup workflows

---

## Deliverables

- [ ] `cli/tools/photo-finder/photo-finder.js` - Main tool implementation
- [ ] `cli/tools/photo-finder/README.md` - Tool documentation
- [ ] Unit tests for Photo Finder
- [ ] Example workflows and usage documentation

---

## Tasks

### 7.3.1 Photo Finder Tool (`cli/tools/photo-finder/`)

**Core Functionality (`photo-finder.js`):**

- [ ] Import shared libraries:
  - [ ] **`lib/snapspot-data/parser.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-data/validator.js`** - Reuse from browser utilities
  - [ ] `cli/shared/export-loader.js` - Wrapper around lib/snapspot-data
  - [ ] `cli/shared/file-finder.js`
  - [ ] `cli/shared/prompt-helpers.js`
  - [ ] `cli/shared/progress-bar.js`
  - [ ] `cli/shared/report-generator.js`

- [ ] Implement `findPhotosForExport(exportPath, searchPaths, options)`
  - [ ] Load export file
  - [ ] Extract photo filenames (ignore hash - not useful for originals)
  - [ ] Search directories for matching filenames
  - [ ] Match case-insensitively (IMG_1234.jpg vs img_1234.JPG)
  - [ ] Track found/missing/duplicate photos
  - [ ] Return structured results

- [ ] Implement `generateLogFile(results, logPath)`
  - [ ] Create detailed log file for each processed export
  - [ ] Log format: One section per marker
  - [ ] Include marker number, description, map name
  - [ ] List all photos for marker with full paths
  - [ ] Mark missing photos clearly
  - [ ] Include search statistics and timestamp
  - [ ] Human-readable text format

- [ ] Implement `generateInternalManifest(results)` 
  - [ ] **INTERNAL USE ONLY** - for Organizer invocation
  - [ ] Return in-memory data structure (not saved to disk)
  - [ ] Used when Organizer calls Photo Finder programmatically
  - [ ] Not exposed to CLI users

- [ ] Implement interactive mode:
  - [ ] Prompt for export file
  - [ ] Display export summary (map count, marker count, photo count)
  - [ ] Prompt for search directory(ies)
  - [ ] Show search progress with progress bar
  - [ ] Display results summary (found/missing/duplicates)
  - [ ] Offer to save report
  - [ ] Offer to save log file
  - [ ] **NO organization options** (refer users to Organizer tool)

- [ ] Implement CLI mode with flags:
  - [ ] `--export <path>` - Export file path
  - [ ] `--search <paths>` - Comma-separated search directories
  - [ ] `--report <path>` - Save summary report (JSON/text/HTML)
  - [ ] `--format <json|text|html>` - Report format
  - [ ] `--log <path>` - Save detailed log file with full paths
  - [ ] `--case-sensitive` - Use case-sensitive filename matching
  - [ ] `--max-depth <n>` - Maximum search depth
  - [ ] `--quiet` - Minimal output

- [ ] Generate comprehensive reports:
  - [ ] **Summary Report:** Total photos, found/missing/duplicates, search stats
  - [ ] **Detailed Log:** Per-marker breakdown with full file paths
  - [ ] Clear indication of data integrity (all photos found vs. some missing)
  - [ ] Recommendations (e.g., "Ready for archival" or "3 photos need recovery")

**Documentation (`README.md`):**

- [ ] Tool overview and purpose (validation, not organization)
- [ ] When to use Photo Finder vs Organizer
- [ ] Interactive mode walkthrough
- [ ] CLI mode examples
- [ ] All command-line flags documented
- [ ] **Log file format documentation**
- [ ] **How to interpret reports (data integrity assessment)**
- [ ] Troubleshooting section
- [ ] Performance tips for large searches

---

## Example Workflows

**Workflow 1: Validate Before Archival**
```bash
# Check if all photos exist before creating archive
photo-finder --export data.json --search /photos --report validation.html --log photo-paths.txt
# Review report, then use Organizer if all photos found
```

**Workflow 2: Find Missing Photos**
```bash
# Generate report to identify which photos need recovery
photo-finder --export data.json --search /photos /backup --format json --report missing.json
# Review missing.json, recover photos, validate again
```

**Workflow 3: Audit Photo Locations**
```bash
# Create detailed log documenting where each photo is located
photo-finder --export data.json --search /projects --log audit-log.txt
# Use log for documentation or manual organization
```

---

## Acceptance Criteria

- [ ] Finds photos by filename across multiple directories
- [ ] Case-insensitive matching works on all platforms
- [ ] Handles large exports (1000+ photos) efficiently
- [ ] Reports are accurate and comprehensive
- [ ] **Log files include per-marker breakdown with full paths**
- [ ] Works in both interactive and CLI modes
- [ ] Clear progress indication for searches
- [ ] **Does NOT copy or modify any files (read-only validation)**
- [ ] **Can be invoked programmatically by Organizer (internal manifest)**
- [ ] **Interactive mode suggests using Organizer for archival**

---

## Testing Plan

### Unit Tests

**Scenario 1: Basic Photo Finding**
- [ ] Export file with 10 photos
- [ ] Photos located in single directory
- [ ] All photos found successfully
- [ ] Report shows 10/10 found with paths

**Scenario 2: Multi-Directory Search**
- [ ] Photos scattered across 3 directories
- [ ] All photos found via recursive search
- [ ] Progress bar shows search progress
- [ ] Report accurate

**Scenario 3: Missing Photos**
- [ ] Export references 5 photos
- [ ] Only 3 photos exist on disk
- [ ] Tool finds 3, reports 2 missing
- [ ] Missing report lists correct filenames

**Scenario 4: Case-Insensitive Matching**
- [ ] Export references "IMG_1234.jpg"
- [ ] File on disk named "img_1234.JPG"
- [ ] Tool finds photo despite case difference
- [ ] Report notes case difference

**Scenario 5: Duplicate Filenames**
- [ ] Same filename exists in 2 different directories
- [ ] Tool finds both locations
- [ ] Report lists all duplicate locations

**Scenario 6: Log File Generation**
- [ ] Find photos for export with 3 maps
- [ ] Generate log file with --log flag
- [ ] Log file created with per-marker photo paths
- [ ] Log includes map names, marker numbers, descriptions
- [ ] Path format correct for platform (Windows/Unix)
- [ ] Log can be used for manual verification

### Integration Tests
- [ ] Programmatic invocation by Organizer works
- [ ] Internal manifest format correct
- [ ] No files written when called internally

### Performance Tests
- [ ] <5 seconds for 100k+ file search
- [ ] <1 second for report generation
- [ ] Memory usage <100MB for 1000+ photos

---

## Implementation Notes

### Filename Matching Strategy

**Why filename-only (not hash)?**
- SnapSpot stores compressed photos (different hash than originals)
- Users want to find original high-quality photos from device
- Originals have same filename but different content (uncompressed)
- Hash matching would fail for originals vs compressed versions

**Matching Algorithm:**
1. Extract filenames from export (strip hash, keep extension)
2. Search recursively for files with matching names
3. Use case-insensitive comparison by default
4. Return all matches (handle duplicates)

### Log File Format

```
SnapSpot Photo Finder Log
Generated: 2026-02-03 10:30:00
Export: Site Survey 2026.json
Search Paths: /photos, /backup/photos

===== SUMMARY =====
Total Maps: 3
Total Markers: 25
Total Photos: 100
Found: 95
Missing: 5
Duplicates: 2

===== DETAILS =====

Map: Floor 1
  Marker #1: Entrance
    ✓ IMG_1001.jpg -> /photos/2026-01/IMG_1001.jpg
    ✓ IMG_1002.jpg -> /photos/2026-01/IMG_1002.jpg
    ✗ IMG_1003.jpg (NOT FOUND)
  
  Marker #2: Lobby
    ✓ IMG_1004.jpg -> /photos/2026-01/IMG_1004.jpg
    ⚠ IMG_1005.jpg (DUPLICATE):
      - /photos/2026-01/IMG_1005.jpg
      - /backup/photos/IMG_1005.jpg

Map: Floor 2
  ...
```

### Internal Manifest Format

```javascript
{
  export: { path, name, summary },
  search: { directories, options },
  results: { found, missing, duplicates count },
photos: [
    { filename, markerId, markerNumber, mapName, foundPath, status }
  ]
}
```

---

## Next Steps

After completing Phase 7B:
- Proceed to [Phase 7C: Export Transformer Tool](PHASE_7C_EXPORT_TRANSFORMER.md)
- Photo Finder will be used by Organizer in Phase 7D
