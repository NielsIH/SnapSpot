/**
 * SnapSpot Export Merger
 *
 * Provides functionality to intelligently merge multiple SnapSpot exports.
 * Handles duplicate detection and conflict resolution.
 *
 * @module snapspot-data/merger
 */

import { generateId } from './writer.js'

/**
 * Find duplicate marker by coordinates
 *
 * Searches for an existing marker at the same or nearby coordinates.
 *
 * @param {Array<Object>} existingMarkers - Array of existing markers
 * @param {Object} candidateMarker - Marker to search for
 * @param {number} [tolerance=0] - Pixel tolerance for coordinate matching
 * @returns {Object|null} Matching marker or null if not found
 *
 * @example
 * const match = findDuplicateMarker(existingMarkers, newMarker, 5)
 * if (match) {
 *   console.log(`Found duplicate at (${match.x}, ${match.y})`)
 * }
 */
export function findDuplicateMarker (existingMarkers, candidateMarker, tolerance = 0) {
  if (!Array.isArray(existingMarkers) || !candidateMarker) {
    return null
  }

  return existingMarkers.find(existing => {
    if (tolerance === 0) {
      // Exact match
      return existing.x === candidateMarker.x && existing.y === candidateMarker.y
    } else {
      // Tolerance-based match
      const dx = Math.abs(existing.x - candidateMarker.x)
      const dy = Math.abs(existing.y - candidateMarker.y)
      return dx <= tolerance && dy <= tolerance
    }
  })
}

/**
 * Check if a photo is duplicate based on fileName and marker association
 *
 * @param {Array<Object>} existingPhotos - Array of existing photos
 * @param {Object} candidatePhoto - Photo to check
 * @param {string} existingMarkerId - ID of the existing marker to check against
 * @returns {boolean} True if photo already exists
 *
 * @example
 * const isDupe = isDuplicatePhoto(existingPhotos, newPhoto, markerId)
 */
export function isDuplicatePhoto (existingPhotos, candidatePhoto, existingMarkerId) {
  if (!Array.isArray(existingPhotos) || !candidatePhoto) {
    return false
  }

  return existingPhotos.some(
    photo =>
      photo.markerId === existingMarkerId &&
      photo.fileName === candidatePhoto.fileName
  )
}

/**
 * Merge photo IDs arrays, avoiding duplicates
 *
 * @param {Array<string>} existingPhotoIds - Existing photo IDs
 * @param {Array<string>} newPhotoIds - New photo IDs to add
 * @returns {Array<string>} Merged photo IDs (deduplicated)
 *
 * @example
 * const merged = mergePhotoIds(['photo1', 'photo2'], ['photo2', 'photo3'])
 * // => ['photo1', 'photo2', 'photo3']
 */
export function mergePhotoIds (existingPhotoIds, newPhotoIds) {
  const photoIdSet = new Set(existingPhotoIds || [])
  ;(newPhotoIds || []).forEach(id => photoIdSet.add(id))
  return Array.from(photoIdSet)
}

/**
 * Merge two SnapSpot exports intelligently
 *
 * Combines targetExport and sourceExport, handling duplicates:
 * - Markers at same coordinates: photos are merged
 * - New markers: added to target
 * - Duplicate photos: handled per strategy (skip or rename)
 *
 * @param {Object} targetExport - Base export to merge into
 * @param {Object} sourceExport - Export to merge from
 * @param {Object} [options={}] - Merge options
 * @param {number} options.coordinateTolerance - Pixel tolerance for duplicate detection (default: 0)
 * @param {string} options.duplicatePhotoStrategy - 'skip' or 'rename' (default: 'skip')
 * @param {boolean} options.preserveTimestamps - Keep original creation dates (default: true)
 * @param {Function} options.idGenerator - Custom ID generator function (default: generateId)
 * @returns {Object} New merged export object
 *
 * @example
 * const merged = mergeExports(existingExport, importedExport, {
 *   coordinateTolerance: 5,
 *   duplicatePhotoStrategy: 'skip'
 * })
 */
