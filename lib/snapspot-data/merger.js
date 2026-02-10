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
 * Find duplicate marker by label/description
 *
 * Searches for an existing marker with the same label or description text.
 * Useful for migrated markers where coordinates may not match exactly.
 *
 * @param {Array<Object>} existingMarkers - Array of existing markers
 * @param {Object} candidateMarker - Marker to search for
 * @returns {Object|null} Matching marker or null if not found
 *
 * @example
 * const match = findDuplicateMarkerByLabel(existingMarkers, newMarker)
 */
export function findDuplicateMarkerByLabel (existingMarkers, candidateMarker) {
  if (!Array.isArray(existingMarkers) || !candidateMarker) {
    return null
  }

  // Only match if candidate has a non-empty label or description
  const candidateLabel = (candidateMarker.label || '').trim()
  const candidateDesc = (candidateMarker.description || '').trim()

  if (!candidateLabel && !candidateDesc) {
    return null // Can't match markers without labels
  }

  return existingMarkers.find(existing => {
    const existingLabel = (existing.label || '').trim()
    const existingDesc = (existing.description || '').trim()

    // Match if labels match (case-insensitive)
    if (candidateLabel && existingLabel &&
        candidateLabel.toLowerCase() === existingLabel.toLowerCase()) {
      return true
    }

    // Or if descriptions match (case-insensitive)
    if (candidateDesc && existingDesc &&
        candidateDesc.toLowerCase() === existingDesc.toLowerCase()) {
      return true
    }

    return false
  })
}

/**
 * Find duplicate marker by photo filenames
 *
 * Searches for an existing marker that has the same photo filenames.
 * If both markers have only photos with identical filenames, they're likely duplicates.
 *
 * @param {Array<Object>} existingMarkers - Array of existing markers
 * @param {Object} candidateMarker - Marker to search for
 * @param {Array<Object>} candidatePhotos - Photos associated with candidate marker
 * @param {Array<Object>} existingPhotos - All photos from existing export
 * @param {number} [minimumPhotoCount=1] - Minimum photos required for match
 * @param {number} [matchThreshold=0.7] - Fraction of filenames that must match (0.0-1.0)
 * @returns {Object|null} Matching marker or null if not found
 *
 * @example
 * const match = findDuplicateMarkerByPhotos(existingMarkers, newMarker, newPhotos, allPhotos)
 */
