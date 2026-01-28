/**
 * SnapSpot Export Format Writer
 *
 * Generates valid SnapSpot export JSON files from structured data.
 * Handles ID generation, image encoding, and hash calculation.
 *
 * @module snapspot/writer
 */

/**
 * Generate unique ID with prefix
 *
 * Creates IDs in format: {prefix}_{timestamp}_{random}
 *
 * @param {string} prefix - ID prefix (e.g., 'map', 'marker', 'photo')
 * @returns {string} Unique ID string
 *
 * @example
 * generateId('map') // 'map_1706403821234_a7b3f9'
 * generateId('marker') // 'marker_1706403821235_c9d2e4'
 */
export function generateId (prefix = 'id') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Convert Blob to base64 data URI
 *
 * Reads a Blob and converts it to a base64-encoded data URI string.
 *
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Data URI string (e.g., 'data:image/jpeg;base64,...')
 * @throws {Error} If Blob reading fails
 *
 * @example
 * const dataUri = await blobToBase64(imageBlob)
 * // 'data:image/jpeg;base64,/9j/4AAQ...'
 */
export function blobToBase64 (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error('Failed to read Blob as data URL'))
    }

    reader.readAsDataURL(blob)
  })
}

/**
 * Calculate SHA-256 hash of image data
 *
 * Generates a hex string hash for image verification.
 *
 * @param {Blob} blob - Image Blob to hash
 * @returns {Promise<string>} Hex string hash (64 characters)
 * @throws {Error} If hashing fails
 *
 * @example
 * const hash = await generateMapHash(imageBlob)
 * // 'a7b3f9c2d4e5f6...' (64 chars)
 */
export async function generateMapHash (blob) {
  try {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer()

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
  } catch (error) {
    throw new Error(`Failed to generate map hash: ${error.message}`)
  }
}

/**
 * Get current ISO 8601 timestamp
 *
 * @private
 * @returns {string} ISO timestamp string
 */
function getCurrentTimestamp () {
  return new Date().toISOString()
}

/**
 * Build SnapSpot export JSON
 *
 * Creates a complete SnapSpot export file from map data, markers, and photos.
 *
 * Options:
 * - preserveMapId: Keep original map ID (default: false, generates new ID)
 * - mapNameSuffix: Append to map name (default: '')
 * - sourceApp: Source application name (default: 'SnapSpot Map Migrator v1.0')
 *
 * @param {Object} map - Map metadata
 * @param {string} map.name - Map name
 * @param {number} map.width - Map width in pixels
 * @param {number} map.height - Map height in pixels
 * @param {Blob} mapImage - Map image Blob
 * @param {Array<Object>} markers - Array of marker objects
 * @param {Array<Object>} [photos=[]] - Array of photo objects (optional)
 * @param {Object} [options={}] - Export options
 * @returns {Promise<string>} SnapSpot export JSON string
 * @throws {Error} If required data is missing or invalid
 *
 * @example
 * const exportJson = await buildExport(
 *   { name: 'My Map', width: 1000, height: 800 },
 *   mapBlob,
 *   markers,
 *   photos,
 *   { mapNameSuffix: ' - Migrated' }
 * )
 *
 * // Download the export
 * const blob = new Blob([exportJson], { type: 'application/json' })
 * saveAs(blob, 'map-export.json')
 */
