# Phase 7: Node.js CLI Utilities

**Status:** ⏳ PLANNED
**Started:** TBD
**Completed:** TBD
**Duration:** 4-5 days (estimated)
**Dependencies:** Phase 6 complete (Map Migrator fully functional)
**Goal:** Create a flexible Node.js CLI framework for batch file operations on SnapSpot exports and photos

---

## Overview

This phase adds a **comprehensive Node.js command-line framework** that complements the browser-based tools with file system access capabilities. The CLI framework enables three primary use cases:

1. **Batch Transformations:** Modify SnapSpot export files (edit, rename, remove properties, merge/split exports)
2. **Filesystem Photo Search:** Find original high-quality photos on disk by filename matching
3. **Organization & Archival:** Create meaningful directory structures containing exports and original photos

**Key Distinction:** While browser-based utilities run in sandboxed environments (no direct file system access), Node.js CLI tools can read/write files, search directories, and perform bulk operations across the user's file system.

**Design Philosophy:** Build a flexible, modular framework where new CLI tools can be added easily by reusing shared components (file operations, prompts, validation, reporting).

**Critical Principle:** CLI tools must reuse `lib/snapspot-data` and `lib/snapspot-image` modules for all export file operations. Zero code duplication between browser and CLI utilities - both share the same validation, parsing, and writing logic.

**Browser + CLI Workflow:** Browser utilities can provide CLI command suggestions for batch operations. For example, a user transforms one export in the browser, then the tool shows the equivalent CLI command to batch-process hundreds of files.

**Critical Principle:** CLI tools must reuse `lib/snapspot-data` and `lib/snapspot-image` modules for all export file operations. Zero code duplication between browser and CLI utilities - both share the same validation, parsing, and writing logic.

**Browser + CLI Workflow:** Browser utilities can provide CLI command suggestions for batch operations. For example, a user transforms one export in the browser, then the tool shows the equivalent CLI command to batch-process hundreds of files.

---

## Deliverables

### Core CLI Infrastructure

- [ ] `cli/` - Root directory for CLI tools
- [ ] `cli/package.json` - Separate Node.js package configuration
- [ ] `cli/README.md` - CLI framework overview and getting started (includes browser+CLI workflows)
- [ ] `cli/.gitignore` - Ignore node_modules

### Shared Utilities (`cli/shared/`)

**NOTE:** These are thin wrappers around `lib/snapspot-data` and `lib/snapspot-image`. Zero code duplication.

- [ ] `cli/shared/file-finder.js` - Recursive file search utility
- [ ] `cli/shared/export-loader.js` - SnapSpot export file loader/validator
- [ ] `cli/shared/export-writer.js` - SnapSpot export file writer (batch modifications)
- [ ] `cli/shared/prompt-helpers.js` - User input prompts (using inquirer)
- [ ] `cli/shared/progress-bar.js` - Progress display for long operations
- [ ] `cli/shared/report-generator.js` - Generate text/JSON/HTML reports

### CLI Tools (`cli/tools/`)

- [ ] `cli/tools/photo-finder/` - Find original photos for exports
  - [ ] `photo-finder.js` - Main tool
  - [ ] `README.md` - Tool documentation
  - [ ] `manifest-format.md` - Photo manifest specification
- [ ] `cli/tools/export-transformer/` - Batch modify export files
  - [ ] `export-transformer.js` - Main tool
  - [ ] `transformations.js` - Common transformation operations
  - [ ] `README.md` - Tool documentation
- [ ] `cli/tools/organizer/` - Create organized archives
  - [ ] `organizer.js` - Main tool
  - [ ] `schemes.js` - Organization schemes
  - [ ] `README.md` - Tool documentation

### Testing

- [ ] `cli/__tests__/` - CLI tool tests
  - [ ] `file-finder.test.js`
  - [ ] `export-loader.test.js`
  - [ ] `export-writer.test.js`
  - [ ] `photo-finder.test.js`
  - [ ] `export-transformer.test.js`
  - [ ] `organizer.test.js`
  - [ ] `test-runner.js` (Node.js test runner)
  - [ ] `fixtures/` (Test data: sample exports, images)

---

## Tasks

### 7.1 Setup Node.js CLI Infrastructure

**Goal:** Establish base structure for a flexible CLI framework separate from browser utilities

- [ ] Create `cli/` directory structure
- [ ] Create `cli/package.json` with dependencies:
  - [ ] `inquirer` - Interactive prompts
  - [ ] `chalk` - Terminal colors
  - [ ] `cli-progress` - Progress bars
  - [ ] `glob` - File pattern matching
  - [ ] `commander` - Command-line argument parsing
  - [ ] `fs-extra` - Enhanced file system operations
- [ ] Create `cli/README.md` with:
  - [ ] Installation instructions
  - [ ] Overview of CLI framework architecture
  - [ ] List of available tools with use cases
  - [ ] Differences from browser utilities
  - [ ] Security considerations (file system access)
  - [ ] How to create new CLI tools
  - [ ] **Browser + CLI workflow patterns** (discover CLI via browser, prototype then batch)
- [ ] Create `cli/.gitignore` (ignore node_modules)
- [ ] Add npm scripts for running tools
- [ ] Document relationship to browser utilities in architecture
- [ ] Set up ES6 module support in package.json

**Acceptance Criteria:**
- [ ] `npm install` works in `cli/` directory
- [ ] Clear documentation explaining CLI framework
- [ ] Dependencies installed and versions locked
- [ ] TypeScript JSDoc comments configured for VS Code IntelliSense
- [ ] Framework is extensible (easy to add new tools)

**Estimated Time:** 0.5 days

---

### 7.2 Create Shared CLI Utilities

**Goal:** Build reusable components for file operations, export handling, and user interaction

#### 7.2.1 File Finder (`cli/shared/file-finder.js`)

- [ ] Implement `findFilesByName(searchPath, filenames, options)`
  - [ ] Recursive directory traversal
  - [ ] Case-insensitive filename matching (important for cross-platform)
  - [ ] Exclude patterns (node_modules, .git, etc.)
  - [ ] Max depth option
  - [ ] Return full paths for all matches
