# Phase Implementation Workflow

**Purpose:** This document defines the exact process for implementing each phase. Follow this workflow to ensure consistency and avoid redundant documentation.

---

## Starting a New Phase

### Step 1: Identify the Phase Document

Point to the phase-specific implementation document:
- **Phase 1:** `docs/IMPLEMENTATION_PHASE_1.md` ← ✅ COMPLETE
- **Phase 2:** `docs/IMPLEMENTATION_PHASE_2.md` ← ✅ COMPLETE
- **Phase 3:** `docs/IMPLEMENTATION_PHASE_3.md` ← NEXT
- **Phase 4:** `docs/IMPLEMENTATION_PHASE_4.md`
- **Phase 5:** `docs/IMPLEMENTATION_PHASE_5.md`
- **Phase 6:** `docs/IMPLEMENTATION_PHASE_6.md`

### Step 2: Verify Phase Document Structure

Each `IMPLEMENTATION_PHASE_X.md` must have this structure:

```markdown
# Phase X: [Name]

**Status:** 🔄 IN PROGRESS (or ✅ COMPLETE)
**Started:** [Date]
**Completed:** [Date or TBD]
**Duration:** X days
**Dependencies:** [Phase dependencies]
**Goal:** [Brief description]

## Deliverables
- [ ] File 1
- [ ] File 2
...

## Tasks
### X.1 Task Name
- [ ] Subtask 1
- [ ] Subtask 2
...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
...

## Test Results
[Added when phase is complete]

## Performance Metrics
[Added when phase is complete]

## Additional Deliverables
[Added when phase is complete]

## Notes
[Implementation decisions and notes]

## Phase X Complete Summary
[Added when phase is complete]

## Next Steps: Phase Y
[Link to next phase]
```

---

## During Phase Implementation

### ✅ DO:

1. **Update the phase document** (`IMPLEMENTATION_PHASE_X.md`)
   - Check off tasks as you complete them: `- [ ]` → `- [x]`
   - Add implementation notes as you discover them
   - Keep the document as your working checklist

2. **Create the actual code files** listed in deliverables
   - Follow the file paths specified in the document
   - Include JSDoc comments
   - Write tests alongside implementation (see [Testing Guide](TESTING_GUIDE.md))

3. **Write tests using the unified framework**
   - **Complete Guide:** See [docs/TESTING_GUIDE.md](TESTING_GUIDE.md)
   - Create `your-module/__tests__/tests.js` with test suites
   - Copy test runner from existing phase (Phase 1, 2, or 3)
   - All tests must use the same format:
     ```javascript
     const testSuite = {
       name: 'Suite Name',
       tests: [
         {
           name: 'Test description',
           run () {  // or async run () for async tests
             assert.equal(actual, expected, 'Optional message')
           }
         }
       ]
     }
     export const allTests = [testSuite]
     ```
   - Tests must use `run ()` or `async run ()`, NOT `fn: ()` or other formats
   - Run tests locally and ensure all pass before phase completion

4. **Fix JavaScript Standard Style linting errors**
   
   After creating or modifying JavaScript files, run the linter:
   
   ```powershell
   # Check for linting errors
   npm run lint
   
   # Auto-fix most issues
   npm run lint:fix
   ```
   
   **When to lint:**
   - After creating new `.js` files
   - After modifying existing `.js` files
   - Before committing code
   - Before marking a phase as complete
   
   **Common auto-fixable issues:**
   - Missing semicolons or extra semicolons
   - Incorrect indentation (2 spaces)
   - Trailing whitespace
   - Missing spaces around operators
   - Quote style (single vs double)
   
   **Manual fixes required for:**
   - Unused variables (remove or prefix with `_`)
   - Missing `new` keyword for constructors
   - Undefined variables
   - Unreachable code
   
   **Tip:** Run `npm run lint:fix` first, then address any remaining errors manually.

5. **Update main README.md** only for:
   - Major feature additions visible to users
   - Changes to getting started instructions
   - New tool availability

### ❌ DO NOT:

1. **Create new documentation files** like:
   - ❌ `PHASE_X_COMPLETE.md`
   - ❌ `PHASE_X_NOTES.md`
   - ❌ `PHASE_X_SUMMARY.md`
   - All information goes in `IMPLEMENTATION_PHASE_X.md`

2. **Use different test formats** - All phases MUST use:
   - Same test structure (`run ()` method)
   - Same test runner layout (copy from Phase 1/2/3)
   - Same console output format
   - Import from `shared/test-framework.js`

3. **Duplicate information** across multiple files

4. **Update other phase documents** unless dependencies require it

---

## Completing a Phase

**Before marking a phase as complete, verify:**