export async function buildExport (map, mapImage, markers, photos = [], options = {}) {
  // Validate inputs
  if (!map || typeof map !== 'object') {
    throw new Error('Map metadata object is required')
  }

  if (!map.name || typeof map.name !== 'string') {
    throw new Error('Map name is required')
  }

  if (typeof map.width !== 'number' || map.width <= 0) {
    throw new Error('Map width must be a positive number')
  }

  if (typeof map.height !== 'number' || map.height <= 0) {
    throw new Error('Map height must be a positive number')
  }

  if (!(mapImage instanceof Blob)) {
    throw new Error('Map image must be a Blob')
  }

  if (!Array.isArray(markers)) {
    throw new Error('Markers must be an array')
  }

  if (!Array.isArray(photos)) {
    throw new Error('Photos must be an array')
  }

  // Extract options
  const {
    preserveMapId = false,
    mapNameSuffix = '',
    sourceApp = 'SnapSpot Map Migrator v1.0'
  } = options

  // Generate or preserve map ID
  const mapId = preserveMapId && map.id ? map.id : generateId('map')

  // Convert map image to base64
  const mapImageData = await blobToBase64(mapImage)

  // Calculate map hash
  const mapHash = await generateMapHash(mapImage)

  // Get timestamps
  const now = getCurrentTimestamp()
  const created = map.created || now
  const modified = now

  // Build export structure
  const exportData = {
    version: '1.1',
    type: 'snapspot-export',
    sourceApp,
    exportDate: now,

    map: {
      id: mapId,
      name: map.name + mapNameSuffix,
      imageData: mapImageData,
      width: map.width,
      height: map.height,
      hash: mapHash,
      created,
      modified
    },

    markers: markers.map(marker => {
      // Preserve existing marker data, ensure required fields
      return {
        id: marker.id || generateId('marker'),
        x: marker.x,
        y: marker.y,
        label: marker.label || '',
        created: marker.created || now,
        // Preserve any additional fields
        ...marker
      }
    }),

    photos: photos.map(photo => {
      return {
        id: photo.id || generateId('photo'),
        markerId: photo.markerId,
        imageData: photo.imageData,
        caption: photo.caption || '',
        created: photo.created || now,
        // Preserve any additional fields
        ...photo
      }
    })
  }

  // Convert to formatted JSON string
  return JSON.stringify(exportData, null, 2)
}

/**
 * Update markers in existing export
 *
 * Replaces markers in an export while preserving map and photos.
 * Useful for migration workflows.
 *
 * @param {Object} originalExport - Original parsed export data
 * @param {Array<Object>} newMarkers - New markers array
 * @param {Object} [options={}] - Export options
 * @returns {Promise<string>} Updated export JSON string
 *
 * @example
 * // Transform markers and update export
 * const transformedMarkers = markers.map(m => ({
 *   ...m,
 *   x: transformedX,
 *   y: transformedY
 * }))
 *
 * const updatedExport = await updateMarkersInExport(
 *   originalExport,
 *   transformedMarkers,
 *   { mapNameSuffix: ' - Migrated' }
 * )
 */
export async function updateMarkersInExport (originalExport, newMarkers, options = {}) {
  if (!originalExport || !originalExport.map) {
    throw new Error('Original export data is required')
  }

  // Extract map image from original export
  // Note: This assumes originalExport has the Blob, not the base64
  // If it has base64, we'd need to convert it
  let mapImage
  if (originalExport.mapImage instanceof Blob) {
    mapImage = originalExport.mapImage
  } else if (originalExport.map.imageData) {
    // Convert base64 back to Blob (would need to import from parser)
    throw new Error('Cannot update export: map image is not a Blob. Parse the export first.')
  } else {
    throw new Error('Original export missing map image')
  }

  return buildExport(
    originalExport.map,
    mapImage,
    newMarkers,
    originalExport.photos || [],
    {
      preserveMapId: true,
      ...options
    }
  )
}

/**
 * Create minimal export for testing
 *
 * Generates a valid export with minimal required data.
 * Useful for testing and examples.
 *
 * @param {Object} [overrides={}] - Override default values
 * @returns {Object} Export data object (not JSON string)
 *
 * @example
 * const minimalExport = createMinimalExport({
 *   map: { name: 'Test Map' }
 * })
 */
export function createMinimalExport (overrides = {}) {
  const now = getCurrentTimestamp()

  return {
    version: '1.1',
    type: 'snapspot-export',
    sourceApp: 'SnapSpot Test',
    exportDate: now,

    map: {
      id: generateId('map'),
      name: 'Test Map',
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
      width: 100,
      height: 100,
      hash: generateId('hash'),
      created: now,
      modified: now,
      ...(overrides.map || {})
    },

    markers: overrides.markers || [],
    photos: overrides.photos || [],

    ...overrides
  }
}