- [ ] Implement `findFilesByPattern(searchPath, patterns, options)`
  - [ ] Support glob patterns
  - [ ] Multiple pattern support
- [ ] Add progress callbacks for long searches
- [ ] Handle symlinks and permissions errors gracefully
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] Can find multiple files with same name across directories
- [ ] Ignores system directories by default
- [ ] Handles permission errors without crashing
- [ ] Returns results with relative paths option
- [ ] Performance: <5 seconds for 100k+ files

#### 7.2.2 Export Loader (`cli/shared/export-loader.js`)

**CRITICAL: This is a thin wrapper around `lib/snapspot-data`. All parsing/validation logic must come from shared libraries.**

- [ ] Implement `loadExportFile(filePath)`
  - [ ] Read JSON file from disk using Node.js `fs`
  - [ ] **Validate using `lib/snapspot-data/validator.js`** (shared library - no duplication)
  - [ ] **Parse using `lib/snapspot-data/parser.js`** (shared library - no duplication)
  - [ ] Return parsed data structure
- [ ] Implement `loadMultipleExports(filePaths, options)`
  - [ ] Load multiple exports with progress tracking
  - [ ] Validate each export
  - [ ] Return array of parsed exports with metadata
- [ ] Implement `getExportSummary(exportData)`
  - [ ] Extract counts (maps, markers, photos)
  - [ ] Extract photo filenames list
  - [ ] Extract metadata (creation dates, versions, etc.)
- [ ] Handle corrupted or invalid files gracefully
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] Loads valid SnapSpot export files
- [ ] Rejects invalid files with clear error messages
- [ ] Extracts all relevant metadata
- [ ] Handles large exports (10k+ photos) efficiently
- [ ] Returns data in consistent format

#### 7.2.3 Export Writer (`cli/shared/export-writer.js`)

**CRITICAL: This is a thin wrapper around `lib/snapspot-data`. All writing/validation logic must come from shared libraries.**

- [ ] Implement `writeExportFile(exportData, filePath, options)`
  - [ ] **Validate data before writing using `lib/snapspot-data/validator.js`** (shared library)
  - [ ] **Use `lib/snapspot-data/writer.js` for serialization** (shared library - no duplication)
  - [ ] Create backup of existing file (optional)
  - [ ] Write to disk using Node.js `fs` with proper formatting (pretty-print option)
- [ ] Implement `modifyExport(exportData, modifications)`
  - [ ] Remove properties (e.g., remove all photos)
  - [ ] Rename properties (e.g., map names, marker descriptions)
  - [ ] Edit properties (e.g., update creation dates)
  - [ ] Add properties (e.g., add custom metadata)
- [ ] Implement common transformation helpers:
  - [ ] `removePhotos(exportData)` - Strip all photo data
  - [ ] `renameMap(exportData, oldName, newName)`
  - [ ] `updateMarkerDescriptions(exportData, mapName, transformFn)`
  - [ ] `setCustomMetadata(exportData, key, value)`
- [ ] Atomic writes (write to temp file, then rename)
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] Writes valid SnapSpot export files
- [ ] Validates data before writing
- [ ] Handles file write errors gracefully
- [ ] Creates backups when requested
- [ ] Transformations preserve data integrity

#### 7.2.4 Prompt Helpers (`cli/shared/prompt-helpers.js`)

- [ ] Implement `promptForFile(message, validate)`
  - [ ] File path input with tab completion
  - [ ] Existence validation
  - [ ] File type validation
- [ ] Implement `promptForDirectory(message, options)`
  - [ ] Directory path input
  - [ ] Create if not exists option
  - [ ] Write permission check
- [ ] Implement `promptForConfirmation(message, defaultValue)`
- [ ] Implement `promptForChoice(message, choices)`
- [ ] Implement `promptForMultipleFiles(message)`
- [ ] Implement `promptForTransformation(availableTransformations)`
  - [ ] List available transformations
  - [ ] Allow multiple selection
  - [ ] Show description for each
- [ ] Add color coding (success=green, error=red, info=blue, warning=yellow)
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] All prompts support keyboard navigation
- [ ] Path validation works on Windows and Unix
- [ ] Clear error messages for invalid inputs
- [ ] Supports default values
- [ ] Can be cancelled with Ctrl+C

#### 7.2.5 Progress Bar (`cli/shared/progress-bar.js`)

- [ ] Implement `createProgressBar(total, format)`
  - [ ] Shows percentage, current/total, ETA
  - [ ] Customizable format string
- [ ] Implement `update(current, metadata)` method
  - [ ] Additional info display (current file name, etc.)
- [ ] Implement `complete()` method
- [ ] Handle terminal resize
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] Displays smoothly without flicker
- [ ] Shows accurate ETA after 5% completion
- [ ] Works in different terminal widths
- [ ] Can display multi-line status

#### 7.2.6 Report Generator (`cli/shared/report-generator.js`)

- [ ] Implement `generateTextReport(data, options)`
  - [ ] Human-readable text format
  - [ ] Tables for structured data
  - [ ] Color coding for terminal output
- [ ] Implement `generateJsonReport(data, options)`
  - [ ] Machine-readable JSON format
  - [ ] Pretty-printed or compact option
- [ ] Implement `generateHtmlReport(data, options)`
  - [ ] HTML report with styling
  - [ ] Embedded CSS (single file)
  - [ ] Tables, lists, summaries
- [ ] Implement report templates:
  - [ ] Photo search results (found/missing/duplicates)
  - [ ] Export transformation results (modified files, changes made)
  - [ ] Organization results (directory structure created, files copied)
- [ ] Write reports to file or stdout
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] Generates clear, readable reports
- [ ] All three formats work correctly
- [ ] Reports contain all relevant information
- [ ] HTML reports open in browser correctly

**Estimated Time:** 1.5 days

---

### 7.3 Build CLI Tools

**Goal:** Create three core CLI tools demonstrating different use cases of the framework

#### 7.3.1 Photo Finder Tool (`cli/tools/photo-finder/`)