- [ ] All code files created and working
- [ ] All tests passing (`npm run lint` shows 0 errors)
- [ ] All linting errors fixed (`npm run lint` shows 0 errors)
- [ ] Documentation updated in phase file
- [ ] Test runner card added to unified test runner

When all tasks in a phase are complete, update **ONLY** these files:

### 1. Update `IMPLEMENTATION_PHASE_X.md`

Change the header:
```markdown
**Status:** ✅ COMPLETE
**Completed:** January 28, 2026
**Duration:** 2 days (estimated 2-3 days)
```

Check all boxes:
```markdown
- [x] All tasks
- [x] All acceptance criteria
```

Add completion sections:
```markdown
## Test Results
**Total Tests:** X
**Passed:** X ✅
**Failed:** 0

**Test Suites:**
- Suite 1: X tests ✅
- Suite 2: X tests ✅

All tests passing. See test runner at `module/__tests__/test-runner.html`

## Performance Metrics
| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| ... | ... | ... | ✅ |

## Phase X Complete Summary
**Status:** ✅ COMPLETE
**Date:** [Date]
**Files Created:** [List with line counts]
**Total Lines of Code:** X lines
All acceptance criteria met. Ready to proceed to Phase Y.
```

### 2. Update `IMPLEMENTATION.md`

Update the phase status:
```markdown
### [Phase X: Name](IMPLEMENTATION_PHASE_X.md) ✅ COMPLETE
Pure mathematical transformation engine with no dependencies.
- **Duration:** 2 days (completed)
- **Dependencies:** None
- **Deliverables:** `file1.js`, `file2.js`
```

Update the pre-implementation checklist:
```markdown
- Complete Guide:** [docs/TESTING_GUIDE.md](TESTING_GUIDE.md)

**File:** `snapspot-utils/tests/test-runner.html`

Add your phase test card following the existing format (copy from Phase 1/2/3):

```html
<a href="../your-module/__tests__/test-runner.html" target="_blank" class="test-card">
  <div class="test-header">
    <div class="test-icon">🔧</div>
    <div class="test-info">
      <h2>Phase X</h2>
      <div class="test-phase">Module Name</div>
    </div>
  </div>
  <div class="test-description">
    Brief description of what this phase tests.
  </div>
  <div class="test-stats">
    <div class="stat">
      <div class="stat-value">27</div>
      <div class="stat-label">Tests</div>
    </div>
    <div class="stat">
      <div class="stat-value">2</div>
      <div class="stat-label">Suites</div>
    </div>
    <div class="stat">
      <div class="stat-value">✅</div>
      <div class="stat-label">Status</div>
    </div>
  </div>
</a>
```

Update the total test count in the "Quick Start" box.

**Test Format Requirements:**
- Tests MUST use `run ()` or `async run ()` methods
- Tests MUST use the unified test framework from `shared/test-framework.js`
- Test runner HTML MUST match the layout/style of Phase 1/2/3
- Console logging MUST follow the same format (see existing phases) 'Affine Transform': phase1AffineTests.tests || [],
    'Transform Validator': phase1ValidatorTests.tests || []
  },
  'Phase 2: Format Handlers': phase2Tests,
  'Phase X: Your Phase Name': phaseXTests  // <-- Add your phase here
}
```

### 4. Update `snapspot-utils/index.html`

Update the version line:
```html
<p class="version">Version 1.0 | Phase X Complete</p>
```

Update the Test Runner tile to reflect new test count:
```html
<a href="tests/test-runner.html" class="tile">
  <div class="tile-icon">🧪</div>
  <div class="tile-title">Test Runner</div>
  <div class="tile-description">
    Run all unit and integration tests. Includes Phase 1 (44 tests), Phase 2 (22 tests), Phase X (N tests).
  </div>
  <span class="tile-status status-active">Total Tests</span>
</a>
```

### 5. Update `snapspot-utils/README.md` (if needed)

Only update if the phase adds user-facing features:
```markdown
### Current Phase: Phase X Complete ✅ → Phase Y Next ⏳

- [x] **Phase X: Name ✅ COMPLETE**
  - [x] Feature 1
  - [x] Feature 2
- [ ] Phase Y: Name (next)
```

### 6. Git Commit

Create a single commit for the phase:
```bash
git add .
git commit -m "feat: Complete Phase X - [Name]

- Implemented [feature 1]
- Implemented [feature 2]
- All X tests passing
- [X] lines of code added

Closes phase X. Ready for Phase Y."
```

**Optional:** Tag the commit:
```bash
git tag v1.0-phase-x-complete
```

---

## Phase Transition Checklist

Use this checklist when transitioning from Phase X to Phase Y:

```markdown
- [ ] All tasks in Phase X completed ✅
- [ ] All tests passing ✅
- [ ] Phase X document updated with completion status
- [ ] IMPLEMENTATION.md updated
- [ ] Tests added to unified test runner (tests/test-runner.html)
- [ ] index.html updated with new phase and test count
- [ ] README.md updated (if needed)
- [ ] Git commit created
- [ ] No extra documentation files created
- [ ] Phase Y document exists and is ready
- [ ] Phase Y dependencies met
```

---

## Quick Reference: What to Update When

| Situation | Update These Files | Don't Update |
|-----------|-------------------|--------------|
| Starting Phase X | `IMPLEMENTATION_PHASE_X.md` (set status to IN PROGRESS) | Other phase docs |
| Working on Phase X | `IMPLEMENTATION_PHASE_X.md` (check off tasks) | IMPLEMENTATION.md |
| Completing Phase X | `IMPLEMENTATION_PHASE_X.md` + `IMPLEMENTATION.md` + `tests/test-runner.html` + `index.html` + `README.md` (if needed) | No new files |
| Need to take notes | `IMPLEMENTATION_PHASE_X.md` (Notes section) | No separate notes file |

---

## Example: Starting Phase 2

1. **User says:** "Let's start Phase 2"

2. **You respond:**
   ```
   Starting Phase 2: Format Handlers

   Primary document: docs/IMPLEMENTATION_PHASE_2.md

   I'll now:
   - Set status to IN PROGRESS
   - Set started date
   - Begin implementing tasks in order
   - Check off tasks as completed
   - Add notes as I work
   ```

3. **You update** `IMPLEMENTATION_PHASE_2.md` header:
   ```markdown
   **Status:** 🔄 IN PROGRESS
   **Started:** January 29, 2026
   ```

4. **You implement** following the task list in that document

5. **When complete,** you update:
   - `IMPLEMENTATION_PHASE_2.md` (completion sections)
   - `IMPLEMENTATION.md` (phase status)
   - `tests/test-runner.html` (add phase tests)
   - `index.html` (update version and test count)
   - `README.md` (if user-facing changes)

---

## Templates

### Phase Start Template

```markdown
Starting Phase X: [Name]

Primary document: docs/IMPLEMENTATION_PHASE_X.md
Dependencies: [List or "None"]

I'll now:
1. Update phase status to IN PROGRESS
2. Set started date to [today]
3. Begin implementing tasks in order
4. Track progress in the phase document

First task: [First task from the phase doc]
```

### Phase Complete Template

```markdown
Phase X: [Name] - COMPLETE ✅

Duration: X days (estimated Y-Z days)
Files created: X files, ~Y lines of code
Tests: All Z tests passing
Performance: All targets met

Updated documents:
- ✅ IMPLEMENTATION_PHASE_X.md (completion sections added)
- ✅ IMPLEMENTATION.md (phase status updated)
- ✅ tests/test-runner.html (phase tests added)
- ✅ index.html (version and test count updated)
- ✅ README.md ([if updated or "not needed"])

Ready to proceed to Phase Y.
```

---

## Anti-Patterns to Avoid

❌ **DON'T** create completion documents:
```
PHASE_1_COMPLETE.md ← NO!
phase1-notes.md ← NO!
COMPLETION_SUMMARY.md ← NO!
```

✅ **DO** use the phase document itself:
```
IMPLEMENTATION_PHASE_1.md ← YES!
(Contains tasks, notes, AND completion summary)
```

---

❌ **DON'T** scatter information:
```
Notes in PHASE_1_NOTES.md
Tasks in IMPLEMENTATION_PHASE_1.md
Results in PHASE_1_RESULTS.md
← NO! All in different files
```

✅ **DO** keep everything together:
```
IMPLEMENTATION_PHASE_1.md contains:
- Tasks (with checkboxes)
- Notes (in Notes section)
- Results (in completion section)
← YES! Single source of truth
```

---

## Summary

**Starting a phase:**
1. Point to `docs/IMPLEMENTATION_PHASE_X.md`
2. Update status to IN PROGRESS
3. Follow the task list

**During a phase:**
1. Check off tasks in the phase document
2. Add notes in the Notes section
3. Create the actual code files

**Completing a phase:**
1. Update phase document with completion sections
2. Update IMPLEMENTATION.md phase status
3. Add tests to unified test runner (tests/test-runner.html)
4. Update index.html with new phase and test count
5. Update README.md if needed
6. Git commit
7. Move to next phase

**Never:**
- Create separate completion documents
- Duplicate information
- Update documents not related to current phase

---

**Questions?** Check the phase document structure in `IMPLEMENTATION_PHASE_1.md` as the reference template.
