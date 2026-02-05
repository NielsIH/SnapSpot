# SnapSpot Shared Libraries

**Version:** 1.0  
**Created:** January 30, 2026

This directory contains shared libraries used by both the SnapSpot PWA and snapspot-utils.

---

## Overview

The shared libraries provide reusable, well-tested functionality for working with SnapSpot data:

- **snapspot-data/**: Pure data operations (parse, write, validate, merge, split)
- **snapspot-image/**: Image utilities (conversion, hashing)
- **snapspot-storage/**: Storage integration (PWA-specific)

---

## Library Structure

```
lib/
├── snapspot-data/          ← Pure data operations
│   ├── parser.js           ← Parse SnapSpot export files
│   ├── writer.js           ← Generate SnapSpot export files
│   ├── validator.js        ← Schema validation
│   ├── merger.js           ← Merge multiple exports
│   ├── splitter.js         ← Split exports by criteria
│   └── README.md
├── snapspot-image/         ← Image utilities
│   ├── converter.js        ← Blob ↔ Base64 conversion
│   ├── hasher.js           ← SHA-256 hashing
│   └── README.md
└── snapspot-storage/       ← Storage integration (PWA-only)
    └── exporter-importer.js
```

---

## Design Principles

### 1. Pure Functions First
- No DOM manipulation in library code
- No direct storage access (except snapspot-storage)
- All functions testable in isolation

### 2. Clear Separation of Concerns
- **snapspot-data**: Works with plain JavaScript objects
- **snapspot-image**: Works with Blobs and data URIs
- **snapspot-storage**: Integrates with browser storage APIs

### 3. No Circular Dependencies
- Libraries are independent modules
- Import flow: storage → data → image

### 4. Comprehensive Error Handling
- Descriptive error messages
- Input validation
- No silent failures

---

## Usage

### In SnapSpot PWA

```javascript
// Import from shared libraries
import { parseExport, buildExport } from '../lib/snapspot-data/parser.js'
import { blobToBase64 } from '../lib/snapspot-image/converter.js'

// Use in your code
const exportData = await parseExport(jsonString)
const base64 = await blobToBase64(imageBlob)
```

### In snapspot-utils

```javascript
// Import from shared libraries
import { parseExport } from '../../lib/snapspot-data/parser.js'
import { generateImageHash } from '../../lib/snapspot-image/hasher.js'

// Use in utility tools
const data = await parseExport(fileContent)
```

---

## Testing

- **PWA**: Manual testing through app workflows
- **Utils**: Automated testing with test framework at `snapspot-utils/__tests__/`

---

## Documentation

See subdirectory READMEs for detailed API documentation:
- [snapspot-data/README.md](snapspot-data/README.md)
- [snapspot-image/README.md](snapspot-image/README.md)