**Purpose:** Validate that original high-quality photos referenced in SnapSpot exports exist on the user's file system. Generate detailed reports and logs for verification purposes. This is a read-only validation tool - it does NOT copy or organize files.

**When to Use Photo Finder:**
- Verify all photos exist before creating an archive
- Generate reports of missing photos for data recovery
- Audit photo collections across multiple directories
- Create logs documenting photo locations for record-keeping
- Validate data integrity before backup or migration

**Core Functionality (`photo-finder.js`):**

- [ ] Import shared libraries:
  - [ ] **`lib/snapspot-data/parser.js`** - Reuse from browser utilities (CRITICAL: no duplication)
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
  - [ ] **NO --organize or --save-manifest flags** (removed - not Photo Finder's job)
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

**Example Workflows:**

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

**Acceptance Criteria:**
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

**Estimated Time:** 1 day

---

#### 7.3.2 Export Transformer Tool (`cli/tools/export-transformer/`)

**Purpose:** Batch modify SnapSpot export files (remove photos, rename maps, edit marker descriptions, add metadata, etc.)

**Core Functionality (`export-transformer.js`):**

- [ ] Import shared libraries:
  - [ ] **`lib/snapspot-data/parser.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-data/validator.js`** - Reuse from browser utilities
  - [ ] **`lib/snapspot-data/writer.js`** - Reuse from browser utilities
  - [ ] `cli/shared/export-loader.js` - Wrapper around lib/snapspot-data
  - [ ] `cli/shared/export-writer.js` - Wrapper around lib/snapspot-data
  - [ ] `cli/shared/prompt-helpers.js`
  - [ ] `cli/shared/report-generator.js`
- [ ] Implement transformation operations (`transformations.js`):
  - [ ] `removeAllPhotos(exportData)` - Strip photo data for smaller files
  - [ ] `removePhotosFromMap(exportData, mapName)`
  - [ ] `removePhotosFromMarker(exportData, mapName, markerNumber)`
  - [ ] `extractPhotosToFiles(exportData, outputDir, options)` - **NEW: Extract embedded photos**
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
    - [ ] `--extract-photos <dir>` - **NEW: Extract embedded photos to directory**
    - [ ] `--extract-scheme <by-map|by-marker|flat>` - **NEW: Organization for extracted photos**
    - [ ] `--extract-and-remove` - **NEW: Extract photos then remove from export**
    - [ ] `--rename-map <old>:<new>` - Rename map
    - [ ] `--remove-map <name>` - Remove map
    - [ ] `--set-metadata <key>:<value>` - Set custom metadata

**Documentation (`README.md`):**

- [ ] Tool overview and use cases
- [ ] List of all available transformations
- [ ] Interactive mode walkthrough
- [ ] CLI mode examples for common tasks
- [ ] How to chain multiple transformations
- [ ] Safety features (backups, dry-run)
- [ ] Troubleshooting section

**Acceptance Criteria:**
- [ ] All transformations work correctly
- [ ] Can apply multiple transformations in sequence
- [ ] Dry-run mode shows accurate preview
- [ ] Backups created when requested
- [ ] Batch processing works for multiple files
- [ ] Modified exports are valid (pass validation)
- [ ] Reports show all changes made
- [ ] Works in both interactive and CLI modes

**Estimated Time:** 1 day

---

#### 7.3.3 Organizer Tool (`cli/tools/organizer/`)

**Purpose:** Create organized archive structures containing SnapSpot exports and original high-quality photos in meaningful directory layouts. Can accept input from Photo Finder (manifest file) or search for photos directly.

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

**Example Workflows:**

**Workflow 1: Organize Export with Photos**
```bash
# Organizer automatically invokes Photo Finder to search for photos
node organizer.js \
  --export data.json \
  --search /photos \
  --output /archive \
  --scheme by-marker
```

**Workflow 2: Validate Before Organizing**
```bash
# First, validate photos exist (Photo Finder read-only mode)
node ../photo-finder/photo-finder.js \
  --export data.json \
  --search /photos \
  --report validation.html

# Review validation report, then organize
node organizer.js \
  --export data.json \
  --search /photos \
  --output /archive \
  --scheme by-map
```

**Workflow 3: Organize with Multiple Search Paths**
```bash
# Organizer passes all search paths to Photo Finder
node organizer.js \
  --export data.json \
  --search /photos /backup /external \
  --output /archive \
  --scheme by-date
```

**Acceptance Criteria:**
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

**Estimated Time:** 1 day

---

### 7.4 Testing & Validation

**Goal:** Ensure CLI tools work reliably across platforms and scenarios

#### 7.4.1 Unit Tests

- [ ] Test file-finder.js:
  - [ ] Find single file in simple directory
  - [ ] Find multiple files with same name
  - [ ] Handle permission errors
  - [ ] Respect exclude patterns
  - [ ] Respect max depth
  - [ ] Handle symlinks
- [ ] Test export-loader.js:
  - [ ] Load valid export file
  - [ ] Reject invalid export file
  - [ ] Extract accurate summaries
  - [ ] Handle corrupted files
  - [ ] Load multiple exports batch
- [ ] Test export-writer.js:
  - [ ] Write valid export files
  - [ ] Validate before writing
  - [ ] Create atomic writes
  - [ ] Create backups when requested
  - [ ] All transformations preserve integrity
- [ ] Test photo-finder.js:
  - [ ] Find photos by filename
  - [ ] Case-insensitive matching
  - [ ] Handle missing photos
  - [ ] Detect duplicates
  - [ ] Generate accurate reports
  - [ ] **Generate log files with per-marker paths**
  - [ ] **Generate internal manifest for Organizer (not saved to disk)**
  - [ ] **Standalone CLI mode works correctly**
- [ ] Test export-transformer.js:
  - [ ] All transformation operations work
  - [ ] Dry-run mode accurate
  - [ ] Batch processing works
  - [ ] Backups created correctly
  - [ ] Chain transformations correctly
- [ ] Test organizer.js:
  - [ ] All organization schemes work
  - [ ] Handle filename collisions
  - [ ] Create directory structures correctly
  - [ ] Generate README files
  - [ ] Optional HTML index works
  - [ ] **Invoke Photo Finder internally (not spawn process)**
  - [ ] **Pass search paths to Photo Finder correctly**
  - [ ] **Handle Photo Finder errors gracefully**
  - [ ] **Work with Photo Finder's internal manifest format**
- [ ] Create test fixtures:
  - [ ] Sample exports with known data
  - [ ] Test directory structures with sample images
  - [ ] Various edge cases (empty exports, no photos, etc.)

**Acceptance Criteria:**
- [ ] All unit tests passing
- [ ] Code coverage >80% for core functions
- [ ] Tests run in Node.js (not browser)

#### 7.4.2 Manual Testing Scenarios

**Photo Finder Tool:**

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

---

**Export Transformer Tool:**

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

---

**Organizer Tool:**

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

---

**Cross-Tool Integration:**

**Scenario 21: Photo Finder Validation → Organizer Workflow**
- [ ] Run Photo Finder standalone to validate photos
- [ ] Photo Finder generates detailed report
- [ ] Review report to ensure all photos found
- [ ] Run Organizer (which internally invokes Photo Finder again)
- [ ] Photos organized successfully
- [ ] Both tools report same photo count

**Scenario 22: Extract Photos → Organize Workflow**
- [ ] Use Export Transformer to extract embedded photos to disk
- [ ] Photos saved with organized directory structure
- [ ] Use Organizer to create archive with extracted photos
- [ ] Archive contains both export and extracted photos
- [ ] Organization scheme applied correctly

**Scenario 23: Full Workflow**
- [ ] Start with export + scattered photos
- [ ] Use Photo Finder to validate all photos exist
- [ ] Use Export Transformer to remove photos from export (reduce size)
- [ ] Use Organizer to create archive with original photos
- [ ] Result: clean export + organized originals

**Scenario 24: Error Handling**
- [ ] Invalid export file path → clear error
- [ ] Search directory doesn't exist → clear error
- [ ] Output directory not writable → clear error
- [ ] Disk full during copy → graceful failure
- [ ] **Photo Finder internal invocation fails → Organizer shows clear error**
- [ ] **Photo Finder finds no photos → clear error, suggest checking search paths**

**Scenario 25: Platform Testing**
- [ ] Test all tools on Windows (paths with backslashes)
- [ ] Test all tools on macOS/Linux (paths with forward slashes)
- [ ] Test with spaces in filenames
- [ ] Test with Unicode characters in filenames

**Acceptance Criteria:**
- [ ] All scenarios pass on Windows and Unix
- [ ] Error messages are clear and actionable
- [ ] No data corruption or loss
- [ ] Handles edge cases gracefully
- [ ] All three tools work independently
- [ ] **Organizer invokes Photo Finder internally (no code duplication)**
- [ ] **Photo Finder can be used standalone for validation**
- [ ] **Photo Finder internal manifest not saved to disk**

#### 7.4.3 Integration with Existing Tools

- [ ] Verify CLI tools use same lib/snapspot-data modules as browser tools
- [ ] Verify export files created by browser work with CLI tools
- [ ] Verify no breaking changes to shared libraries
- [ ] Run all Phase 1-3 tests to ensure no regressions

**Acceptance Criteria:**
- [ ] All existing tests still passing
- [ ] Shared libraries work in both browser and Node.js
- [ ] No duplicate code between CLI and browser utilities

**Estimated Time:** 1 day

---

### 7.5 Documentation & Polish

**Goal:** Complete documentation and user experience improvements for the CLI framework

- [ ] Update main `snapspot-utils/README.md`:
  - [ ] Add CLI Framework section
  - [ ] Link to CLI tools documentation
  - [ ] Explain when to use CLI vs browser tools
  - [ ] **Add browser + CLI workflow examples** (discover CLI via browser, prototype in browser → batch in CLI)
  - [ ] Add quick start example for each tool
- [ ] Update `snapspot-utils/index.html`:
  - [ ] Add tile for CLI Tools
  - [ ] Link to CLI README
  - [ ] Visual distinction (terminal icon)
  - [ ] Show available CLI tools
  - [ ] **Add badges/icons showing which browser tools have CLI equivalents**
- [ ] Enhance `cli/README.md`:
  - [ ] Framework architecture overview
  - [ ] How to create new CLI tools (developer guide)
  - [ ] Shared utilities documentation
  - [ ] Testing guide for CLI tools
  - [ ] Deployment and distribution
- [ ] Create `cli/CONTRIBUTING.md`:
  - [ ] How to add new CLI tools
  - [ ] Testing requirements
  - [ ] Code style guidelines
  - [ ] Pull request process
- [ ] Add comprehensive examples to each tool's README:
  - [ ] Photo finder: 5+ real-world examples
  - [ ] Export transformer: 10+ transformation examples
  - [ ] Organizer: 5+ organization patterns
  - [ ] **Each tool README mentions browser equivalent (if exists) and workflow integration**
- [ ] Create troubleshooting guide in `cli/README.md`:
  - [ ] Common errors and solutions
  - [ ] Platform-specific issues
  - [ ] Performance optimization tips
  - [ ] Security best practices
- [ ] Add security notes about file system access:
  - [ ] Document risks and mitigations
  - [ ] Safe usage guidelines
  - [ ] Permission requirements
- [ ] Create video/GIF demos (optional):
  - [ ] Photo finder in action
  - [ ] Export transformer batch processing
  - [ ] Organizer creating archive
- [ ] Ensure all JSDoc comments are complete:
  - [ ] All functions documented
  - [ ] Parameter types specified
  - [ ] Return types specified
  - [ ] Usage examples included
- [ ] Run linter on all CLI code:
  - [ ] `npm run lint` shows 0 errors
  - [ ] Code follows StandardJS style
- [ ] Create quick reference cards:
  - [ ] One-page cheat sheet for each tool
  - [ ] Common command patterns
  - [ ] Flag reference

**Acceptance Criteria:**
- [ ] Documentation is clear and comprehensive
- [ ] All code is linted with 0 errors
- [ ] Security considerations documented
- [ ] Examples work as documented
- [ ] Users can get started without additional help
- [ ] Developer guide enables creating new tools easily

**Estimated Time:** 0.5-1 day

---

## Acceptance Criteria

### Functional Requirements
- [ ] **Photo Finder:** Successfully finds photos by filename (case-insensitive)
- [ ] **Photo Finder:** Generates accurate reports of found/missing/duplicate photos
- [ ] **Photo Finder:** Can save photo manifest in Organizer-compatible format
- [ ] **Photo Finder:** Can directly invoke Organizer to copy/organize found photos
- [ ] **Export Transformer:** All transformation operations work correctly
- [ ] **Export Transformer:** Can batch process multiple export files
- [ ] **Export Transformer:** Dry-run mode shows accurate preview
- [ ] **Organizer:** All organization schemes create correct directory structures
- [ ] **Organizer:** Handles missing photos gracefully
- [ ] **Organizer:** Creates browsable HTML index
- [ ] **Organizer:** Can accept Photo Finder manifest as input
- [ ] **Organizer:** Can search for photos directly when no manifest provided
- [ ] All tools work in both interactive and command-line modes
- [ ] Reports are comprehensive and accurate
- [ ] Progress indication for all long operations
- [ ] Handles errors gracefully without data loss
- [ ] **Tools compose together (Photo Finder → Organizer workflow)**

### Non-Functional Requirements
- [ ] Works on Windows, macOS, and Linux
- [ ] Performance: Search 100k+ files in <5 seconds
- [ ] Performance: Transform 100 exports in <10 seconds
- [ ] Performance: Organize 1000 photos in <30 seconds
- [ ] Memory: Handles exports with 10k+ photos without crashing
- [ ] Code quality: 0 linting errors
- [ ] Code quality: >80% test coverage for core functions
- [ ] User experience: Clear prompts and error messages
- [ ] User experience: Keyboard-only operation possible
- [ ] Framework: Easy to add new CLI tools (reusable components)

### Integration Requirements
- [ ] **ZERO code duplication** - All export operations use `lib/snapspot-data` and `lib/snapspot-image`
- [ ] **Reuses lib/snapspot-data modules without modification** - No copying, only imports
- [ ] **Reuses lib/snapspot-image modules without modification** - No copying, only imports
- [ ] No breaking changes to shared libraries
- [ ] All Phase 1-6 tests still passing
- [ ] CLI tools isolated from browser utilities (separate package.json in `cli/`)
- [ ] Shared libraries work identically in both browser and Node.js contexts
- [ ] CLI wrappers (export-loader, export-writer) are thin layers only
- [ ] Browser tools can generate CLI commands for equivalent operations

### Documentation Requirements
- [ ] README explains framework architecture and installation
- [ ] Each tool has comprehensive documentation
- [ ] Usage examples for all common scenarios
- [ ] Security considerations documented
- [ ] Troubleshooting guide complete
- [ ] Developer guide for creating new tools

---

## Architecture Decisions

### Why Separate CLI Package?

**Decision:** Create `cli/` as a separate npm package with its own `package.json`

**Rationale:**
- Browser utilities have no dependencies; CLI tools need Node.js modules
- Keeps browser bundle size small (no Node.js deps)
- Clear separation of concerns (browser vs Node.js)
- Users can choose to install only what they need
- Different testing strategies (browser vs Node.js)

### Why Reuse lib/snapspot-data?

**Decision:** Import `lib/snapspot-data` and `lib/snapspot-image` modules directly in CLI tools. **ZERO code duplication.**

**Rationale:**
- **Avoid code duplication** - Single implementation of parsing, validation, writing logic
- **Ensure format compatibility** - Browser and CLI tools always use identical logic
- **Single source of truth** - Export format defined once in `lib/snapspot-data/validator.js`
- **Easier maintenance** - Fix bugs once, applies to both browser and CLI
- **Changes propagate automatically** - Update shared lib, both contexts benefit
- **Testing efficiency** - Test once, confident in both environments

**Implementation Pattern:**

```javascript
// CLI tool imports shared library directly
import { parseExport } from '../../lib/snapspot-data/parser.js'
import { validateExport } from '../../lib/snapspot-data/validator.js'
import { writeExport } from '../../lib/snapspot-data/writer.js'

// CLI wrapper adds file system operations only
async function loadExportFromDisk(filePath) {
  const jsonString = await fs.readFile(filePath, 'utf-8')  // CLI-specific: read from disk
  const jsonData = JSON.parse(jsonString)
  const validation = validateExport(jsonData)  // Shared library
  if (!validation.valid) throw new Error(validation.errors.join(', '))
  return parseExport(jsonData)  // Shared library
}
```

**What CLI Adds:**
- File system operations (`fs.readFile`, `fs.writeFile`)
- Directory traversal
- User prompts and progress bars
- Command-line argument parsing
- Batch processing logic

**What Remains Shared:**
- Export validation (`lib/snapspot-data/validator.js`)
- Export parsing (`lib/snapspot-data/parser.js`)
- Export writing (`lib/snapspot-data/writer.js`)
- Image conversion (`lib/snapspot-image/converter.js`)
- Hash generation (`lib/snapspot-image/hasher.js`)

**Testing Strategy:**
- Shared libraries tested in both browser and Node.js environments
- CLI wrappers tested only in Node.js (thin layer, minimal logic)
- Integration tests ensure both contexts produce identical results

### Why Filename-Only Matching for Photos?

**Decision:** Photo finder matches by filename only (not hash), with case-insensitive option

**Rationale:**
- SnapSpot stores compressed photos in database (different hash than originals)
- Users want to find original high-quality photos copied from device
- Original photos have same filename but different content (uncompressed)
- Hash matching would fail for originals vs compressed versions
- Filename + file extension is sufficient for most use cases

**Alternative Approaches:**
- Hash matching: Would work for exact duplicates only (not originals)
- EXIF matching: Not all photos have EXIF data
- Size-based heuristics: Unreliable, fragile

### Why Three Separate Tools Instead of One?

**Decision:** Create photo-finder, export-transformer, and organizer as separate tools

**Rationale:**
- Each has distinct purpose and workflow
- Easier to understand and use (single responsibility)
- Can be combined in workflows as needed
- Simplifies testing and maintenance
- Users can learn one tool at a time

**Alternative Considered:**
- Single tool with subcommands: More complex, harder to learn
- Would require choosing which features to combine

### Why Both Interactive and CLI Modes?

**Decision:** All tools support interactive prompts AND command-line arguments

**Rationale:**
- Interactive: Better for first-time users, exploratory workflows
- CLI: Better for automation, scripting, batch processing
- Different users have different preferences
- Both modes use same core logic (no duplication)

**Implementation Pattern:**
```javascript
// Check if CLI args provided
if (process.argv.length > 2) {
  // CLI mode: parse arguments
  runCliMode(args)
} else {
  // Interactive mode: prompt user
  runInteractiveMode()
}
```

### Why Inquirer for Prompts?

**Decision:** Use Inquirer.js library for interactive prompts

**Rationale:**
- Industry standard for Node.js CLI tools
- Rich features (autocomplete, validation, etc.)
- Better UX than raw readline
- Keyboard navigation built-in
- Extensible prompt types

**Alternatives Considered:**
- Raw readline: Too low-level, poor UX
- Prompts: Good but less feature-rich than Inquirer
- Commander: Command parsing, not prompts (use both)

### Why Commander for Argument Parsing?

**Decision:** Use Commander.js for command-line argument parsing

**Rationale:**
- Industry standard for Node.js CLI tools
- Automatic help generation
- Type validation
- Subcommand support (if needed later)
- Git-style command interface

**Alternatives Considered:**
- yargs: More complex, heavier
- minimist: Too basic, no validation
- Manual parsing: Error-prone, reinvents wheel

### Framework Extensibility Design

**Decision:** Design shared utilities to be reusable for future CLI tools

**Rationale:**
- Reduces code duplication
- Consistent UX across all tools
- Faster development of new tools
- Easier maintenance (fix once, apply everywhere)

**Shared Components Enable Future Tools:**
- **file-finder:** Any tool needing file search
- **export-loader/writer:** Any tool working with exports (always uses lib/snapspot-data)
- **prompt-helpers:** Any interactive tool
- **progress-bar:** Any long-running operation
- **report-generator:** Any tool producing reports

**Future Tools Built on This Framework:**
- Export merger CLI (batch merge) - uses `lib/snapspot-data/merger.js`
- Format converter CLI (batch convert) - uses shared parsers/writers
- Export validator CLI (bulk validation) - uses `lib/snapspot-data/validator.js`
- Photo deduplicator (find duplicates across exports) - uses `lib/snapspot-image/hasher.js`
- Metadata extractor (EXIF → marker descriptions)

### Photo Finder + Organizer Integration

**Decision:** Photo Finder can save manifest files that Organizer can consume, OR directly invoke Organizer

**Rationale:**
- **Separation of Concerns:** Each tool has a single, clear purpose
- **Composability:** Tools can be combined in flexible workflows
- **Unix Philosophy:** Small tools that do one thing well, can be piped together
- **Flexibility:** Users can choose how to combine tools based on needs

**Two Integration Approaches:**

**Approach 1: Manifest-Based (Recommended)**
```bash
# Step 1: Find and save manifest
photo-finder --export data.json --search /photos --save-manifest found.json

# Step 2 (optional): Review manifest, edit if needed

# Step 3: Organize using manifest
organizer --manifest found.json --scheme by-marker --output /archive
```

**Benefits:**
- Separation of search and organization phases
- Can review/edit manifest before organizing
- Manifest serves as documentation of what was found
- Can re-organize same photos multiple ways without re-searching

**Approach 2: Direct Invocation (Convenience)**
```bash
# One-step: find and organize
photo-finder --export data.json --search /photos --organize --organize-scheme by-marker --organize-output /archive
```

**Benefits:**
- Faster for simple workflows
- Fewer commands to remember
- Good for automation/scripting

**Manifest File Format:**
```json
{
  "version": "1.0",
  "created": "2026-02-03T10:30:00Z",
  "tool": "photo-finder",
  "export": {
    "path": "/path/to/export.json",
    "name": "Site Survey 2026",
    "maps": 3,
    "markers": 25,
    "photos": 100
  },
  "search": {
    "directories": ["/photos", "/backup/photos"],
    "caseSensitive": false,
    "maxDepth": 10
  },
  "results": {
    "found": 95,
    "missing": 5,
    "duplicates": 2
  },
  "photos": [
    {
      "filename": "IMG_1234.jpg",
      "markerId": "uuid-123",
      "markerNumber": 1,
      "mapName": "Floor 1",
      "foundPath": "/photos/2026/IMG_1234.jpg",
      "status": "found"
    },
    {
      "filename": "IMG_1235.jpg",
      "markerId": "uuid-124",
      "markerNumber": 2,
      "mapName": "Floor 1",
      "foundPath": null,
      "status": "missing"
    }
  ]
}
```

**Why This Format:**
- Self-documenting (includes metadata about search)
- Organizer can validate before processing
- Human-readable (can be manually edited if needed)
- Includes all info needed for organization
- Future-extensible (version field allows evolution)

### Browser + CLI Workflow Integration

**Design Principle:** Browser utilities should provide CLI command hints for batch operations.

**Example Workflow Pattern:**

1. **User in Browser:** Transforms a single export file (e.g., removes all photos)
2. **Browser Tool Shows:** Success message + CLI command for batch processing
3. **User Runs CLI:** Applies same transformation to 100 exports in seconds

**Implementation Example:**

```javascript
// In browser export-transformer tool (future Phase 8)
function showTransformationSuccess(exportName, transformations) {
  const message = `Successfully transformed ${exportName}`
  
  // Generate equivalent CLI command
  const cliCommand = generateCliCommand(transformations)
  
  showModal({
    title: 'Transformation Complete',
    message,
    cliHint: {
      title: 'Batch Process Multiple Files?',
      description: 'Use the CLI tool to apply the same transformation to many exports at once:',
      command: cliCommand,
      copyButton: true
    }
  })
}

function generateCliCommand(transformations) {
  let cmd = 'node cli/tools/export-transformer/export-transformer.js'
  cmd += ' --export \"exports/*.json\"'
  
  if (transformations.includes('removePhotos')) {
    cmd += ' --remove-photos'
  }
  if (transformations.includes('renameMap')) {
    cmd += ` --rename-map \"${oldName}:${newName}\"`
  }
  cmd += ' --backup --output-dir ./transformed'
  
  return cmd
}
```

**Benefits:**
- **Discoverability:** Users learn CLI exists when they need batch operations
- **Lower Barrier:** Exact command provided, no manual construction needed
- **Consistency:** Same transformations in browser and CLI (shared libs guarantee this)
- **Progressive Enhancement:** Start with browser UI, scale to CLI when needed

**Future Browser Tool Features:**
- **Map Migrator:** After migrating one map, show CLI command to batch-migrate project
- **Format Converter:** After converting one export, show CLI for batch conversion
- **Export Merger:** After merging two exports, show CLI to merge entire directory
- **Photo Organizer:** After organizing one export, show CLI to organize collection

**CLI Tool Indicators in Browser UI:**
- Small terminal icon next to tool names that have CLI equivalents
- Tooltip: "This tool has a CLI version for batch processing"
- Help section with CLI documentation link

**Example User Flows:**

**Flow 1: Discover CLI via Browser**
```
User: Transforms export in browser
  ↓
