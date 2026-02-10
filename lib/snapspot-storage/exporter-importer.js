// lib/snapspot-storage/exporter-importer.js

/* global Blob, URL, crypto, alert, FileReader */

import { parseExport } from '../snapspot-data/parser.js'
import { buildExport } from '../snapspot-data/writer.js'
import { validateExportFile } from '../snapspot-data/validator.js'
import { groupMarkersByDay } from '../snapspot-data/splitter.js'
import { mergeExports } from '../snapspot-data/merger.js'
import { generateImageHash } from '../snapspot-image/hasher.js'
import { blobToBase64, base64ToBlob } from '../snapspot-image/converter.js'

/**
 * Storage-aware export/import operations for SnapSpot PWA.
 * This class integrates the pure data operations from lib/snapspot-data
 * with storage (IndexedDB) and UI operations specific to the PWA.
 *
 * Uses:
 * - lib/snapspot-data for parsing, writing, validation, merging, splitting
 * - lib/snapspot-image for image conversion and hashing
 * - MapStorage for database operations
 * - ModalManager for UI interactions
 */
export class StorageExporterImporter {
  /**
   * Exports a map's data (map, markers, photos) to a JSON file(s).
   *
   * @param {object} map - The map object retrieved from storage (includes map.imageData Blob).
   * @param {Array<object>} allMarkers - All marker objects for the map.
   * @param {Array<object>} allPhotos - All photo objects for the markers.
   * @param {object} imageProcessor - Instance of ImageProcessor class.
   * @param {object} [options={}] - Optional export options.
   * @param {string[]} [options.datesToExport] - Array of YYYY-MM-DD date strings to filter markers.
   * @param {boolean} [options.splitByDate] - If true, generates separate file for each date.
   * @param {boolean} [options.includePhotos=true] - If true, includes photos in export.
   * @param {boolean} [options.includeMetadata=true] - If true, includes metadata definitions and values.
   * @param {MapStorage} [mapStorage=null] - Instance of MapStorage to update imageHash if needed.
   */
  static async exportData (map, allMarkers, allPhotos, imageProcessor, options = {}, mapStorage = null) {
    console.log(`StorageExporterImporter: Preparing data for export for map "${map.name}" (${map.id}).`)

    const { datesToExport, splitByDate, includePhotos = true, includeMetadata = true } = options

    // Filter markers and photos by date if requested
    let markersToExport = [...allMarkers]
    let photosToExport = [...allPhotos]

    if (datesToExport && datesToExport.length > 0) {
      console.log(`StorageExporterImporter: Filtering markers for dates: ${datesToExport.join(', ')}`)

      const filteredMarkers = allMarkers.filter(marker => {
        const createdDate = marker.createdDate instanceof Date ? marker.createdDate : new Date(marker.createdDate)
        const dateKey = createdDate.toISOString().slice(0, 10)
        return datesToExport.includes(dateKey)
      })

      const filteredMarkerIds = new Set(filteredMarkers.map(m => m.id))
      const filteredPhotos = allPhotos.filter(photo => filteredMarkerIds.has(photo.markerId))

      markersToExport = filteredMarkers
      photosToExport = filteredPhotos
    }

    // Prepare map object for export
    const exportMap = { ...map }
    delete exportMap.markers
    delete exportMap.filePath

    // Ensure imageHash exists (calculate if missing and possible)
    if (!exportMap.imageHash) {
      console.log(`StorageExporterImporter: Map "${map.id}" missing imageHash. Calculating...`)

      if (mapStorage && exportMap.imageData instanceof Blob) {
        try {
          const calculatedHash = await generateImageHash(exportMap.imageData)
          exportMap.imageHash = calculatedHash

          // Update storage with calculated hash
          await mapStorage.updateMap(exportMap.id, { imageHash: calculatedHash })
          console.log(`StorageExporterImporter: Calculated and saved imageHash: ${calculatedHash}`)
        } catch (error) {
          console.error('StorageExporterImporter: Failed to calculate imageHash:', error)
        }
      } else {
        console.warn('StorageExporterImporter: Cannot calculate imageHash (no mapStorage or imageData not a Blob).')
      }
    }

    // Keep the original Blob for buildExport (it handles conversion internally)
    const mapImageBlob = exportMap.imageData
    if (!(mapImageBlob instanceof Blob)) {
      console.warn('StorageExporterImporter: Map imageData is not a Blob. Export may fail.')
    }

    // Prepare markers (cloning to avoid modifying originals)
    const processedMarkers = markersToExport.map(marker => {
      const processed = { ...marker }
      // Ensure dates are ISO strings for export
      if (processed.createdDate instanceof Date) {
        processed.createdDate = processed.createdDate.toISOString()
      }
      if (processed.lastModified instanceof Date) {
        processed.lastModified = processed.lastModified.toISOString()
      }
      return processed
    })

    // Prepare photos - convert blobs to base64
    const processedPhotos = await Promise.all(photosToExport.map(async photo => {
      const exportPhoto = { ...photo }

      // Convert main image
      if (exportPhoto.imageData instanceof Blob) {
        exportPhoto.imageData = await blobToBase64(exportPhoto.imageData)
      } else if (typeof exportPhoto.imageData !== 'string' || !exportPhoto.imageData.startsWith('data:')) {
        console.warn(`StorageExporterImporter: Photo "${photo.id}" imageData is not a Blob or Base64.`)
      }

      // Convert thumbnail if exists
      if (exportPhoto.thumbnailData instanceof Blob) {
        exportPhoto.thumbnailData = await blobToBase64(exportPhoto.thumbnailData)
      }

      // Ensure dates are ISO strings
      if (exportPhoto.createdDate instanceof Date) {
        exportPhoto.createdDate = exportPhoto.createdDate.toISOString()
      }

      return exportPhoto
    }))

    // Fetch metadata if requested and mapStorage available
    let metadataDefinitions = []
    let metadataValues = []

    if (includeMetadata && mapStorage) {
      console.log('StorageExporterImporter: Fetching metadata definitions and values...')

      // Fetch global definitions
      const globalDefs = await mapStorage.getMetadataDefinitionsByScope('global')

      // Fetch map-specific definitions
      const mapDefs = await mapStorage.getMetadataDefinitionsByScope(map.id)

      metadataDefinitions = [...globalDefs, ...mapDefs]

      // Fetch all values for map, markers, and photos in export
      const mapValues = await mapStorage.getMetadataValuesForEntity('map', map.id)

      const markerValues = []
      for (const marker of markersToExport) {
        const values = await mapStorage.getMetadataValuesForEntity('marker', marker.id)
        markerValues.push(...values)
      }

      const photoValues = []
      if (includePhotos) {
        for (const photo of photosToExport) {
          const values = await mapStorage.getMetadataValuesForEntity('photo', photo.id)
          photoValues.push(...values)
        }
      }

      metadataValues = [...mapValues, ...markerValues, ...photoValues]

      console.log(`StorageExporterImporter: Found ${metadataDefinitions.length} metadata definitions and ${metadataValues.length} values.`)
    }

    // Handle split by date or single file export
    if (splitByDate && datesToExport && datesToExport.length > 1) {
      await this._exportSplitByDate(exportMap, mapImageBlob, processedMarkers, processedPhotos, datesToExport, metadataDefinitions, metadataValues)
    } else {
      // Use lib/snapspot-data/writer.js buildExport function
      const exportObject = await buildExport(
        exportMap,
        mapImageBlob, // Pass the Blob - buildExport handles conversion
        processedMarkers,
        processedPhotos,
        {
          sourceApp: 'SnapSpot PWA',
          includePhotos
        },
        metadataDefinitions,
        metadataValues
      )

      const jsonString = JSON.stringify(exportObject, null, 2)
      const dateSuffix = (datesToExport && datesToExport.length === 1)
        ? datesToExport[0]
        : new Date().toISOString().slice(0, 10)

      this._triggerDownload(jsonString, `SnapSpot_Export_${map.name.replace(/\s+/g, '_')}_${dateSuffix}.json`)
      console.log(`StorageExporterImporter: Map "${map.name}" exported successfully.`)
    }
  }

