# Phase 7: Node.js CLI Utilities (Overview)

**Status:** ⏳ PLANNED  
**Started:** TBD  
**Completed:** TBD  
**Duration:** 4-5 days (estimated)  
**Dependencies:** Phase 6 complete (Map Migrator fully functional)  
**Goal:** Create a flexible Node.js CLI framework for batch file operations on SnapSpot exports and photos

---

## Overview

This phase adds a **comprehensive Node.js command-line framework** that complements the browser-based tools with file system access capabilities. The CLI framework enables three primary use cases:

1. **Batch Transformations:** Modify SnapSpot export files (edit, rename, remove properties, extract photos)
2. **Filesystem Photo Search:** Find original high-quality photos on disk by filename matching
3. **Organization & Archival:** Create meaningful directory structures containing exports and original photos

**Key Distinction:** While browser-based utilities run in sandboxed environments (no direct file system access), Node.js CLI tools can read/write files, search directories, and perform bulk operations across the user's file system.

**Critical Principle:** CLI tools must reuse `lib/snapspot-data` and `lib/snapspot-image` modules for all export file operations. **Zero code duplication** between browser and CLI utilities - both share the same validation, parsing, and writing logic.

**Browser + CLI Workflow:** Browser utilities can provide CLI command suggestions for batch operations. Users prototype transformations in the browser, then scale to hundreds of files using the CLI.

---

## Phase Structure

Due to the size and scope of the CLI framework, Phase 7 is split into **5 manageable sub-phases**:

### [Phase 7A: CLI Foundation & Shared Utilities](PHASE_7A_CLI_FOUNDATION.md)
**Duration:** 2 days  
**Focus:** Setup Node.js package and build reusable shared utilities

- Setup CLI infrastructure (package.json, dependencies)
- Build 6 shared utilities (file-finder, export-loader, export-writer, etc.)
- Establish zero-duplication pattern with `lib/snapspot-data`
- Create framework documentation

**Deliverables:**
- `cli/` directory structure
- `cli/package.json` with dependencies
- `cli/shared/*.js` (6 shared utilities)
- `cli/README.md` (framework documentation)

---

### [Phase 7B: Photo Finder Tool](PHASE_7B_PHOTO_FINDER.md)
**Duration:** 1 day  
**Focus:** Build read-only validation tool for finding original photos

- Implement photo search by filename (case-insensitive)
- Generate detailed reports (HTML/JSON/text)
- Create log files with per-marker photo paths
- Internal manifest generation for Organizer

**Deliverables:**
- `cli/tools/photo-finder/photo-finder.js`
- Photo Finder documentation
- Unit tests

**Key Feature:** Read-only validation - does NOT copy or organize files

---

### [Phase 7C: Export Transformer Tool](PHASE_7C_EXPORT_TRANSFORMER.md)
**Duration:** 1 day  
**Focus:** Build tool for batch modification of export files

- Implement transformations (remove photos, rename maps, etc.)
- **NEW: Extract embedded Base64 photos to JPEG files**
- Batch processing with glob patterns
- Dry-run mode and automatic backups

**Deliverables:**
- `cli/tools/export-transformer/export-transformer.js`
- `cli/tools/export-transformer/transformations.js`
- Export Transformer documentation
- Unit tests

**Key Feature:** Photo extraction from exports (Base64 → JPEG files)

---

### [Phase 7D: Organizer Tool](PHASE_7D_ORGANIZER.md)
**Duration:** 1 day  
**Focus:** Build tool for creating organized archives

- Implement 5 organization schemes (by-map, by-marker, by-date, etc.)
- Internally invoke Photo Finder for photo search (zero duplication)
- Optional HTML index generation
- Comprehensive README creation

**Deliverables:**
- `cli/tools/organizer/organizer.js`
- `cli/tools/organizer/schemes.js`
- Organizer documentation
- Unit tests

**Key Feature:** Invokes Photo Finder programmatically (no duplicate search logic)

---

### [Phase 7E: Testing & Polish](PHASE_7E_TESTING_POLISH.md)
**Duration:** 1-1.5 days  
**Focus:** Comprehensive testing, integration, documentation polish

- Complete test suite (unit + integration)
- Cross-platform testing (Windows/macOS/Linux)
- Integration validation with browser utilities
- Performance benchmarking
- Security review
- Documentation completion

**Deliverables:**
- Complete test suite
- Integration test results
- Performance benchmarks
- Updated main documentation
- Security review report

---

## Three CLI Tools

### 1. Photo Finder (Validation)
**Purpose:** Find original photos referenced in exports, generate reports  
**Read-Only:** Does NOT copy or organize files  

**Use When:**
- Validating photos exist before archival
- Identifying missing photos for recovery
- Creating audit logs of photo locations

**Example:**
```bash
photo-finder --export data.json --search /photos --report validation.html
```

---