Browser: Shows success + CLI command hint
  ↓
User: Copies command, runs in terminal for 100 files
  ↓
Result: All 100 files transformed in seconds
```

**Flow 2: Start with CLI, Prototype in Browser**
```
User: Wants to batch-transform exports but unsure of exact params
  ↓
User: Opens browser tool, experiments with settings
  ↓
Browser: Shows preview of results
  ↓
User: Confirms settings, copies CLI command
  ↓
Result: Batch processes with confidence
```

**Documentation Integration:**
- Each browser tool README should mention CLI equivalent (if exists)
- Each CLI tool README should mention browser equivalent (if exists)
- Main README should explain browser + CLI workflow patterns

---

## Test Results

*To be added when phase is complete*

---

## Performance Metrics

*To be added when phase is complete*

Target benchmarks:

| Tool | Operation | Target | Notes |
|------|-----------|--------|-------|
| Photo Finder | File search | <5s for 100k+ files | Recursive directory traversal |
| Photo Finder | Report generation | <1s | All formats (text/JSON/HTML) |
| Transformer | Single export | <100ms | Including validation |
| Transformer | Batch (100 exports) | <10s | Sequential processing |
| Transformer | Backup creation | <500ms | Per file |
| Organizer | Photo copy (1000 photos) | <30s | Including hash verification |
| Organizer | Directory structure | <1s | Any scheme, any size export |
| Organizer | HTML index generation | <2s | For 1000+ photos |
| Export Loader | Parse 10MB export | <1s | Including validation |
| Export Writer | Write 10MB export | <1s | Including pretty-print |
| All Tools | Memory usage | <500MB | For export with 10k photos |
| All Tools | Startup time | <1s | Time to first prompt/output |

---

## Additional Deliverables

*To be added when phase is complete*

---

## Notes

### Installation Process

Users will install CLI tools with:
```bash
cd snapspot-utils/cli
npm install
```

Then run tools with:

**Interactive mode:**
```bash
node tools/photo-finder/photo-finder.js
node tools/export-transformer/export-transformer.js
node tools/organizer/organizer.js
```

**Command-line mode:**
```bash
# Photo Finder
node tools/photo-finder/photo-finder.js \
  --export path/to/export.json \
  --search /photos/directory \
  --report report.html \
  --format html

