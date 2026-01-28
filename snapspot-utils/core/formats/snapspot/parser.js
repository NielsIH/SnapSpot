/**
 * SnapSpot Export Format Parser
 *
 * Parses SnapSpot export JSON files and extracts structured data.
 * Handles data URI decoding and image extraction.
 *
 * @module snapspot/parser
 */

import { validateExportFile } from './validator.js'

/**
 * Convert data URI to Blob
 *
 * Parses data URI format and creates a Blob with the correct MIME type.
 *
 * @param {string} dataUri - Data URI string (e.g., 'data:image/jpeg;base64,...')
 * @returns {Blob} Blob object containing the decoded data
 * @throws {Error} If data URI format is invalid
 *
 * @example
 * const blob = base64ToBlob('data:image/jpeg;base64,/9j/4AAQ...')
 * console.log(blob.type) // 'image/jpeg'
 */
export function base64ToBlob (dataUri) {
  // Validate data URI format
  if (!dataUri || typeof dataUri !== 'string') {
    throw new Error('Data URI must be a non-empty string')
  }

  if (!dataUri.startsWith('data:')) {
    throw new Error('Invalid data URI: must start with "data:"')
  }

  // Parse data URI: data:[<mime type>][;base64],<data>
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/)

  if (!matches) {
    throw new Error('Invalid data URI format. Expected: data:<mime>;base64,<data>')
  }

  const mimeType = matches[1]
  const base64Data = matches[2]

  try {
    // Decode base64 to binary string
    const binaryString = atob(base64Data)

    // Convert binary string to byte array
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create Blob with correct MIME type
    return new Blob([bytes], { type: mimeType })
  } catch (error) {
    throw new Error(`Failed to decode base64 data: ${error.message}`)
  }
}

/**
 * Extract map image from map object
 *
 * Converts the base64-encoded image data to a Blob and extracts metadata.
 *
 * @param {Object} mapObject - Map object from export
 * @returns {Object} Image data object
 * @returns {Blob} return.blob - Image Blob
 * @returns {number} return.width - Image width
 * @returns {number} return.height - Image height
 * @returns {string} return.hash - Image hash from export
 * @returns {string} return.mimeType - Image MIME type
 *
 * @example
 * const imageData = extractMapImage(exportData.map)
 * const url = URL.createObjectURL(imageData.blob)
 */
export function extractMapImage (mapObject) {
  if (!mapObject || typeof mapObject !== 'object') {
    throw new Error('Map object is required')
  }

  if (!mapObject.imageData) {
    throw new Error('Map object missing imageData field')
  }

  // Parse MIME type from data URI
  const mimeMatch = mapObject.imageData.match(/^data:([^;]+);/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'

  const blob = base64ToBlob(mapObject.imageData)

  return {
    blob,
    width: mapObject.width,
    height: mapObject.height,
    hash: mapObject.hash,
    mimeType
  }
}

/**
 * Validate marker coordinates against map dimensions
 *
 * Checks if all markers are within the map bounds.
 *
 * @param {Array<Object>} markers - Array of marker objects
 * @param {number} mapWidth - Map width in pixels
 * @param {number} mapHeight - Map height in pixels
 * @returns {Array<Object>} Array of out-of-bounds markers with details
 *
 * @example
 * const outOfBounds = validateMarkerCoordinates(markers, 1000, 800)
 * if (outOfBounds.length > 0) {
 *   console.warn('Found out-of-bounds markers:', outOfBounds)
 * }
 */
export function validateMarkerCoordinates (markers, mapWidth, mapHeight) {
  const outOfBounds = []

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const issues = []

    if (marker.x < 0 || marker.x > mapWidth) {
      issues.push(`x=${marker.x} (should be 0-${mapWidth})`)
    }

    if (marker.y < 0 || marker.y > mapHeight) {
      issues.push(`y=${marker.y} (should be 0-${mapHeight})`)
    }

    if (issues.length > 0) {
      outOfBounds.push({
        index: i,
        marker,
        issues
      })
    }
  }

  return outOfBounds
}

/**
 * Clamp marker coordinates to map bounds
 *
 * Ensures marker coordinates are within valid range by clamping to edges.
 *
 * @param {Object} marker - Marker object with x, y coordinates
 * @param {number} mapWidth - Map width in pixels
 * @param {number} mapHeight - Map height in pixels
 * @returns {Object} New marker object with clamped coordinates
 *
 * @example
 * const clamped = clampMarkerToBounds(marker, 1000, 800)
 * // If marker.x was -10, clamped.x will be 0
 * // If marker.y was 850, clamped.y will be 800
 */
