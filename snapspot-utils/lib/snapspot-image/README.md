# snapspot-image

Image processing utilities for SnapSpot.

---

## Modules

### converter.js
Blob ↔ Base64 data URI conversion.

**Functions:**
- `blobToBase64(blob)` - Convert Blob to base64 data URI
- `base64ToBlob(dataUri, mimeType)` - Convert base64 data URI to Blob

### hasher.js
Image hashing for integrity verification.

**Functions:**
- `generateImageHash(blob)` - Generate SHA-256 hash of image data

---

## API Reference

### `blobToBase64(blob)`

Convert a Blob to a base64-encoded data URI.

**Parameters:**
- `blob` (Blob) - The image blob to convert

**Returns:**
- `Promise<string>` - Base64 data URI (e.g., `data:image/png;base64,iVBORw0KG...`)

**Throws:**
- Error if blob is not a valid Blob object

**Example:**
```javascript
import { blobToBase64 } from './lib/snapspot-image/converter.js'

const blob = new Blob([imageData], { type: 'image/png' })
const dataUri = await blobToBase64(blob)
// => "data:image/png;base64,iVBORw0KG..."
```

---

### `base64ToBlob(dataUri, mimeType)`

Convert a base64 data URI to a Blob.

**Parameters:**
- `dataUri` (string) - Base64 data URI
- `mimeType` (string, optional) - MIME type override (auto-detected if not provided)

**Returns:**
- `Blob` - Blob object

**Throws:**
- Error if dataUri is invalid or empty

**Example:**
```javascript
import { base64ToBlob } from './lib/snapspot-image/converter.js'

const dataUri = "data:image/png;base64,iVBORw0KG..."
const blob = base64ToBlob(dataUri)
// => Blob { size: 1234, type: "image/png" }
```

---

### `generateImageHash(blob)`

Generate a SHA-256 hash of image data for integrity verification.

**Parameters:**
- `blob` (Blob) - The image blob to hash

**Returns:**
- `Promise<string>` - Lowercase hex string (64 characters)

**Throws:**
- Error if blob is not a valid Blob object

**Example:**
```javascript
import { generateImageHash } from './lib/snapspot-image/hasher.js'

const blob = new Blob([imageData], { type: 'image/png' })
const hash = await generateImageHash(blob)
// => "a1b2c3d4e5f6..."  (64 chars)
```

---

## Usage Patterns

### Export Workflow
```javascript
import { blobToBase64 } from './lib/snapspot-image/converter.js'
import { generateImageHash } from './lib/snapspot-image/hasher.js'

// Convert map image to base64 for export
const mapImageBase64 = await blobToBase64(mapBlob)

// Generate hash for integrity check
const mapHash = await generateImageHash(mapBlob)

const exportData = {
  map: {
    image: mapImageBase64,
    imageHash: mapHash
  }
}
```

### Import Workflow
```javascript
import { base64ToBlob } from './lib/snapspot-image/converter.js'
import { generateImageHash } from './lib/snapspot-image/hasher.js'

// Convert base64 back to Blob
const mapBlob = base64ToBlob(importData.map.image)

// Verify integrity
const calculatedHash = await generateImageHash(mapBlob)
if (calculatedHash !== importData.map.imageHash) {
  console.warn('Hash mismatch - file may be corrupted')
}
```

---

## Error Handling

All functions throw descriptive errors:

```javascript
try {
  const blob = base64ToBlob(invalidData)
} catch (error) {
  console.error('Conversion failed:', error.message)
  // => "Invalid data URI format"
}
```

---

## Browser Compatibility

- Requires `FileReader` API (all modern browsers)
- Requires `crypto.subtle.digest` (HTTPS or localhost only)
- Requires `Uint8Array` support