  /**
   * Helper to export data split by date into multiple files.
   * @private
   */
  static async _exportSplitByDate (baseMap, mapImageBlob, allProcessedMarkers, allProcessedPhotos, datesToExport, metadataDefinitions = [], metadataValues = []) {
    for (const dateKey of datesToExport) {
      const markersForDay = allProcessedMarkers.filter(marker => {
        const createdDate = typeof marker.createdDate === 'string'
          ? new Date(marker.createdDate)
          : marker.createdDate
        return createdDate.toISOString().slice(0, 10) === dateKey
      })

      const markerIdsForDay = new Set(markersForDay.map(m => m.id))
      const photosForDay = allProcessedPhotos.filter(photo => markerIdsForDay.has(photo.markerId))

      // Filter metadata values to only include those for markers/photos being exported
      const photoIdsForDay = new Set(photosForDay.map(p => p.id))
      const filteredMetadataValues = metadataValues.filter(value => {
        if (value.entityType === 'map' && value.entityId === baseMap.id) return true
        if (value.entityType === 'marker' && markerIdsForDay.has(value.entityId)) return true
        if (value.entityType === 'photo' && photoIdsForDay.has(value.entityId)) return true
        return false
      })

      if (markersForDay.length > 0 || photosForDay.length > 0) {
        const exportObject = await buildExport(
          baseMap,
          mapImageBlob, // Pass the Blob - buildExport handles conversion
          markersForDay,
          photosForDay,
          {
            sourceApp: 'SnapSpot PWA'
          },
          metadataDefinitions,
          filteredMetadataValues
        )

        const jsonString = JSON.stringify(exportObject, null, 2)
        const filename = `SnapSpot_Export_${baseMap.name.replace(/\s+/g, '_')}_${dateKey}.json`

        this._triggerDownload(jsonString, filename)
        console.log(`StorageExporterImporter: Exported data for date "${dateKey}".`)
      }
    }
  }

