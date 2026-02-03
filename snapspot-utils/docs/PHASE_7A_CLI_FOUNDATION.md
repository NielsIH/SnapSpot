# Phase 7A: CLI Foundation & Shared Utilities

**Status:** ⏳ PLANNED  
**Parent Phase:** Phase 7 - Node.js CLI Utilities  
**Duration:** 2 days (estimated)  
**Dependencies:** Phase 6 complete (Map Migrator fully functional)  
**Goal:** Establish Node.js CLI infrastructure and build reusable shared utilities

---

## Overview

This sub-phase establishes the foundation for all CLI tools by:
1. Setting up the Node.js CLI package structure
2. Creating shared utilities that all CLI tools will use
3. Establishing patterns for zero code duplication with browser utilities

**Critical Principle:** All shared utilities are thin wrappers around `lib/snapspot-data` and `lib/snapspot-image`. NO code duplication - export validation, parsing, and writing logic comes from shared libraries.

---

## Deliverables

### Core CLI Infrastructure
- [ ] `cli/` - Root directory for CLI tools
- [ ] `cli/package.json` - Separate Node.js package configuration
- [ ] `cli/README.md` - CLI framework overview and getting started
- [ ] `cli/.gitignore` - Ignore node_modules

### Shared Utilities (`cli/shared/`)
- [ ] `cli/shared/file-finder.js` - Recursive file search utility
- [ ] `cli/shared/export-loader.js` - SnapSpot export file loader/validator
- [ ] `cli/shared/export-writer.js` - SnapSpot export file writer
- [ ] `cli/shared/prompt-helpers.js` - User input prompts
- [ ] `cli/shared/progress-bar.js` - Progress display
- [ ] `cli/shared/report-generator.js` - Generate reports

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
  - [ ] **Browser + CLI workflow patterns**
- [ ] Create `cli/.gitignore` (ignore node_modules)
- [ ] Add npm scripts for running tools
- [ ] Document relationship to browser utilities
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
  - [ ] Case-insensitive filename matching
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
  - [ ] **Validate using `lib/snapspot-data/validator.js`** (shared library)
  - [ ] **Parse using `lib/snapspot-data/parser.js`** (shared library)
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
- [ ] **ZERO duplication - all logic from `lib/snapspot-data`**

#### 7.2.3 Export Writer (`cli/shared/export-writer.js`)

**CRITICAL: This is a thin wrapper around `lib/snapspot-data`. All writing/validation logic must come from shared libraries.**

- [ ] Implement `writeExportFile(exportData, filePath, options)`
  - [ ] **Validate using `lib/snapspot-data/validator.js`** (shared library)
  - [ ] **Use `lib/snapspot-data/writer.js` for serialization** (shared library)
  - [ ] Create backup of existing file (optional)
  - [ ] Write to disk using Node.js `fs` with pretty-print option
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
- [ ] **ZERO duplication - all logic from `lib/snapspot-data`**

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
  - [ ] Export transformation results
  - [ ] Organization results
- [ ] Write reports to file or stdout
- [ ] Write JSDoc with usage examples

**Acceptance Criteria:**
- [ ] Generates clear, readable reports
- [ ] All three formats work correctly
- [ ] Reports contain all relevant information
- [ ] HTML reports open in browser correctly

**Estimated Time:** 1.5 days

---

## Acceptance Criteria

### Infrastructure
- [ ] CLI package installs successfully on Windows, macOS, Linux
- [ ] All dependencies locked in package-lock.json
- [ ] Clear separation from browser utilities
- [ ] Documentation explains architecture

### Shared Utilities
- [ ] All 6 shared utilities implemented and tested
- [ ] **ZERO code duplication with lib/snapspot-data and lib/snapspot-image**
- [ ] JSDoc comments complete with examples
- [ ] All acceptance criteria met for each utility
- [ ] Works across platforms (Windows/Unix)

### Code Quality
- [ ] Follows StandardJS linting rules
- [ ] TypeScript JSDoc for IntelliSense
- [ ] Error handling comprehensive
- [ ] Performance meets targets

---

## Testing Plan

### Unit Tests
- [ ] File finder: search, case-insensitivity, exclude patterns
- [ ] Export loader: valid/invalid files, summaries, batch loading
- [ ] Export writer: write, validate, backup, transformations
- [ ] Prompt helpers: all prompt types, validation, cancellation
- [ ] Progress bar: display, updates, completion
- [ ] Report generator: all formats, templates

### Integration Tests
- [ ] Export loader + writer round-trip (identical output)
- [ ] Shared libraries work in Node.js context (same as browser)
- [ ] Cross-platform path handling

### Manual Testing
- [ ] Test on Windows (PowerShell, CMD)
- [ ] Test on macOS (zsh, bash)
- [ ] Test on Linux (bash)
- [ ] Test with special characters in paths
- [ ] Test with large files (10MB+ exports)

---

## Architecture Notes

### Zero Duplication Pattern

**CLI wrapper example:**
```javascript
// cli/shared/export-loader.js
import { parseExport } from '../../lib/snapspot-data/parser.js'
import { validateExport } from '../../lib/snapspot-data/validator.js'
import fs from 'fs/promises'

// CLI adds: file system operations only
export async function loadExportFile(filePath) {
  const jsonString = await fs.readFile(filePath, 'utf-8')  // CLI-specific
  const jsonData = JSON.parse(jsonString)
  
  const validation = validateExport(jsonData)  // Shared library
  if (!validation.valid) {
    throw new Error(`Invalid export: ${validation.errors.join(', ')}`)
  }
  
  return parseExport(jsonData)  // Shared library
}
```

**What CLI Can Add:**
- File system operations (fs.readFile, fs.writeFile)
- Directory traversal
- User prompts and progress bars
- Command-line argument parsing

**What Must Come from Shared Libraries:**
- Export validation (`lib/snapspot-data/validator.js`)
- Export parsing (`lib/snapspot-data/parser.js`)
- Export writing (`lib/snapspot-data/writer.js`)
- Image conversion (`lib/snapspot-image/converter.js`)
- Hash generation (`lib/snapspot-image/hasher.js`)

### Cross-Platform Compatibility

**Path Handling:**
```javascript
import path from 'path'

// CORRECT
const fullPath = path.join(baseDir, filename)

// WRONG
const fullPath = baseDir + '/' + filename  // Fails on Windows
```

**Line Endings:**
```javascript
import os from 'os'

// CORRECT
const lines = text.split(os.EOL)

// WRONG
const lines = text.split('\n')  // Inconsistent across platforms
```

---

## Next Steps

After completing Phase 7A:
- Proceed to [Phase 7B: Photo Finder Tool](PHASE_7B_PHOTO_FINDER.md)
- CLI foundation will be used by all three CLI tools