### 2. Export Transformer (Modification)
**Purpose:** Batch modify export files and extract embedded photos  
**Modifies:** Export files (with backups)  

**Use When:**
- Removing photos from exports (reduce size)
- Extracting embedded photos to JPEG files
- Renaming maps or markers in bulk
- Setting custom metadata

**Examples:**
```bash
# Remove all photos from 100 exports
export-transformer --export "exports/*.json" --remove-photos --backup

# Extract embedded photos to organized directories
export-transformer --export data.json --transform extractPhotos \
  --extract-photos ./photos --extract-scheme by-map
```

---

### 3. Organizer (Archival)
**Purpose:** Create organized archives with exports and original photos  
**Creates:** Directory structures, copies files  

**Use When:**
- Creating shareable archives
- Organizing projects for archival
- Creating backups with original photos
- Generating browsable photo collections

**Example:**
```bash
# Organize export and photos by marker
organizer --export data.json --search /photos --output /archive --scheme by-marker
```

---

## Architecture Principles

### Zero Code Duplication

**CLI tools are thin wrappers around shared libraries:**

```
Browser Tools          CLI Tools
     ↓                     ↓
     └────────┬────────────┘
              ↓
    lib/snapspot-data/
    - parser.js
    - validator.js
    - writer.js
    
    lib/snapspot-image/
    - converter.js
    - hasher.js
```

**What CLI Adds:**
- File system operations (fs.readFile, fs.writeFile)
- Directory traversal
- User prompts and progress bars
- Command-line argument parsing
- Batch processing logic

**What Comes from Shared Libraries:**
- Export validation
- Export parsing
- Export writing
- Image conversion
- Hash generation

### Tool Separation & Integration

**Photo Finder** ← (invoked by) → **Organizer**

- Photo Finder implements search logic **once**
- Organizer calls Photo Finder programmatically
- Zero duplicate search code
- Clean separation of concerns

---

## Overall Acceptance Criteria

### All Tools
- [ ] Work in interactive and CLI modes
- [ ] Cross-platform (Windows/macOS/Linux)
- [ ] Progress indication for long operations
- [ ] Clear error messages
- [ ] Comprehensive documentation

### Zero Duplication
- [ ] All export operations use `lib/snapspot-data`
- [ ] All image operations use `lib/snapspot-image`
- [ ] No breaking changes to shared libraries
- [ ] Browser and CLI produce identical results

### Performance
- [ ] Search 100k+ files: <5 seconds
- [ ] Transform 100 exports: <10 seconds
- [ ] Organize 1000 photos: <30 seconds
- [ ] Memory: <500MB for 10k photos

### Quality
- [ ] 0 linting errors
- [ ] >80% test coverage
- [ ] All Phase 1-6 tests still passing

---

## Timeline

| Sub-Phase | Duration | Focus |
|-----------|----------|-------|
| 7A | 2 days | Foundation + Shared Utilities |
| 7B | 1 day | Photo Finder Tool |
| 7C | 1 day | Export Transformer Tool |
| 7D | 1 day | Organizer Tool |
| 7E | 1-1.5 days | Testing & Polish |
| **Total** | **4-5 days** | |

---

## Future Enhancements

After Phase 7, consider:

**Additional CLI Tools:**
- Export Merger CLI (batch merge exports)
- Format Converter CLI (batch format conversion)
- Export Validator CLI (comprehensive validation reports)
- Photo Deduplicator (find duplicates by hash)

**Distribution:**
- npm package: `@snapspot/cli-tools`
- Standalone executables (pkg/nexe)
- Docker image
- Homebrew/Chocolatey packages

**Advanced Features:**
- Configuration files (`.snapspotrc`)
- Plugin system for custom transformations
- Watch mode (monitor directories)
- Cloud storage integration

---

## Getting Started

1. **Read:** [Phase 7A: CLI Foundation](PHASE_7A_CLI_FOUNDATION.md)
2. **Setup:** Create `cli/` directory and package.json
3. **Build:** Implement shared utilities
4. **Continue:** Follow sub-phases in order (7A → 7B → 7C → 7D → 7E)

Each sub-phase document contains:
- Detailed task breakdowns
- Acceptance criteria
- Testing requirements
- Implementation notes
- Example workflows

---

## Questions?

Refer to:
- [Phase 7A: CLI Foundation](PHASE_7A_CLI_FOUNDATION.md) - Infrastructure setup
- [Phase 7B: Photo Finder](PHASE_7B_PHOTO_FINDER.md) - Photo search tool
- [Phase 7C: Export Transformer](PHASE_7C_EXPORT_TRANSFORMER.md) - Export modification tool
- [Phase 7D: Organizer](PHASE_7D_ORGANIZER.md) - Archive creation tool
- [Phase 7E: Testing & Polish](PHASE_7E_TESTING_POLISH.md) - Final validation

---

**Last Updated:** 2026-02-03
