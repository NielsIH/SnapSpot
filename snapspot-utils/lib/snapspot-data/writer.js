/**
 * SnapSpot Export Format Writer
 *
 * Generates valid SnapSpot export JSON files from structured data.
 * Handles ID generation, image encoding, and hash calculation.
 *
 * @module snapspot-data/writer
 */

import { blobToBase64 } from '../snapspot-image/converter.js'
import { generateImageHash } from '../snapspot-image/hasher.js'

/**
 * Generate unique ID using crypto.randomUUID()
 *
 * @param {string} prefix - ID prefix (optional, for legacy compatibility)
 * @returns {string} UUID string
 *
 * @example
 * generateId() // '550e8400-e29b-41d4-a716-446655440000'
 * generateId('marker') // '550e8400-e29b-41d4-a716-446655440000' (prefix ignored, for API compat)
 */
export function generateId (prefix = '') {
  // Use modern crypto.randomUUID() if available
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback to timestamp-based ID for older browsers
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix || 'id'}_${timestamp}_${random}`
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
 * Build SnapSpot export object
 *
 * Creates a complete SnapSpot export file from map data, markers, and photos.
 *
 * Options:
 * - preserveMapId: Keep original map ID (default: false, generates new ID)
 * - mapNameSuffix: Append to map name (default: '')
 * - sourceApp: Source application name (default: 'SnapSpot')
 * - includePhotos: Include photos in export (default: true)
 *
 * @param {Object} map - Map metadata
 * @param {string} map.name - Map name
 * @param {number} map.width - Map width in pixels
 * @param {number} map.height - Map height in pixels
 * @param {Blob} mapImage - Map image Blob
 * @param {Array<Object>} markers - Array of marker objects
 * @param {Array<Object>} [photos=[]] - Array of photo objects (optional)
 * @param {Object} [options={}] - Export options
 * @returns {Promise<Object>} SnapSpot export object (ready for JSON.stringify)
 * @throws {Error} If required data is missing or invalid
 *
 * @example
 * const exportObj = await buildExport(
 *   { name: 'My Map', width: 1000, height: 800 },
 *   mapBlob,
 *   markers,
 *   photos,
 *   { mapNameSuffix: ' - Exported' }
 * )
 *
 * // Convert to JSON and download
 * const json = JSON.stringify(exportObj, null, 2)
 * const blob = new Blob([json], { type: 'application/json' })
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
    sourceApp = 'SnapSpot',
    includePhotos = true
  } = options

  // Generate or preserve map ID
  const mapId = preserveMapId && map.id ? map.id : generateId('map')

  // Convert map image to base64
  const mapImageData = await blobToBase64(mapImage)

  // Calculate map hash
  const mapHash = await generateImageHash(mapImage)

  // Get timestamps
  const now = getCurrentTimestamp()
  const created = map.created || map.createdDate || now
  const modified = now

  // Build export structure (matching PWA v1.1 format)
  const exportData = {
    version: '1.1',
    type: 'SnapSpotDataExport',
    sourceApp,
    timestamp: now,

    map: {
      id: mapId,
      name: map.name + mapNameSuffix,
      imageData: mapImageData,
      width: map.width,
      height: map.height,
      imageHash: mapHash,
      createdDate: created,
      lastModified: modified
    },

    markers: markers.map(marker => {
      // Preserve existing marker data, ensure required fields
      return {
        id: marker.id || generateId('marker'),
        x: marker.x,
        y: marker.y,
        description: marker.description || marker.label || '',
        photoIds: marker.photoIds || [],
        createdDate: marker.createdDate || marker.created || now,
        // Preserve any additional fields
        ...(marker.label && !marker.description ? {} : { label: marker.label })
      }
    }),

    photos: includePhotos ? photos.map(photo => {
      return {
        id: photo.id || generateId('photo'),
        markerId: photo.markerId,
        imageData: photo.imageData,
        fileName: photo.fileName || 'photo.jpg',
        fileType: photo.fileType || 'image/jpeg',
        fileSize: photo.fileSize || 0,
        createdDate: photo.createdDate || photo.created || now,
        // Preserve any additional fields
        ...(photo.caption ? { caption: photo.caption } : {})
      }
    }) : []
  }

  return exportData
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
 * @returns {Promise<Object>} Updated export object
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
  let mapImage
  if (originalExport.mapImage instanceof Blob) {
    mapImage = originalExport.mapImage
  } else {
    throw new Error('Original export missing map image Blob. Parse the export first.')
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
    type: 'SnapSpotDataExport',
    sourceApp: 'SnapSpot Test',
    timestamp: now,

    map: {
      id: generateId('map'),
      name: 'Test Map',
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
      width: 100,
      height: 100,
      imageHash: 'test-hash',
      createdDate: now,
      lastModified: now,
      ...(overrides.map || {})
    },

    markers: overrides.markers || [],
    photos: overrides.photos || [],

    ...overrides
  }
}
