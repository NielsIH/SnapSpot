# SnapSpot Library Refactoring - Workflow Tracker

**Last Updated:** January 30, 2026  
**Current Phase:** Phase 3 - Refactor snapspot-utils  
**Current Task:** Phase 3A - Update Map Migrator

---

## Quick Reference

**When you say "let's continue":**
1. Check current phase below
2. Open the corresponding phase document
3. Find the first unchecked task
4. Implement it
5. Check for linting errors
6. If manual testing is needed, stop and provide test instructions
7. After tests pass, commit changes
8. Update checkboxes and move to next task

---

## Overall Progress

### ✅ Phase 1: Create Shared Libraries
**Status:** COMPLETED  
**Document:** `PHASE_1_LIBRARIES.md` (completed, archived in plan)  
**Completion Date:** January 30, 2026

**Deliverables:**
- ✅ lib/snapspot-data/ (parser, writer, validator, merger, splitter)
- ✅ lib/snapspot-image/ (converter, hasher)
- ✅ All READMEs and documentation

---

### ✅ Phase 2: Refactor SnapSpot App
**Status:** COMPLETED  
**Document:** Multiple sub-phases for focused testing  
**Started:** January 30, 2026  
**Completed:** January 30, 2026

**Sub-Phases:**
- ✅ Phase 2A: Refactor ImageProcessor ([PHASE_2A_IMAGEPROCESSOR.md](PHASE_2A_IMAGEPROCESSOR.md)) - COMPLETED
- ✅ Phase 2B: Create StorageExporterImporter ([PHASE_2B_STORAGE_EXPORTER.md](PHASE_2B_STORAGE_EXPORTER.md)) - COMPLETED
- ✅ Phase 2C: Integration and Wrapper ([PHASE_2C_INTEGRATION.md](PHASE_2C_INTEGRATION.md)) - COMPLETED

**Progress:** 3/3 sub-phases completed

**Deliverables:**
- ✅ Refactored ImageProcessor using lib/snapspot-image
- ✅ Created StorageExporterImporter using lib/snapspot-data and lib/snapspot-image
- ✅ Created backward-compatible wrapper in MapDataExporterImporter
- ✅ All 13 integration tests passed
- ✅ Fixed legacy import issue (hash generation for files without imageHash)

---

### ⬜ Phase 3: Refactor snapspot-utils
**Status:** NOT STARTED  
**Documents:** Multiple sub-phases  

**Sub-Phases:**
- ⬜ Phase 3A: Update Map Migrator ([PHASE_3A_MAP_MIGRATOR.md](PHASE_3A_MAP_MIGRATOR.md))
- ⬜ Phase 3B: Deprecate Old Format Handlers ([PHASE_3B_DEPRECATE.md](PHASE_3B_DEPRECATE.md))
- ⬜ Phase 3C: Create Export Merger Tool ([PHASE_3C_MERGER_TOOL.md](PHASE_3C_MERGER_TOOL.md))
🔄 Phase 3: Refactor snapspot-utils
**Status:** IN PROGRESS  
**Documents:** Multiple sub-phases  
**Started:** January 30, 2026

**Sub-Phases:**
- 🔄 Phase 3A: Update Map Migrator ([PHASE_3A_MAP_MIGRATOR.md](PHASE_3A_MAP_MIGRATOR.md)) - IN PROGRESS
- ⬜ Phase 3B: Deprecate Old Format Handlers ([PHASE_3B_DEPRECATE.md](PHASE_3B_DEPRECATE.md))
- ⬜ Phase 3C: Create Export Merger Tool ([PHASE_3C_MERGER_TOOL.md](PHASE_3C_MERGER_tool.md))

**Progress:** 0/3 sub-phases completed

**Current Task:** Phase 3A - Update map-migrator to use shared libraries

**Tasks:**
- 🔄 Phase 3A: Update map-migrator imports + test
- ⬜ Phase 3B: Deprecate format handlers + test backward compatibility
- ⬜ Phase 3C:asks:**
- ⬜ Update main documentation
- ⬜ Create migration guide
- ⬜ Remove deprecated code
- ⬜ Performance benchmarking
- ⬜ Final review
- ⬜ Final commit & release

**Note:** This phase is primarily documentation with no required manual testing at the end of each task.

---

## Commit H
- ✅ Commit: "feat: refactor ImageProcessor to use lib/snapspot-image"
- ✅ Commit: "feat: create StorageExporterImporter using shared libraries"
- ✅ Commit: "refactor: integrate StorageExporterImporter with wrapper, fix legacy import
### Phase 1 ← **NEXT**
- ⬜ Commit: "refactor: deprecate old format handlers with re-exports"
- ⬜ Commit: "feat: add export merger toolth wrapper"

### Phase 3
- ⬜ Commit: "refactor: update map-migrator to use lib/snapspot-data"
- ⬜ Commit: "refactor: deprecate old format handlers with re-exports"
- ⬜ Commit: "feat: add export merger tool
### Phase 3
- ⬜ Commit: "refactor: update utils to use shared libraries"

### Phase 4
- ⬜ Commit: "docs: update documentation for library architecture"
- ⬜ Commit: "chore: remove deprecated code and cleanup"

---

## Current Context

**Files Modified Since Last Commit:**
- (none yet - ready for Phase 3A)

**Files To Modify Next:**
- `snapspot-utils/tools/map-migrator/*` (UPDATE)

**Expected Duration:** 2-3 hours (Phase 3A)

**Blocking Issues:** None

---

## How to Use This Workflow

### Starting a Work Session
1. Open this file (REFACTORING_WORKFLOW.md)
2. Check "Current Phase" and "Current Task" at the top
3. Open the corresponding phase document
4. Read the current task details
5. Implement the task
6. Run error checks
7. If manual testing required, stop and get test approval
8. Commit when tests pass
9. Update checkboxes in phase document AND this file

### When You Say "let's continue"
I will:
1. Read this workflow file
2. Identify current phase and task
3. Open the phase document
4. Continue with the next unchecked task
5. Implement → Fix linting (`npm run lint:fix`) → Check errors (`npm run lint`) → Test → Commit → Update

### After Manual Testing
You say:
- ✅ "Tests passed" → I commit and move to next task
- ❌ "Tests failed: [description]" → I fix the issues and re-test

### Completing a Phase
When all tasks in a phase are checked:
1. Update phase status to ✅ COMPLETED
2. Add completion date
3. Move to next phase
4. Update "Current Phase" and "Current Task" at top

---

## Reference Links

- [Main Refactoring Plan](LIBRARY_REFACTORING_PLAN.md)
- [Phase 2 Document](PHASE_2_REFACTOR_APP.md)
- [Phase 3 Document](PHASE_3_REFACTOR_UTILS.md)
- [Phase 4 Document](PHASE_4_CLEANUP.md)
- [Library API Docs](../lib/README.md)
