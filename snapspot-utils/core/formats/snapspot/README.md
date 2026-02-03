# SnapSpot Format Handlers

**DEPRECATED:** This directory originally contained Phase 2 format handlers.

**These modules have been moved to the shared library:**

## Use the Shared Library Instead

All format handler modules are now in:
```
snapspot-utils/lib/snapspot-data/
```

These are direct copies from the SnapSpot PWA (`js/lib/snapspot-data/`) and are shared between the PWA and utilities suite.

### Import from lib/snapspot-data

```javascript
import { validateExportFile } from '../../../lib/snapspot-data/validator.js'
import { parseExport } from '../../../lib/snapspot-data/parser.js'
import { buildExport } from '../../../lib/snapspot-data/writer.js'
```

### Library Documentation

See the shared library README for complete documentation:
- [lib/snapspot-data/README.md](../../../lib/snapspot-data/README.md)

### Tests

Tests for these modules are located in:
- [__tests__/integration.test.js](./__tests__/integration.test.js)
- [__tests__/test-runner.html](./__tests__/test-runner.html)

Run tests: Open `__tests__/test-runner.html` in a browser.

---

## Why This Move?

The format handlers were originally developed in Phase 2 as utilities-specific code. During Phase 3 library refactoring, they were moved to `lib/snapspot-data/` to:

1. **Share code between PWA and utilities** - Single source of truth
2. **Enable future tools** - Format converter, merger tool, etc.
3. **Maintain consistency** - Same validation/parsing logic everywhere

---

## Migration Guide

If you have code importing from this directory:

**Old (Phase 2):**
```javascript
import { parseExport } from './core/formats/snapspot/parser.js'
```

**New (Phase 3+):**
```javascript
import { parseExport } from './lib/snapspot-data/parser.js'
```

All tests have been updated to use the new shared library location.