export function findDuplicateMarkerByPhotos (existingMarkers, candidateMarker, candidatePhotos, existingPhotos, minimumPhotoCount = 1, matchThreshold = 0.7) {
  if (!Array.isArray(existingMarkers) || !candidateMarker || !candidatePhotos || !existingPhotos) {
    return null
  }

  // Get photo filenames for candidate marker
  const candidatePhotoIds = candidateMarker.photoIds || []
  const candidateFilenames = candidatePhotos
    .filter(p => candidatePhotoIds.includes(p.id))
    .map(p => (p.fileName || '').toLowerCase().trim())
    .filter(name => name.length > 0)

  // Need at least the minimum number of photos to match
  if (candidateFilenames.length < minimumPhotoCount) {
    return null
  }

  // Find existing marker with matching photo filenames
  return existingMarkers.find(existing => {
    const existingPhotoIds = existing.photoIds || []
    const existingFilenames = existingPhotos
      .filter(p => existingPhotoIds.includes(p.id))
      .map(p => (p.fileName || '').toLowerCase().trim())
      .filter(name => name.length > 0)

    // Need at least the minimum number of photos
    if (existingFilenames.length < minimumPhotoCount) {
      return false
    }

    // Calculate how many filenames match
    const candidateSet = new Set(candidateFilenames)
    const matchCount = existingFilenames.filter(name => candidateSet.has(name)).length

    // Check if enough filenames match
    const candidateMatchRatio = matchCount / candidateFilenames.length
    const existingMatchRatio = matchCount / existingFilenames.length

    // Both sides must meet the threshold
    return candidateMatchRatio >= matchThreshold && existingMatchRatio >= matchThreshold
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
 * Find duplicate metadata definition by ID or name
 *
 * Searches for an existing metadata definition that matches by ID first,
 * then falls back to matching by name if no ID match is found.
 *
 * @param {Array<Object>} existingDefinitions - Array of existing metadata definitions
 * @param {Object} candidateDefinition - Definition to search for
 * @returns {Object|null} Matching definition or null if not found
 *
 * @example
 * const match = findDuplicateMetadataDefinition(existingDefs, newDef)
 * if (match) {
 *   console.log(`Found duplicate: ${match.name}`)
 * }
 */
export function findDuplicateMetadataDefinition (existingDefinitions, candidateDefinition) {
  if (!Array.isArray(existingDefinitions) || !candidateDefinition) {
    return null
  }

  // First try to match by ID (most reliable)
  const matchById = existingDefinitions.find(
    def => def.id === candidateDefinition.id
  )

  if (matchById) {
    return matchById
  }

  // Fall back to matching by name (case-insensitive)
  const candidateName = (candidateDefinition.name || '').trim().toLowerCase()
  if (!candidateName) {
    return null
  }

  return existingDefinitions.find(
    def => (def.name || '').trim().toLowerCase() === candidateName
  )
}

/**
 * Merge metadata definitions from two exports
 *
 * Combines target and source metadata definitions, handling duplicates
 * according to the specified strategy.
 *
 * @param {Array<Object>} targetDefinitions - Existing definitions
 * @param {Array<Object>} sourceDefinitions - Definitions to merge in
 * @param {Object} options - Merge options
 * @param {string} options.conflictStrategy - 'skip', 'overwrite', or 'keep-both' (default: 'skip')
 * @param {Function} options.idGenerator - ID generator function
 * @param {string} options.targetMapId - Target map ID for scope conversion
 * @returns {Object} Result containing merged definitions and ID mapping
 * @returns {Array<Object>} return.definitions - Merged definitions array
 * @returns {Map<string,string>} return.idMap - Source ID -> merged ID mapping
 *
 * @example
 * const result = mergeMetadataDefinitions(existingDefs, newDefs, {
 *   conflictStrategy: 'keep-both',
 *   idGenerator: generateId,
 *   targetMapId: 'map123'
 * })
 */
export function mergeMetadataDefinitions (targetDefinitions, sourceDefinitions, options = {}) {
  const {
    conflictStrategy = 'skip',
    idGenerator = generateId,
    targetMapId = null
  } = options

  const mergedDefinitions = [...targetDefinitions]
  const definitionIdMap = new Map()

  for (const sourceDef of sourceDefinitions) {
    const matchingDef = findDuplicateMetadataDefinition(mergedDefinitions, sourceDef)

    if (matchingDef) {
      // Duplicate found - apply conflict strategy
      if (conflictStrategy === 'skip') {
        console.log(`Merger: Skipping duplicate metadata definition "${sourceDef.name}" (ID: ${sourceDef.id})`)
        // Map source ID to existing ID
        definitionIdMap.set(sourceDef.id, matchingDef.id)
      } else if (conflictStrategy === 'overwrite') {
        console.log(`Merger: Overwriting metadata definition "${sourceDef.name}" (ID: ${sourceDef.id})`)
        // Replace existing definition
        const index = mergedDefinitions.indexOf(matchingDef)
        mergedDefinitions[index] = {
          ...sourceDef,
          lastModified: new Date().toISOString()
        }
        // Map source ID to same ID (overwritten)
        definitionIdMap.set(sourceDef.id, sourceDef.id)
      } else if (conflictStrategy === 'keep-both') {
        console.log(`Merger: Keeping both versions of metadata definition "${sourceDef.name}"`)
        // Create new ID for source definition to avoid collision
        const newId = idGenerator('metadataDefinition')
        const newDef = {
          ...sourceDef,
          id: newId,
          name: `${sourceDef.name} (imported)`,
          lastModified: new Date().toISOString()
        }

        // Convert scope if map-specific
        if (newDef.scope !== 'global' && targetMapId) {
          newDef.scope = targetMapId
        }

        mergedDefinitions.push(newDef)
        definitionIdMap.set(sourceDef.id, newId)
      }
    } else {
      // New definition - add it
      console.log(`Merger: Adding new metadata definition "${sourceDef.name}" (ID: ${sourceDef.id})`)
      const newDef = {
        ...sourceDef,
        lastModified: new Date().toISOString()
      }

      // Convert scope if map-specific
      if (newDef.scope !== 'global' && targetMapId) {
        newDef.scope = targetMapId
      }

      mergedDefinitions.push(newDef)
      definitionIdMap.set(sourceDef.id, sourceDef.id)
    }
  }

  return {
    definitions: mergedDefinitions,
    idMap: definitionIdMap
  }
}

/**
 * Merge metadata values from two exports
 *
 * Combines metadata values, remapping IDs to match the merged export.
 *
 * @param {Array<Object>} targetValues - Existing metadata values
 * @param {Array<Object>} sourceValues - Values to merge in
 * @param {Object} idMaps - ID mapping objects
 * @param {Map<string,string>} idMaps.definitionIdMap - Definition ID mappings
 * @param {Map<string,string>} idMaps.markerIdMap - Marker ID mappings
 * @param {Map<string,string>} idMaps.photoIdMap - Photo ID mappings
 * @param {string} idMaps.targetMapId - Target map ID
 * @param {Function} options.idGenerator - ID generator function
 * @returns {Array<Object>} Merged metadata values array
 *
 * @example
 * const merged = mergeMetadataValues(existingValues, newValues, {
 *   definitionIdMap,
 *   markerIdMap,
 *   photoIdMap,
 *   targetMapId: 'map123',
 *   idGenerator: generateId
 * })
 */
export function mergeMetadataValues (targetValues, sourceValues, idMaps, options = {}) {
  const {
    definitionIdMap,
    markerIdMap,
    photoIdMap,
    targetMapId
  } = idMaps

  const { idGenerator = generateId } = options
  const mergedValues = [...targetValues]

  for (const sourceValue of sourceValues) {
    // Skip if definition was not merged (e.g., skipped during conflict)
    const newDefinitionId = definitionIdMap.get(sourceValue.definitionId)
    if (!newDefinitionId) {
      console.log(`Merger: Skipping metadata value for unmapped definition ID: ${sourceValue.definitionId}`)
      continue
    }

    // Remap entity ID based on entity type
    let newEntityId = sourceValue.entityId

    if (sourceValue.entityType === 'map') {
      newEntityId = targetMapId
    } else if (sourceValue.entityType === 'marker') {
      newEntityId = markerIdMap.get(sourceValue.entityId) || sourceValue.entityId
    } else if (sourceValue.entityType === 'photo') {
      newEntityId = photoIdMap.get(sourceValue.entityId) || sourceValue.entityId
    }

    // Check if identical value already exists
    const isDuplicate = mergedValues.some(
      val =>
        val.definitionId === newDefinitionId &&
        val.entityType === sourceValue.entityType &&
        val.entityId === newEntityId
    )

    if (isDuplicate) {
      console.log(`Merger: Skipping duplicate metadata value for ${sourceValue.entityType} ${newEntityId}`)
      continue
    }

    // Add new metadata value with remapped IDs
    const newValue = {
      ...sourceValue,
      id: idGenerator('metadataValue'),
      definitionId: newDefinitionId,
      entityId: newEntityId,
      lastModified: new Date().toISOString()
    }

    mergedValues.push(newValue)
  }

  return mergedValues
}

/**
 * Merge two SnapSpot exports intelligently
 *
 * Combines targetExport and sourceExport, handling duplicates:
 * - Markers at same coordinates: photos are merged
 * - New markers: added to target
 * - Duplicate photos: handled per strategy (skip or rename)
 * - Metadata definitions: merged with conflict resolution
 * - Metadata values: merged with ID remapping
 *
 * @param {Object} targetExport - Base export to merge into
 * @param {Object} sourceExport - Export to merge from
 * @param {Object} [options={}] - Merge options
 * @param {string} options.duplicateStrategy - 'none', 'coordinates', 'label', 'photos', or 'smart' (default: 'coordinates')
 * @param {number} options.coordinateTolerance - Pixel tolerance for coordinate-based detection (default: 5)
 * @param {number} options.photoMatchThreshold - Fraction of filenames that must match for photo-based detection (default: 0.7)
 * @param {string} options.duplicatePhotoStrategy - 'skip' or 'rename' (default: 'skip')
 * @param {boolean} options.preserveTimestamps - Keep original creation dates (default: true)
 * @param {boolean} options.mergeMetadata - Whether to merge metadata (default: true)
 * @param {string} options.metadataConflictStrategy - 'skip', 'overwrite', or 'keep-both' (default: 'skip')
 * @param {Function} options.idGenerator - Custom ID generator function (default: generateId)
 * @returns {Object} New merged export object
 *
 * @example
 * const merged = mergeExports(existingExport, importedExport, {
 *   duplicateStrategy: 'coordinates',
 *   coordinateTolerance: 5,
 *   duplicatePhotoStrategy: 'skip',
 *   mergeMetadata: true,
 *   metadataConflictStrategy: 'keep-both'
 * })
 */
export function mergeExports (targetExport, sourceExport, options = {}) {
  const {
    duplicateStrategy = 'coordinates', // Coordinate-based matching with tolerance
    coordinateTolerance = 5, // 5px tolerance for coordinate matching
    photoMatchThreshold = 0.7,
    preserveTimestamps = true,
    mergeMetadata = true,
    metadataConflictStrategy = 'skip',
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
    metadataDefinitions: targetExport.metadataDefinitions ? [...targetExport.metadataDefinitions] : [],
    metadataValues: targetExport.metadataValues ? [...targetExport.metadataValues] : [],
    metadata: {
      ...targetExport.metadata,
      mergedFrom: [
        ...(targetExport.metadata?.mergedFrom || []),
        {
          sourceApp: sourceExport.sourceApp || sourceExport.metadata?.sourceApp,
          timestamp: sourceExport.timestamp || sourceExport.metadata?.exportDate,
          markerCount: sourceExport.markers.length,
          photoCount: sourceExport.photos.length,
          metadataDefinitionCount: sourceExport.metadataDefinitions?.length || 0,
          metadataValueCount: sourceExport.metadataValues?.length || 0
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
    // Find matching marker in target using specified strategy
    let matchingMarker = null

    if (duplicateStrategy === 'coordinates') {
      // Coordinate-based matching only
      matchingMarker = findDuplicateMarker(
        mergedExport.markers,
        sourceMarker,
        coordinateTolerance
      )
    } else if (duplicateStrategy === 'label') {
      // Label/description matching only
      matchingMarker = findDuplicateMarkerByLabel(
        mergedExport.markers,
        sourceMarker
      )
    } else if (duplicateStrategy === 'photos') {
      // Photo filename matching only
      matchingMarker = findDuplicateMarkerByPhotos(
        mergedExport.markers,
        sourceMarker,
        sourceExport.photos,
        mergedExport.photos,
        1,
        photoMatchThreshold
      )
    } else if (duplicateStrategy === 'smart') {
      // Try multiple strategies in order of reliability:
      // 1. Photos (most reliable if markers have photos)
      // 2. Labels (reliable for labeled markers)
      // 3. Coordinates (fallback)
      matchingMarker = findDuplicateMarkerByPhotos(
        mergedExport.markers,
        sourceMarker,
        sourceExport.photos,
        mergedExport.photos,
        1,
        photoMatchThreshold
      )
      if (!matchingMarker) {
        matchingMarker = findDuplicateMarkerByLabel(
          mergedExport.markers,
          sourceMarker
        )
      }
      if (!matchingMarker) {
        matchingMarker = findDuplicateMarker(
          mergedExport.markers,
          sourceMarker,
          coordinateTolerance
        )
      }
    }
    // If duplicateStrategy === 'none', matchingMarker stays null

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

  // Merge metadata if enabled
  let definitionIdMap = new Map()
  let newDefinitionsAdded = 0
  let newValuesAdded = 0

  if (mergeMetadata && sourceExport.metadataDefinitions && sourceExport.metadataDefinitions.length > 0) {
    console.log('Merger: Merging metadata definitions...')

    const definitionMergeResult = mergeMetadataDefinitions(
      mergedExport.metadataDefinitions || [],
      sourceExport.metadataDefinitions,
      {
        conflictStrategy: metadataConflictStrategy,
        idGenerator,
        targetMapId: mergedExport.map?.id
      }
    )

    mergedExport.metadataDefinitions = definitionMergeResult.definitions
    definitionIdMap = definitionMergeResult.idMap
    newDefinitionsAdded = definitionMergeResult.definitions.length - (targetExport.metadataDefinitions?.length || 0)
  }

  if (mergeMetadata && sourceExport.metadataValues && sourceExport.metadataValues.length > 0) {
    console.log('Merger: Merging metadata values...')

    const originalValueCount = mergedExport.metadataValues?.length || 0

    mergedExport.metadataValues = mergeMetadataValues(
      mergedExport.metadataValues || [],
      sourceExport.metadataValues,
      {
        definitionIdMap,
        markerIdMap,
        photoIdMap,
        targetMapId: mergedExport.map?.id
      },
      { idGenerator }
    )

    newValuesAdded = mergedExport.metadataValues.length - originalValueCount
  }

  // Update timestamp
  mergedExport.timestamp = new Date().toISOString()
  if (mergedExport.map) {
    mergedExport.map.lastModified = new Date().toISOString()
  }

  console.log(`Merger: Added ${newMarkersAdded.length} new markers, ${newPhotosAdded.length} new photos. Updated ${updatedMarkers.length} existing markers.`)
  if (mergeMetadata) {
    console.log(`Merger: Added/merged ${newDefinitionsAdded} metadata definitions, ${newValuesAdded} metadata values.`)
  }

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
 * @returns {number} return.duplicateMetadataDefinitions - Number of duplicate definitions
 * @returns {number} return.newMetadataDefinitions - Number of new definitions to add
 * @returns {number} return.newMetadataValues - Number of new metadata values to add
 *
 * @example
 * const stats = getMergeStatistics(existing, imported)
 * console.log(`Will add ${stats.newMarkers} markers and ${stats.newPhotos} photos`)
 */
export function getMergeStatistics (targetExport, sourceExport, options = {}) {
  const {
    duplicateStrategy = 'coordinates',
    coordinateTolerance = 0,
    photoMatchThreshold = 0.7
  } = options

  let duplicateMarkers = 0
  let newMarkers = 0
  let duplicatePhotos = 0
  let newPhotos = 0

  for (const sourceMarker of sourceExport.markers) {
    // Use same strategy as merge
    let matchingMarker = null

    if (duplicateStrategy === 'coordinates') {
      matchingMarker = findDuplicateMarker(
        targetExport.markers,
        sourceMarker,
        coordinateTolerance
      )
    } else if (duplicateStrategy === 'label') {
      matchingMarker = findDuplicateMarkerByLabel(
        targetExport.markers,
        sourceMarker
      )
    } else if (duplicateStrategy === 'photos') {
      matchingMarker = findDuplicateMarkerByPhotos(
        targetExport.markers,
        sourceMarker,
        sourceExport.photos,
        targetExport.photos,
        1,
        photoMatchThreshold
      )
    } else if (duplicateStrategy === 'smart') {
      matchingMarker = findDuplicateMarkerByPhotos(
        targetExport.markers,
        sourceMarker,
        sourceExport.photos,
        targetExport.photos,
        1,
        photoMatchThreshold
      )
      if (!matchingMarker) {
        matchingMarker = findDuplicateMarkerByLabel(
          targetExport.markers,
          sourceMarker
        )
      }
      if (!matchingMarker) {
        matchingMarker = findDuplicateMarker(
          targetExport.markers,
          sourceMarker,
          coordinateTolerance
        )
      }
    }

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

  // Count metadata statistics
  let duplicateMetadataDefinitions = 0
  let newMetadataDefinitions = 0
  let newMetadataValues = 0

  if (sourceExport.metadataDefinitions && sourceExport.metadataDefinitions.length > 0) {
    const targetDefs = targetExport.metadataDefinitions || []

    for (const sourceDef of sourceExport.metadataDefinitions) {
      const matchingDef = findDuplicateMetadataDefinition(targetDefs, sourceDef)
      if (matchingDef) {
        duplicateMetadataDefinitions++
      } else {
        newMetadataDefinitions++
      }
    }

    // Estimate metadata values (approximate - actual may vary based on ID mappings)
    newMetadataValues = sourceExport.metadataValues?.length || 0
  }

  return {
    duplicateMarkers,
    newMarkers,
    duplicatePhotos,
    newPhotos,
    totalSourceMarkers: sourceExport.markers.length,
    totalSourcePhotos: sourceExport.photos.length,
    duplicateMetadataDefinitions,
    newMetadataDefinitions,
    totalSourceMetadataDefinitions: sourceExport.metadataDefinitions?.length || 0,
    newMetadataValues,
    totalSourceMetadataValues: sourceExport.metadataValues?.length || 0
  }
}