  /**
   * Helper to trigger a file download.
   * @private
   */
  static _triggerDownload (jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Imports map data from a JSON string.
   * Handles new imports, hash-based matching, and secondary matching.
   *
   * @param {string} jsonString - The JSON string content from the import file.
   * @param {object} ImageProcessorClass - The ImageProcessor CLASS for base64ToBlob.
   * @param {MapStorage} mapStorage - Instance of MapStorage for querying.
   * @returns {Promise<object>} Import result with importType and data.
   * @throws {Error} If the JSON data is invalid.
   */
  static async importData (jsonString, ImageProcessorClass, mapStorage) {
    console.log('StorageExporterImporter: Importing data...')

    // Parse JSON first
    let rawExportData
    try {
      rawExportData = JSON.parse(jsonString)
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`)
    }

    // Validate the raw export file structure
    const validation = validateExportFile(rawExportData)
    if (!validation.isValid) {
      console.warn('StorageExporterImporter: Validation errors:', validation.errors.join(', '))
    }

    // Now parse and transform using lib/snapspot-data
    let importObject
    try {
      importObject = await parseExport(jsonString)
    } catch (error) {
      throw new Error(`StorageExporterImporter: ${error.message}`)
    }

    const importedImageHash = importObject.map?.hash
    let existingMaps = []
    let importType = 'new'

    // Try hash-based matching
    if (importedImageHash) {
      existingMaps = await mapStorage.getMapsByImageHash(importedImageHash)

      if (existingMaps.length > 0) {
        // Enhance with marker counts
        const enhancedExistingMaps = []
        for (const map of existingMaps) {
          const markers = await mapStorage.getMarkersForMap(map.id)
          enhancedExistingMaps.push({
            ...map,
            markerCount: markers.length
          })
        }

        console.log(`StorageExporterImporter: Found ${enhancedExistingMaps.length} existing map(s) with matching hash.`)
        importType = 'decision_required'
        return {
          importObject,
          ImageProcessorClass,
          importType,
          existingMaps: enhancedExistingMaps,
          secondaryMatches: []
        }
      }
    } else {
      console.warn('StorageExporterImporter: Import has no imageHash (legacy format).')
    }

    // Try secondary matching
    if (!importedImageHash || existingMaps.length === 0) {
      const secondaryMatches = await this.getSecondaryMapMatches(importObject.map, mapStorage)

      if (secondaryMatches.length > 0) {
        console.log(`StorageExporterImporter: Found ${secondaryMatches.length} secondary matches.`)
        importType = 'decision_required'
        return {
          importObject,
          ImageProcessorClass,
          importType,
          existingMaps: [],
          secondaryMatches
        }
      }
    }

    // No matches - process as new map
    const processedData = await this._processImportedDataForNewMap(importObject, ImageProcessorClass)
    return {
      ...processedData,
      importType,
      existingMaps: [],
      secondaryMatches: []
    }
  }

  /**
   * Process imported data to generate new UIDs for new map import.
   * @private
   */
  static async _processImportedDataForNewMap (importObject, ImageProcessorClass) {
    console.log('StorageExporterImporter: Processing as new map (generating new UIDs)...')

    const oldToNewIdMap = new Map()

    // Generate new map ID
    const newMapId = crypto.randomUUID()
    oldToNewIdMap.set(importObject.map.id, newMapId)

    // Generate new marker IDs
    const newMarkerIds = new Map()
    importObject.markers.forEach(marker => {
      const newId = crypto.randomUUID()
      newMarkerIds.set(marker.id, newId)
      oldToNewIdMap.set(marker.id, newId)
    })

    // Generate new photo IDs
    const newPhotoIds = new Map()
    importObject.photos.forEach(photo => {
      const newId = crypto.randomUUID()
      newPhotoIds.set(photo.id, newId)
      oldToNewIdMap.set(photo.id, newId)
    })

    // Generate hash for legacy files if missing
    let imageHash = importObject.map.hash
    if (!imageHash && importObject.mapImage instanceof Blob) {
      console.log('StorageExporterImporter: Legacy import detected (no hash). Generating hash from map image...')
      try {
        imageHash = await generateImageHash(importObject.mapImage)
        console.log(`StorageExporterImporter: Generated hash for legacy import: ${imageHash}`)
      } catch (error) {
        console.error('StorageExporterImporter: Failed to generate hash for legacy import:', error)
      }
    }

    // Process map
    const importedMap = {
      ...importObject.map,
      id: newMapId,
      imageData: importObject.mapImage, // Use the Blob from parseExport
      imageHash // Use hash from parsed map or newly generated for legacy files
    }

    // Ensure dates are Date objects
    if (importedMap.created) importedMap.createdDate = new Date(importedMap.created)
    if (importedMap.modified) importedMap.lastModified = new Date(importedMap.modified)

    // Process markers
    const importedMarkers = await Promise.all(importObject.markers.map(async marker => {
      const newMarker = {
        ...marker,
        id: newMarkerIds.get(marker.id),
        mapId: newMapId,
        photoIds: marker.photoIds
          .map(oldPhotoId => newPhotoIds.get(oldPhotoId))
          .filter(newId => newId)
      }

      if (newMarker.createdDate) newMarker.createdDate = new Date(newMarker.createdDate)
      if (newMarker.lastModified) newMarker.lastModified = new Date(newMarker.lastModified)

      return newMarker
    }))

    // Process photos
    const importedPhotos = await Promise.all(importObject.photos.map(async photo => {
      const newPhoto = {
        ...photo,
        id: newPhotoIds.get(photo.id),
        markerId: newMarkerIds.get(photo.markerId)
      }

      // Convert imageData
      if (newPhoto.imageData && typeof newPhoto.imageData === 'string') {
        newPhoto.imageData = await base64ToBlob(newPhoto.imageData, newPhoto.fileType)
      }

      // Convert thumbnailData
      if (newPhoto.thumbnailData && typeof newPhoto.thumbnailData === 'string') {
        newPhoto.thumbnailData = await base64ToBlob(newPhoto.thumbnailData, newPhoto.fileType)
      }

      if (!newPhoto.thumbnailData || !(newPhoto.thumbnailData instanceof Blob)) {
        newPhoto.thumbnailData = null
      }

      if (newPhoto.createdDate) newPhoto.createdDate = new Date(newPhoto.createdDate)

      return newPhoto
    }))

    // Process metadata definitions (convert map-specific scope to new map ID)
    const importedMetadataDefinitions = (importObject.metadataDefinitions || []).map(def => {
      const newDef = { ...def }
      // If scope is a map ID (not 'global'), convert it to the new map ID
      if (newDef.scope !== 'global') {
        newDef.scope = newMapId
      }
      return newDef
    })

    // Process metadata values (update entity IDs)
    const importedMetadataValues = (importObject.metadataValues || []).map(value => {
      const newValue = { ...value }
      // Update entity IDs based on entity type
      if (newValue.entityType === 'map') {
        newValue.entityId = newMapId
      } else if (newValue.entityType === 'marker') {
        newValue.entityId = newMarkerIds.get(newValue.entityId) || newValue.entityId
      } else if (newValue.entityType === 'photo') {
        newValue.entityId = newPhotoIds.get(newValue.entityId) || newValue.entityId
      }
      return newValue
    })

    console.log('StorageExporterImporter: New map data processed.')
    return {
      map: importedMap,
      markers: importedMarkers,
      photos: importedPhotos,
      metadataDefinitions: importedMetadataDefinitions,
      metadataValues: importedMetadataValues
    }
  }

  /**
   * Merge imported data into an existing map.
   * Now uses lib/snapspot-data/merger.js for intelligent duplicate detection.
   *
   * @param {string} existingMapId - ID of the existing map to merge into.
   * @param {object} importedObject - The raw parsed import data.
   * @param {object} ImageProcessorClass - ImageProcessor CLASS for conversions.
   * @param {MapStorage} mapStorage - Storage instance.
   * @param {Object} [options={}] - Merge options.
   * @param {string} options.duplicateStrategy - 'none', 'coordinates', 'label', 'photos', or 'smart' (default: 'coordinates').
   * @param {number} options.coordinateTolerance - Pixel tolerance for coordinate matching (default: 0).
   * @param {number} options.photoMatchThreshold - Fraction of photo filenames that must match (default: 0.7).
   * @returns {Promise<object>} Merged data result.
   */
  static async mergeData (existingMapId, importedObject, ImageProcessorClass, mapStorage, options = {}) {
    console.log(`StorageExporterImporter: Merging data into map "${existingMapId}"...`)

    // Extract options with defaults
    const {
      duplicateStrategy = 'coordinates', // Coordinate-based is most reliable for PWA merge
      coordinateTolerance = 5, // 5px tolerance for coordinate matching
      photoMatchThreshold = 0.7 // 70% of photo filenames must match
    } = options

    console.log(`StorageExporterImporter: Using merge strategy: ${duplicateStrategy}`)

    // Fetch existing map data
    const existingMap = await mapStorage.getMap(existingMapId)
    if (!existingMap) {
      throw new Error(`Map "${existingMapId}" not found for merge.`)
    }

    const existingMarkers = await mapStorage.getMarkersForMap(existingMapId)
    const existingPhotos = await mapStorage.getPhotosForMap(existingMapId)

    // Fetch existing metadata definitions and values
    const existingGlobalDefs = await mapStorage.getMetadataDefinitionsByScope('global')
    const existingMapDefs = await mapStorage.getMetadataDefinitionsByScope(existingMapId)
    const existingMetadataDefinitions = [...existingGlobalDefs, ...existingMapDefs]

    const existingMapValues = await mapStorage.getMetadataValuesForEntity('map', existingMapId)
    const existingMarkerValues = []
    for (const marker of existingMarkers) {
      const values = await mapStorage.getMetadataValuesForEntity('marker', marker.id)
      existingMarkerValues.push(...values)
    }
    const existingPhotoValues = []
    for (const photo of existingPhotos) {
      const values = await mapStorage.getMetadataValuesForEntity('photo', photo.id)
      existingPhotoValues.push(...values)
    }
    const existingMetadataValues = [...existingMapValues, ...existingMarkerValues, ...existingPhotoValues]

    console.log(`StorageExporterImporter: Existing map has ${existingMarkers.length} markers, ${existingPhotos.length} photos, ${existingMetadataDefinitions.length} metadata definitions, ${existingMetadataValues.length} metadata values`)
    console.log(`StorageExporterImporter: Import has ${importedObject.markers.length} markers, ${importedObject.photos.length} photos, ${importedObject.metadataDefinitions?.length || 0} metadata definitions, ${importedObject.metadataValues?.length || 0} metadata values`)

    // Build export objects for merging
    const targetExport = {
      map: existingMap,
      markers: existingMarkers,
      photos: existingPhotos,
      metadataDefinitions: existingMetadataDefinitions,
      metadataValues: existingMetadataValues
    }

    const sourceExport = {
      map: importedObject.map,
      markers: importedObject.markers,
      photos: importedObject.photos,
      metadataDefinitions: importedObject.metadataDefinitions || [],
      metadataValues: importedObject.metadataValues || []
    }

    // Use merger library for intelligent duplicate detection
    const mergedExport = mergeExports(targetExport, sourceExport, {
      duplicateStrategy,
      coordinateTolerance,
      photoMatchThreshold,
      duplicatePhotoStrategy: 'skip',
      preserveTimestamps: true,
      mergeMetadata: true,
      metadataConflictStrategy: 'skip', // Skip duplicate definitions, keep existing
      idGenerator: (type) => mapStorage.generateId(type)
    })

    console.log(`StorageExporterImporter: After merge: ${mergedExport.markers.length} total markers, ${mergedExport.photos.length} total photos`)

    // Convert photos from base64 to Blob for storage
    const convertPhotoToBlob = async (photo) => {
      const newPhoto = { ...photo }

      if (newPhoto.imageData && typeof newPhoto.imageData === 'string') {
        newPhoto.imageData = await base64ToBlob(newPhoto.imageData, newPhoto.fileType)
      }

      if (newPhoto.thumbnailData && typeof newPhoto.thumbnailData === 'string') {
        newPhoto.thumbnailData = await base64ToBlob(newPhoto.thumbnailData, newPhoto.fileType)
      }

      if (!newPhoto.thumbnailData || !(newPhoto.thumbnailData instanceof Blob)) {
        newPhoto.thumbnailData = null
      }

      if (newPhoto.createdDate) newPhoto.createdDate = new Date(newPhoto.createdDate)

      return newPhoto
    }

    // Identify what changed
    const existingMarkerIds = new Set(existingMarkers.map(m => m.id))
    const existingPhotoIds = new Set(existingPhotos.map(p => p.id))

    const newMarkers = mergedExport.markers.filter(m => !existingMarkerIds.has(m.id))
    const updatedMarkers = mergedExport.markers.filter(m => {
      if (!existingMarkerIds.has(m.id)) return false
      const original = existingMarkers.find(em => em.id === m.id)
      // Check if photoIds changed
      return JSON.stringify(original?.photoIds?.sort()) !== JSON.stringify(m.photoIds?.sort())
    })
    const newPhotos = await Promise.all(
      mergedExport.photos
        .filter(p => !existingPhotoIds.has(p.id))
        .map(p => convertPhotoToBlob(p))
    )

    console.log(`StorageExporterImporter: Identified ${newMarkers.length} new markers to add`)
    console.log(`StorageExporterImporter: Identified ${updatedMarkers.length} markers to update`)
    console.log(`StorageExporterImporter: Identified ${newPhotos.length} new photos to add`)

    if (newMarkers.length > 0) {
      console.log('StorageExporterImporter: New marker IDs:', newMarkers.map(m => m.id).join(', '))
    }

    // Save changes to storage
    for (const marker of updatedMarkers) {
      // Ensure mapId is correct
      marker.mapId = existingMapId
      await mapStorage.saveMarker(marker)
    }

    for (const marker of newMarkers) {
      // Fix mapId to point to the existing map we're merging into
      marker.mapId = existingMapId

      // Ensure dates are Date objects
      if (typeof marker.createdDate === 'string') {
        marker.createdDate = new Date(marker.createdDate)
      }
      if (typeof marker.lastModified === 'string') {
        marker.lastModified = new Date(marker.lastModified)
      }
      await mapStorage.saveMarker(marker)
    }

    for (const photo of newPhotos) {
      await mapStorage.savePhoto(photo)
    }

    // Save merged metadata
    const existingDefIds = new Set(existingMetadataDefinitions.map(d => d.id))
    const newDefinitions = (mergedExport.metadataDefinitions || []).filter(d => !existingDefIds.has(d.id))

    const existingValueIds = new Set(existingMetadataValues.map(v => v.id))
    const newValues = (mergedExport.metadataValues || []).filter(v => !existingValueIds.has(v.id))

    for (const definition of newDefinitions) {
      // Check for duplicates by name for global definitions
      if (definition.scope === 'global') {
        const existingByName = existingMetadataDefinitions.find(
          d => d.scope === 'global' && d.name.toLowerCase() === definition.name.toLowerCase()
        )
        if (existingByName) {
          console.log(`StorageExporterImporter: Skipping duplicate global metadata definition: ${definition.name}`)
          continue
        }
      }
      await mapStorage.saveMetadataDefinition(definition)
    }

    for (const value of newValues) {
      await mapStorage.saveMetadataValue(value)
    }

    console.log(
      `StorageExporterImporter: Merge complete using ${duplicateStrategy} strategy. ` +
      `Added ${newMarkers.length} markers, ${newPhotos.length} photos, ${newDefinitions.length} metadata definitions, ${newValues.length} metadata values. ` +
      `Updated ${updatedMarkers.length} markers.`
    )

    return {
      map: existingMap,
      markers: mergedExport.markers,
      photos: mergedExport.photos,
      metadataDefinitions: mergedExport.metadataDefinitions,
      metadataValues: mergedExport.metadataValues,
      stats: {
        newMarkers: newMarkers.length,
        updatedMarkers: updatedMarkers.length,
        newPhotos: newPhotos.length,
        newMetadataDefinitions: newDefinitions.length,
        newMetadataValues: newValues.length
      }
    }
  }

  /**
   * Get markers grouped by day for a map.
   * Uses lib/snapspot-data/splitter.js groupMarkersByDay function.
   *
   * @param {string} mapId - The map ID.
   * @param {MapStorage} mapStorage - Storage instance.
   * @returns {Promise<Object<string, Array<object>>>} Markers grouped by date.
   */
  static async getMarkersGroupedByDay (mapId, mapStorage) {
    console.log(`StorageExporterImporter: Grouping markers for map ${mapId} by day...`)
    const markers = await mapStorage.getMarkersForMap(mapId)

    // Use the library function
    const grouped = groupMarkersByDay(markers)

    console.log(`StorageExporterImporter: Found ${Object.keys(grouped).length} days with markers.`)
    return grouped
  }

  /**
   * Get secondary map matches based on metadata when imageHash doesn't match.
   *
   * @param {object} importedMap - The imported map object.
   * @param {MapStorage} mapStorage - Storage instance.
   * @param {number} [tolerance=0.05] - Matching tolerance (5%).
   * @returns {Promise<Array>} - Potential matching maps.
   */
  static async getSecondaryMapMatches (importedMap, mapStorage, tolerance = 0.05) {
    const allMaps = await mapStorage.getAllMaps()
    const matchedMaps = []

    for (const map of allMaps) {
      // Check dimension similarity
      const widthMatch = importedMap.width && map.width &&
        Math.abs(map.width - importedMap.width) / map.width <= tolerance
      const heightMatch = importedMap.height && map.height &&
        Math.abs(map.height - importedMap.height) / map.height <= tolerance

      // Check file size similarity
      const sizeMatch = importedMap.fileSize && map.fileSize &&
        Math.abs(map.fileSize - importedMap.fileSize) / map.fileSize <= tolerance

      // Check name similarity
      const nameMatch = importedMap.fileName && map.fileName &&
        (importedMap.fileName.toLowerCase().includes(map.fileName.toLowerCase()) ||
          map.fileName.toLowerCase().includes(importedMap.fileName.toLowerCase()))

      // Check aspect ratio similarity
      const importedAspectRatio = importedMap.width / importedMap.height
      const existingAspectRatio = map.width / map.height
      const aspectRatioMatch = importedMap.width && importedMap.height &&
        map.width && map.height &&
        Math.abs(importedAspectRatio - existingAspectRatio) / importedAspectRatio <= tolerance

      // Match if dimensions match AND (size OR name OR aspect ratio)
      if ((widthMatch && heightMatch) && (sizeMatch || nameMatch || aspectRatioMatch)) {
        const markers = await mapStorage.getMarkersForMap(map.id)
        matchedMaps.push({
          ...map,
          markerCount: markers.length
        })
      }
    }

    return matchedMaps
  }

  /**
   * Helper to save imported data to storage.
   * @private
   */
  static async _saveImportedData (app, map, markers, photos, metadataDefinitions = [], metadataValues = []) {
    await app.storage.saveMap(map)
    for (const marker of markers) {
      await app.storage.saveMarker(marker)
    }
    for (const photo of photos) {
      await app.storage.savePhoto(photo)
    }

    // Save metadata definitions (check for conflicts to avoid duplicates)
    for (const definition of metadataDefinitions) {
      // For global definitions, check by name to avoid duplicates
      if (definition.scope === 'global') {
        const allGlobalDefs = await app.storage.getMetadataDefinitionsByScope('global')
        const existingByName = allGlobalDefs.find(
          d => d.name.toLowerCase() === definition.name.toLowerCase()
        )
        if (existingByName) {
          console.log(`StorageExporterImporter: Skipping duplicate global metadata definition: ${definition.name}`)
          continue
        }
      }
      // For map-specific, check by ID (already has new map ID from processing)
      const existing = await app.storage.getMetadataDefinition(definition.id)
      if (!existing) {
        await app.storage.saveMetadataDefinition(definition)
      } else {
        console.log(`StorageExporterImporter: Skipping duplicate metadata definition: ${definition.name}`)
      }
    }

    // Save metadata values
    for (const value of metadataValues) {
      await app.storage.saveMetadataValue(value)
    }
  }

  /**
   * Helper to delete existing map and import new data (for replace action).
   * @private
   */
  static async _deleteMapAndImportNew (app, existingMapId, newMapData, newMarkersData, newPhotosData, metadataDefinitions = [], metadataValues = []) {
    await app.storage.deleteMap(existingMapId)
    await app.storage.saveMap(newMapData)

    for (const marker of newMarkersData) {
      await app.storage.saveMarker(marker)
    }

    for (const photo of newPhotosData) {
      await app.storage.savePhoto(photo)
    }

    // Save metadata definitions (check for conflicts)
    for (const definition of metadataDefinitions) {
      // For global definitions, check by name to avoid duplicates
      if (definition.scope === 'global') {
        const allGlobalDefs = await app.storage.getMetadataDefinitionsByScope('global')
        const existingByName = allGlobalDefs.find(
          d => d.name.toLowerCase() === definition.name.toLowerCase()
        )
        if (existingByName) {
          console.log(`StorageExporterImporter: Skipping duplicate global metadata definition: ${definition.name}`)
          continue
        }
      }
      // For map-specific, check by ID
      const existing = await app.storage.getMetadataDefinition(definition.id)
      if (!existing) {
        await app.storage.saveMetadataDefinition(definition)
      } else {
        console.log(`StorageExporterImporter: Skipping duplicate metadata definition: ${definition.name}`)
      }
    }

    // Save metadata values
    for (const value of metadataValues) {
      await app.storage.saveMetadataValue(value)
    }
  }

  /**
   * Show import decision modal to user.
   * @private
   */
  static async _showImportDecisionModal (app, importResult) {
    const preparedExistingMaps = await app.imageProcessor.prepareMapsForDisplay(
      importResult.existingMaps || [],
      app.thumbnailCache,
      app.imageCompressionSettings
    )

    const preparedSecondaryMatches = await app.imageProcessor.prepareMapsForDisplay(
      importResult.secondaryMatches || [],
      app.thumbnailCache,
      app.imageCompressionSettings
    )

    return await app.modalManager.createImportDecisionModal(
      preparedExistingMaps,
      preparedSecondaryMatches
    )
  }

  /**
   * Handle file import (wrapper for app integration).
   *
   * @param {object} app - SnapSpotApp instance.
   * @param {File} file - The JSON file to import.
   * @returns {Promise<object|null>} Imported map or null if cancelled.
   */
  static async handleImportFile (app, file) {
    app.updateAppStatus(`Importing data from "${file.name}"...`, 'info', true)

    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
          (async () => {
            try {
              const jsonData = e.target.result

              const importResult = await this.importData(
                jsonData,
                app.imageProcessor,
                app.storage
              )

              if (importResult.importType === 'decision_required') {
                const userChoice = await this._showImportDecisionModal(app, importResult)

                if (userChoice) {
                  const { action, selectedMapId } = userChoice
                  let finalMap = null
                  let finalMarkers = []
                  let finalPhotos = []
                  let successMessage = ''

                  if (action === 'merge') {
                    app.updateAppStatus(`Merging data into map "${selectedMapId}"...`, 'info', true)
                    const mergedData = await this.mergeData(
                      selectedMapId,
                      importResult.importObject,
                      app.imageProcessor,
                      app.storage
                    )
                    finalMap = mergedData.map
                    finalMarkers = mergedData.markers
                    successMessage = `Data merged into map '${finalMap.name}' successfully.`
                  } else if (action === 'replace') {
                    app.updateAppStatus(`Replacing map "${selectedMapId}"...`, 'info', true)
                    const processedNewData = await this._processImportedDataForNewMap(
                      importResult.importObject,
                      app.imageProcessor
                    )
                    finalMap = { ...processedNewData.map, id: selectedMapId }
                    finalMarkers = processedNewData.markers.map(m => ({ ...m, mapId: selectedMapId }))
                    finalPhotos = processedNewData.photos

                    await this._deleteMapAndImportNew(
                      app,
                      selectedMapId,
                      finalMap,
                      finalMarkers,
                      finalPhotos,
                      processedNewData.metadataDefinitions || [],
                      processedNewData.metadataValues || []
                    )
                    successMessage = `Map '${finalMap.name}' replaced successfully.`
                  } else if (action === 'new') {
                    app.updateAppStatus('Importing as new map...', 'info', true)
                    const processedNewData = await this._processImportedDataForNewMap(
                      importResult.importObject,
                      app.imageProcessor
                    )
                    finalMap = processedNewData.map
                    finalMarkers = processedNewData.markers
                    finalPhotos = processedNewData.photos

                    await this._saveImportedData(
                      app,
                      finalMap,
                      finalMarkers,
                      finalPhotos,
                      processedNewData.metadataDefinitions || [],
                      processedNewData.metadataValues || []
                    )
                    successMessage = `Map '${finalMap.name}' imported as new successfully.`
                  }

                  if (finalMap) {
                    await app.loadMaps()
                    app.updateAppStatus(successMessage, 'success')
                    if (finalMap.id) {
                      await app.switchToMap(finalMap.id)
                    }
                    resolve(finalMap)
                  } else {
                    reject(new Error('Import operation failed.'))
                  }
                } else {
                  app.updateAppStatus('Import cancelled.', 'info')
                  resolve(null)
                }
              } else {
                // New import (no decision needed)
                const { map, markers, photos, metadataDefinitions = [], metadataValues = [] } = importResult
                await this._saveImportedData(app, map, markers, photos, metadataDefinitions, metadataValues)
                await app.loadMaps()
                app.updateAppStatus(`Data from "${file.name}" imported successfully.`, 'success')
                if (map?.id) {
                  await app.switchToMap(map.id)
                }
                resolve(map)
              }
            } catch (importError) {
              console.error('StorageExporterImporter: Import error:', importError)
              alert(`Error processing import: ${importError.message}`)
              app.updateAppStatus('Import failed', 'error')
              reject(importError)
            }
          })()
        }

        reader.onerror = (e) => {
          console.error('StorageExporterImporter: File read error:', e)
          alert('Error reading file.')
          app.updateAppStatus('File read failed', 'error')
          reject(new Error('File read failed'))
        }

        reader.readAsText(file)
      })
    } catch (error) {
      console.error('StorageExporterImporter: Unexpected error:', error)
      alert('Unexpected error during import setup.')
      app.updateAppStatus('Import setup failed', 'error')
      return Promise.reject(error)
    }
  }
}