export function clampMarkerToBounds (marker, mapWidth, mapHeight) {
  return {
    ...marker,
    x: Math.max(0, Math.min(marker.x, mapWidth)),
    y: Math.max(0, Math.min(marker.y, mapHeight))
  }
}

/**
 * Parse SnapSpot export JSON string
 *
 * Parses and validates a SnapSpot export file, extracting all data
 * into a structured format ready for use.
 *
 * Performs:
 * - JSON parsing with error handling
 * - Schema validation
 * - Coordinate validation
 * - Data extraction and structuring
 *
 * @param {string} jsonString - SnapSpot export JSON string
 * @returns {Promise<Object>} Parsed export data
 * @returns {Object} return.map - Map metadata (id, name, width, height, hash)
 * @returns {Blob} return.mapImage - Map image Blob
 * @returns {Array<Object>} return.markers - Array of marker objects
 * @returns {Array<Object>} return.photos - Array of photo objects (if present)
 * @returns {Object} return.metadata - Export metadata (version, sourceApp, exportDate)
 * @returns {Array<Object>} return.warnings - Non-critical issues found
 * @throws {Error} If JSON is invalid or validation fails
 *
 * @example
 * const parsed = await parseExport(jsonString)
 * console.log(`Loaded map: ${parsed.map.name}`)
 * console.log(`Found ${parsed.markers.length} markers`)
 *
 * // Use the map image
 * const imageUrl = URL.createObjectURL(parsed.mapImage)
 * imageElement.src = imageUrl
 */
export async function parseExport (jsonString) {
  // Parse JSON
  let exportData
  try {
    exportData = JSON.parse(jsonString)
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`)
  }

  // Validate export structure
  const validation = validateExportFile(exportData)
  if (!validation.isValid) {
    const errorList = validation.errors.join('\n  - ')
    throw new Error(`Export validation failed:\n  - ${errorList}`)
  }

  // Extract map image
  const mapImageData = extractMapImage(exportData.map)

  // Validate marker coordinates
  const outOfBoundsMarkers = validateMarkerCoordinates(
    exportData.markers,
    exportData.map.width,
    exportData.map.height
  )

  const warnings = []
  if (outOfBoundsMarkers.length > 0) {
    warnings.push({
      type: 'out-of-bounds-markers',
      count: outOfBoundsMarkers.length,
      markers: outOfBoundsMarkers,
      message: `${outOfBoundsMarkers.length} marker(s) have coordinates outside map bounds`
    })
  }

  // Structure the parsed data
  return {
    // Map metadata (without imageData to save memory)
    map: {
      id: exportData.map.id,
      name: exportData.map.name,
      width: exportData.map.width,
      height: exportData.map.height,
      hash: exportData.map.hash,
      created: exportData.map.created,
      modified: exportData.map.modified
    },

    // Map image as Blob
    mapImage: mapImageData.blob,

    // Markers array
    markers: exportData.markers,

    // Photos array (optional)
    photos: exportData.photos || [],

    // Export metadata
    metadata: {
      version: exportData.version,
      type: exportData.type,
      sourceApp: exportData.sourceApp,
      exportDate: exportData.exportDate
    },

    // Warnings (non-critical issues)
    warnings
  }
}

/**
 * Quick parse to extract basic metadata without full validation
 *
 * Useful for previewing export files without processing full data.
 *
 * @param {string} jsonString - SnapSpot export JSON string
 * @returns {Object} Basic metadata
 * @returns {string} return.version - Export version
 * @returns {string} return.mapName - Map name
 * @returns {number} return.markerCount - Number of markers
 * @returns {number} return.photoCount - Number of photos
 * @throws {Error} If JSON is invalid
 *
 * @example
 * const info = parseExportMetadata(jsonString)
 * console.log(`${info.mapName}: ${info.markerCount} markers`)
 */
export function parseExportMetadata (jsonString) {
  let exportData
  try {
    exportData = JSON.parse(jsonString)
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`)
  }

  return {
    version: exportData.version || 'unknown',
    mapName: exportData.map?.name || 'Unknown Map',
    markerCount: exportData.markers?.length || 0,
    photoCount: exportData.photos?.length || 0,
    exportDate: exportData.exportDate || 'unknown',
    sourceApp: exportData.sourceApp || 'unknown'
  }
}