# Export Transformer  
node tools/export-transformer/export-transformer.js \
  --export "exports/*.json" \
  --remove-photos \
  --backup \
  --output-dir ./cleaned

# Organizer
node tools/organizer/organizer.js \
  --export path/to/export.json \
  --search /photos/directory \
  --output /archive \
  --scheme by-marker \
  --create-index
```

Optionally, add npm scripts in `cli/package.json`:
```json
{
  "scripts": {
    "find-photos": "node tools/photo-finder/photo-finder.js",
    "transform": "node tools/export-transformer/export-transformer.js",
    "organize": "node tools/organizer/organizer.js"
  }
}
```

Then users can run:
```bash
npm run find-photos -- --export path/to/export.json
npm run transform -- --remove-photos
npm run organize -- --scheme by-map
```

### Critical: Zero Code Duplication

**IMPORTANT:** All CLI tools MUST use the shared libraries from `lib/snapspot-data` and `lib/snapspot-image`. DO NOT copy or reimplement any logic that exists in these modules.

**What CLI Tools Can Do:**
- File system operations (read/write files, directory traversal)
- User prompts and interactive workflows
- Command-line argument parsing
- Progress display and reporting
- Batch processing orchestration

**What CLI Tools MUST NOT Do:**
- Parse export files (use `lib/snapspot-data/parser.js`)
- Validate export files (use `lib/snapspot-data/validator.js`)
- Write export files (use `lib/snapspot-data/writer.js`)
- Convert images (use `lib/snapspot-image/converter.js`)
- Generate hashes (use `lib/snapspot-image/hasher.js`)
- Merge exports (use `lib/snapspot-data/merger.js`)

**Why This Matters:**
- **Consistency:** Browser and CLI produce identical results
- **Maintenance:** Bug fixes apply to both environments automatically
- **Testing:** Test once, confident everywhere
- **Format Evolution:** Export format changes propagate to all tools
- **Code Quality:** No duplicated logic to maintain

**Verification:**
- Review code: No SnapSpot-specific parsing/writing logic in CLI files
- Check imports: All export operations import from `lib/`
- Run tests: Shared library tests pass in both browser and Node.js
- Compare outputs: Browser and CLI produce byte-identical exports

### Future CLI Tools

This infrastructure enables future tools:

**Batch Operations:**
- **Export Merger CLI:** Merge multiple exports via command line (alternative to browser tool)
- **Format Converter CLI:** Batch convert exports to different formats
- **Export Validator CLI:** Validate export files in bulk with detailed reports
- **Batch Editor:** Apply scripted edits across many exports (e.g., regex replace in descriptions)

**Photo Management:**
- **Photo Deduplicator:** Find duplicate photos across multiple exports (by hash)
- **Photo Compressor:** Recompress photos in exports to reduce file size
- **EXIF Extractor:** Extract EXIF metadata from original photos and add to marker descriptions
- **Missing Photo Reporter:** Generate comprehensive missing photo reports

**Data Analysis:**
- **Export Analyzer:** Generate statistics about exports (markers per map, photos per marker, etc.)
- **Usage Reporter:** Analyze collection of exports to find usage patterns
- **Data Extractor:** Extract specific data (all descriptions, all dates, etc.) to CSV/JSON

**Integration:**
- **Cloud Sync:** Sync exports to cloud storage (Google Drive, Dropbox)
- **Database Importer:** Import exports into SQL database for querying
- **GIS Converter:** Convert marker coordinates to GIS formats (if spatial data added)

### Security Considerations

CLI tools have file system access, so:
- **Validate all file paths** before operations (prevent directory traversal)
- **Warn users before bulk operations** (show count, confirm deletion/modification)
- **Provide dry-run mode for preview** (no actual changes, show what would happen)
- **Ask confirmation before destructive actions** (delete, overwrite, etc.)
- **Document security implications in README** (risks of file system access)
- **Create backups by default** for destructive operations (can be disabled)
- **Sanitize filenames and paths** (prevent injection attacks)
- **Respect system file permissions** (don't attempt privileged operations)

**Security Best Practices Documentation:**
- Don't run tools with elevated privileges unless necessary
- Review dry-run output before confirming operations
- Keep backups before using transformation tools
- Be cautious with glob patterns (verify they match intended files)
- Don't pipe untrusted input to tools

### Cross-Platform Compatibility

Ensure compatibility across operating systems:

**Path Handling:**
- Use `path.join()` for all path operations (handles OS differences)
- Use `path.sep` for path separators (not hardcoded `/` or `\`)
- Use `path.normalize()` for user-provided paths
- Test on Windows (backslashes) and Unix (forward slashes)

**File System Operations:**
- Use `fs-extra` instead of built-in `fs` (better cross-platform support)
- Handle spaces in filenames (quote paths in commands)
- Handle special characters (Unicode, etc.)
- Respect OS-specific file system limits (path length, filename chars)

**Terminal/Console:**
- Detect terminal width for progress bars (`process.stdout.columns`)
- Handle color support detection (some terminals don't support colors)
- Use `os.EOL` for line endings (not hardcoded `\n`)
- Test with different terminal emulators (PowerShell, bash, zsh, etc.)

**Testing Strategy:**
- Run tests on Windows, macOS, and Linux in CI/CD
- Test with different Node.js versions (LTS and current)
- Test in different terminals (CMD, PowerShell, bash, zsh)
- Include platform-specific edge cases in test fixtures

### Performance Optimization Tips

**For Large File Searches:**
- Use glob patterns to narrow search scope
- Set max-depth to avoid unnecessary deep traversal
- Exclude known large directories (node_modules, .git, etc.)
- Run searches in parallel for multiple exports

**For Batch Transformations:**
- Process exports in batches (e.g., 10 at a time) to manage memory
- Use streaming for very large exports (read/write incrementally)
- Cache parsed exports if applying multiple transformations

**For Photo Organization:**
- Copy files in batches with progress updates
- Use `fs-extra.copy()` instead of read+write (more efficient)
- Consider hardlinks instead of copies for local organization (saves space)
- Parallelize copy operations (but respect I/O limits)

---

## Phase 7 Complete Summary

*To be added when phase is complete*

---

## Next Steps: Future Enhancements

After Phase 7, consider:

### Additional CLI Tools
- **Export Merger CLI:** Command-line version of browser merger tool (faster for large batches)
- **Format Converter CLI:** Batch convert between SnapSpot formats
- **Export Validator CLI:** Comprehensive validation with detailed error reports
- **Data Analyzer CLI:** Generate statistics and insights from exports
- **Photo Deduplicator:** Find and manage duplicate photos across collections

### Distribution & Packaging
- **npm Package Publication:** Publish `@snapspot/cli-tools` for easy installation
- **Executable Binaries:** Create standalone executables for non-Node.js users (pkg, nexe)
- **Docker Image:** Containerized CLI tools for consistent environments
- **Homebrew Formula:** macOS package manager support
- **Chocolatey Package:** Windows package manager support

### CI/CD & Quality
- **Automated Testing:** GitHub Actions for cross-platform testing (Windows, macOS, Linux)
- **Integration Tests:** End-to-end tests for complete workflows
- **Performance Benchmarks:** Track performance over time
- **Code Quality Gate:** Automated linting, test coverage checks

### Advanced Features
- **Configuration Files:** Support `.snapspotrc` for default settings
- **Plugin System:** Allow users to add custom transformations and organization schemes
- **Scripting Support:** JavaScript-based transformation scripts for complex edits
- **Watch Mode:** Monitor directories for new exports and process automatically
- **Progress Persistence:** Resume interrupted long-running operations

### Cloud Integration
- **Cloud Storage APIs:** Direct integration with Google Drive, Dropbox, OneDrive
- **Remote Export Processing:** Process exports stored in cloud without downloading
- **Collaboration Features:** Share exports and photos through cloud services

### Web Service Alternative
- **REST API:** HTTP API wrapping CLI tools for web applications
- **Web Interface:** Simple web UI for CLI tools (local server)
- **Batch Processing Service:** Queue-based batch processing for large collections

### Documentation Enhancements
- **Video Tutorials:** Step-by-step video guides for each tool
- **Interactive Docs:** Try tools with sample data in browser-based terminal
- **Community Examples:** User-contributed transformation scripts and workflows
- **Translation:** Multilingual documentation for wider accessibility