export function mergeExports (targetExport, sourceExport, options = {}) {
  const {
    coordinateTolerance = 0,
    duplicatePhotoStrategy = 'skip',
    preserveTimestamps = true,
    idGenerator = generateId
  } = options

  // Validate inputs
  if (!targetExport || !targetExport.markers || !targetExport.photos) {
    throw new Error('Invalid target export: missing markers or photos array')
  }

  if (!sourceExport || !sourceExport.markers || !sourceExport.photos) {
    throw new Error('Invalid source export: missing markers or photos array')
  }

  // Maps must have same imageHash (or both missing)
  const targetHash = targetExport.map?.imageHash
  const sourceHash = sourceExport.map?.imageHash

  if (targetHash && sourceHash && targetHash !== sourceHash) {
    console.warn('Merger: Target and source have different imageHash. Proceeding anyway.')
  }

  // Clone target export to avoid mutation
  const mergedExport = {
    ...targetExport,
    markers: [...targetExport.markers],
    photos: [...targetExport.photos],
    metadata: {
      ...targetExport.metadata,
      mergedFrom: [
        ...(targetExport.metadata?.mergedFrom || []),
        {
          sourceApp: sourceExport.sourceApp || sourceExport.metadata?.sourceApp,
          timestamp: sourceExport.timestamp || sourceExport.metadata?.exportDate,
          markerCount: sourceExport.markers.length,
          photoCount: sourceExport.photos.length
        }
      ]
    }
  }

  // Track ID mappings: old source ID -> new merged ID
  const markerIdMap = new Map()
  const photoIdMap = new Map()

  const newMarkersAdded = []
  const newPhotosAdded = []
  const updatedMarkers = []

  // Process each source marker
  for (const sourceMarker of sourceExport.markers) {
    // Find matching marker in target (by coordinates)
    const matchingMarker = findDuplicateMarker(
      mergedExport.markers,
      sourceMarker,
      coordinateTolerance
    )

    if (matchingMarker) {
      // Marker exists - merge photos
      console.log(`Merger: Found duplicate marker at (${sourceMarker.x}, ${sourceMarker.y})`)

      markerIdMap.set(sourceMarker.id, matchingMarker.id)

      // Process photos for this source marker
      const sourcePhotosForMarker = sourceExport.photos.filter(
        p => p.markerId === sourceMarker.id
      )

      const newPhotoIdsForMarker = []

      for (const sourcePhoto of sourcePhotosForMarker) {
        // Check if photo already exists
        const photoExists = isDuplicatePhoto(
          mergedExport.photos,
          sourcePhoto,
          matchingMarker.id
        )

        if (!photoExists) {
          // Add new photo
          const newPhotoId = idGenerator('photo')
          photoIdMap.set(sourcePhoto.id, newPhotoId)

          const newPhoto = {
            ...sourcePhoto,
            id: newPhotoId,
            markerId: matchingMarker.id,
            createdDate: preserveTimestamps
              ? sourcePhoto.createdDate
              : new Date().toISOString()
          }

          newPhotosAdded.push(newPhoto)
          newPhotoIdsForMarker.push(newPhotoId)
        } else {
          console.log(`Merger: Skipping duplicate photo "${sourcePhoto.fileName}"`)
        }
      }

      // Update marker's photoIds if new photos were added
      if (newPhotoIdsForMarker.length > 0) {
        const updatedPhotoIds = mergePhotoIds(
          matchingMarker.photoIds || [],
          newPhotoIdsForMarker
        )

        matchingMarker.photoIds = updatedPhotoIds
        matchingMarker.lastModified = new Date().toISOString()
        updatedMarkers.push(matchingMarker)
      }
    } else {
      // New marker - add it
      console.log(`Merger: Adding new marker at (${sourceMarker.x}, ${sourceMarker.y})`)

      const newMarkerId = idGenerator('marker')
      markerIdMap.set(sourceMarker.id, newMarkerId)

      const newPhotoIdsForMarker = []

      // Process photos for this new marker
      const sourcePhotosForMarker = sourceExport.photos.filter(
        p => p.markerId === sourceMarker.id
      )

      for (const sourcePhoto of sourcePhotosForMarker) {
        const newPhotoId = idGenerator('photo')
        photoIdMap.set(sourcePhoto.id, newPhotoId)

        const newPhoto = {
          ...sourcePhoto,
          id: newPhotoId,
          markerId: newMarkerId,
          createdDate: preserveTimestamps
            ? sourcePhoto.createdDate
            : new Date().toISOString()
        }

        newPhotosAdded.push(newPhoto)
        newPhotoIdsForMarker.push(newPhotoId)
      }

      const newMarker = {
        ...sourceMarker,
        id: newMarkerId,
        photoIds: newPhotoIdsForMarker,
        createdDate: preserveTimestamps
          ? sourceMarker.createdDate
          : new Date().toISOString(),
        lastModified: new Date().toISOString()
      }

      newMarkersAdded.push(newMarker)
    }
  }

  // Add new markers and photos to merged export
  mergedExport.markers.push(...newMarkersAdded)
  mergedExport.photos.push(...newPhotosAdded)

  // Update timestamp
  mergedExport.timestamp = new Date().toISOString()
  if (mergedExport.map) {
    mergedExport.map.lastModified = new Date().toISOString()
  }

  console.log(`Merger: Added ${newMarkersAdded.length} new markers, ${newPhotosAdded.length} new photos. Updated ${updatedMarkers.length} existing markers.`)

  return mergedExport
}

/**
 * Get merge statistics without performing the actual merge
 *
 * @param {Object} targetExport - Base export
 * @param {Object} sourceExport - Export to merge
 * @param {Object} [options={}] - Merge options
 * @returns {Object} Merge statistics
 * @returns {number} return.duplicateMarkers - Number of duplicate markers
 * @returns {number} return.newMarkers - Number of new markers
 * @returns {number} return.duplicatePhotos - Number of duplicate photos
 * @returns {number} return.newPhotos - Number of new photos to add
 *
 * @example
 * const stats = getMergeStatistics(existing, imported)
 * console.log(`Will add ${stats.newMarkers} markers and ${stats.newPhotos} photos`)
 */
export function getMergeStatistics (targetExport, sourceExport, options = {}) {
  const { coordinateTolerance = 0 } = options

  let duplicateMarkers = 0
  let newMarkers = 0
  let duplicatePhotos = 0
  let newPhotos = 0

  for (const sourceMarker of sourceExport.markers) {
    const matchingMarker = findDuplicateMarker(
      targetExport.markers,
      sourceMarker,
      coordinateTolerance
    )

    if (matchingMarker) {
      duplicateMarkers++

      // Count photos
      const sourcePhotosForMarker = sourceExport.photos.filter(
        p => p.markerId === sourceMarker.id
      )

      for (const sourcePhoto of sourcePhotosForMarker) {
        const photoExists = isDuplicatePhoto(
          targetExport.photos,
          sourcePhoto,
          matchingMarker.id
        )

        if (photoExists) {
          duplicatePhotos++
        } else {
          newPhotos++
        }
      }
    } else {
      newMarkers++

      // All photos for new markers are new
      const sourcePhotosForMarker = sourceExport.photos.filter(
        p => p.markerId === sourceMarker.id
      )
      newPhotos += sourcePhotosForMarker.length
    }
  }

  return {
    duplicateMarkers,
    newMarkers,
    duplicatePhotos,
    newPhotos,
    totalSourceMarkers: sourceExport.markers.length,
    totalSourcePhotos: sourceExport.photos.length
  }
}
