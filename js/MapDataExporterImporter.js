// js/MapDataExporterImporter.js

/* global Blob, URL, crypto, alert, FileReader, Image */
import { StorageExporterImporter } from '../lib/snapspot-storage/exporter-importer.js'
import { HtmlReportGenerator } from './HtmlReportGenerator.js'
import { ImageProcessor } from './imageProcessor.js'

/**
 * @deprecated This class is deprecated and will be removed in Phase 4.
 * Use StorageExporterImporter from lib/snapspot-storage/exporter-importer.js instead.
 *
 * This wrapper exists for backward compatibility during the refactoring process.
 * All export/import operations now delegate to the shared library implementation.
 */
export class MapDataExporterImporter {
  // ===== Delegated methods (wrapped from StorageExporterImporter) =====

  /**
   * Exports a map's data (map, markers, photos) to a JSON file(s).
   * @deprecated Use StorageExporterImporter.exportData() instead
   */
  static async exportData (...args) {
    if (!this._exportWarningShown) {
      console.warn('DEPRECATED: MapDataExporterImporter is deprecated. Use StorageExporterImporter from lib/snapspot-storage instead.')
      this._exportWarningShown = true
    }
    return StorageExporterImporter.exportData(...args)
  }

  /**
   * Imports map data from a JSON string.
   * @deprecated Use StorageExporterImporter.importData() instead
   */
  static async importData (...args) {
    return StorageExporterImporter.importData(...args)
  }

  /**
   * Merge imported data into an existing map.
   * @deprecated Use StorageExporterImporter.mergeData() instead
   */
  static async mergeData (...args) {
    return StorageExporterImporter.mergeData(...args)
  }

  /**
   * Get markers grouped by day for a map.
   * @deprecated Use StorageExporterImporter.getMarkersGroupedByDay() instead
   */
  static async getMarkersGroupedByDay (...args) {
    return StorageExporterImporter.getMarkersGroupedByDay(...args)
  }

  /**
   * Get secondary map matches based on metadata when imageHash doesn't match.
   * @deprecated Use StorageExporterImporter.getSecondaryMapMatches() instead
   */
  static async getSecondaryMapMatches (...args) {
    return StorageExporterImporter.getSecondaryMapMatches(...args)
  }

  /**
   * Handle file import (wrapper for app integration).
   * @deprecated Use StorageExporterImporter.handleImportFile() instead
   */
  static async handleImportFile (...args) {
    return StorageExporterImporter.handleImportFile(...args)
  }

  // ===== Methods kept for app-specific functionality (not in StorageExporterImporter) =====

  /**
   * Handles the upload of a new map image file.
   * This is app-specific and remains in this file.
   *
   * @param {object} app - The SnapSpotApp instance.
   * @param {string} mapData - The base64-encoded map image data.
   * @param {File} originalFile - The original uploaded file.
   * @returns {Promise<object>} The created map object.
   */
  static async handleMapUpload (app, mapData, originalFile) {
    console.log('MapDataExporterImporter: Processing map image...')

    try {
      app.updateAppStatus('Processing and saving map image...')

      // Process the image for storage
      // Skip compression for SVG files to preserve vector quality
      const processedImageBlob = (originalFile.type === 'image/svg+xml')
        ? originalFile
        : await app.imageProcessor.processImage(originalFile, {
          maxWidth: app.imageCompressionSettings.map.maxWidth,
          maxHeight: app.imageCompressionSettings.map.maxHeight,
          quality: app.imageCompressionSettings.map.quality,
          outputFormat: originalFile.type.startsWith('image/') ? originalFile.type : 'image/jpeg'
        })

      console.log('Original size:', originalFile.size, 'Processed size:', processedImageBlob.size)

      // Create map object
      const map = {
        id: crypto.randomUUID(),
        name: originalFile.name.replace(/\.[^/.]+$/, ''),
        fileName: originalFile.name,
        fileType: processedImageBlob.type,
        fileSize: processedImageBlob.size,
        createdDate: new Date(),
        lastModified: new Date(),
        imageData: processedImageBlob
      }

      // Get dimensions
      if (originalFile.type === 'image/svg+xml') {
        // For SVG, dimensions should have been extracted already
        map.width = mapData.width
        map.height = mapData.height
      } else {
        const dimensions = await this._getImageDimensions(processedImageBlob)
        map.width = dimensions.width
        map.height = dimensions.height
      }

      // Calculate imageHash
      try {
        const arrayBuffer = await map.imageData.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        map.imageHash = this._arrayBufferToHex(hashBuffer)
        console.log(`MapDataExporterImporter: Calculated imageHash: ${map.imageHash}`)
      } catch (error) {
        console.error('MapDataExporterImporter: Failed to calculate imageHash:', error)
      }

      // Save to storage
      const savedMap = await app.storage.addMap(map)
      console.log('Map saved successfully:', savedMap.id)

      // Store for immediate rendering
      app.uploadedFiles.set(savedMap.id, processedImageBlob)

      // Reload maps list
      await app.loadMaps()

      // Update UI
      app.checkWelcomeScreen()

      // Display the map if it's active
      if (map.isActive || app.mapsList.length === 1) {
        await app.displayMap(savedMap)
      }

      app.showNotification(`Map "${savedMap.name}" uploaded successfully!`, 'success')
      app.updateAppStatus(`Map uploaded: ${savedMap.name}`)

      console.log('Map upload completed successfully')
      return savedMap
    } catch (error) {
      console.error('Map upload failed:', error)
      app.showErrorMessage('Map Upload Error', `Failed to save map: ${error.message}`)
      throw error
    } finally {
      app.hideLoading()
    }
  }

  /**
   * Get image dimensions from a Blob.
   * @private
   */
  static async _getImageDimensions (imageBlob) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(imageBlob)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  /**
   * Exports an HTML report for a map.
   * This is app-specific and remains in this file.
   *
   * @param {object} app - The SnapSpotApp instance.
   * @param {string} mapId - The ID of the map to export.
   * @returns {Promise<void>}
   */
  static async exportHtmlReport (app, mapId) {
    console.log(`MapDataExporterImporter: Generating HTML report for map "${mapId}"...`)

    app.modalManager.closeAllModals()
    await new Promise(resolve => setTimeout(resolve, 100))
    app.updateAppStatus(`Generating HTML report for map ${mapId}...`)

    try {
      const map = await app.storage.getMap(mapId)
      if (!map) {
        throw new Error(`Map "${mapId}" not found`)
      }

      const markers = await app.storage.getMarkersForMap(mapId)
      const allPhotos = []
      const photoPromises = []

      for (const marker of markers) {
        const markerPhotos = await app.storage.getPhotosForMarker(marker.id)
        markerPhotos.forEach(photo => {
          photoPromises.push(
            app.imageProcessor.blobToBase64(photo.imageData)
              .then(dataUrl => {
                photo.imageDataUrl = dataUrl
                return photo
              })
          )
        })
      }

      const processedPhotos = await Promise.all(photoPromises)
      allPhotos.push(...processedPhotos)
      allPhotos.sort((a, b) => a.fileName.localeCompare(b.fileName))

      await HtmlReportGenerator.generateReport(map, markers, allPhotos, app.imageProcessor)

      app.updateAppStatus(`HTML report for map "${map.name}" generated successfully.`, 'success')
    } catch (error) {
      console.error('MapDataExporterImporter: Error generating HTML report:', error)
      alert('Error generating HTML report. Check console for details.')
      app.updateAppStatus('HTML report generation failed', 'error')
      throw error
    }
  }

  /**
   * Exports a map as JSON (used by app's export menu).
   * This wraps exportData with app context.
   *
   * @param {object} app - The SnapSpotApp instance.
   * @param {string} mapId - The ID of the map to export.
   * @returns {Promise<void>}
   */
  static async exportJsonMap (app, mapId) {
    console.log(`MapDataExporterImporter: Preparing JSON export for map "${mapId}"...`)

    app.modalManager.closeAllModals()
    await new Promise(resolve => setTimeout(resolve, 100))
    app.updateAppStatus(`Preparing data for JSON export for map ${mapId}...`)

    try {
      const map = await app.storage.getMap(mapId)
      if (!map) {
        throw new Error(`Map "${mapId}" not found`)
      }

      const allMarkers = await app.storage.getMarkersForMap(mapId)
      const allPhotos = []
      for (const marker of allMarkers) {
        const markerPhotos = await app.storage.getPhotosForMarker(marker.id)
        allPhotos.push(...markerPhotos)
      }

      // Group markers by day for modal options
      const groupedMarkersByDay = await this.getMarkersGroupedByDay(mapId, app.storage)

      app.updateAppStatus('Ready to choose export options.')

      // Show export decision modal
      const exportDecision = await app.modalManager.createExportDecisionModal(map, groupedMarkersByDay)

      if (!exportDecision) {
        app.updateAppStatus('JSON export cancelled.', 'info')
        return
      }

      app.updateAppStatus('Exporting map data...')

      if (exportDecision.action === 'exportComplete') {
        await this.exportData(map, allMarkers, allPhotos, app.imageProcessor, {}, app.storage)
        app.updateAppStatus(`JSON data for map "${map.name}" exported completely.`, 'success')
      } else if (exportDecision.action === 'exportByDays') {
        await this.exportData(
          map,
          allMarkers,
          allPhotos,
          app.imageProcessor,
          {
            datesToExport: exportDecision.selectedDates,
            splitByDate: exportDecision.exportAsSeparateFiles
          },
          app.storage
        )
        const numDates = exportDecision.selectedDates.length
        const exportType = exportDecision.exportAsSeparateFiles ? 'separate files' : 'a single file'
        app.updateAppStatus(`JSON data for map "${map.name}" for ${numDates} day(s) exported as ${exportType}.`, 'success')
      }
    } catch (error) {
      console.error('MapDataExporterImporter: Error during map export process:', error)
      alert(`Error exporting map: ${error.message}`)
      app.updateAppStatus('JSON export failed', 'error')
      throw error
    }
  }

  /**
   * Convert ArrayBuffer to hexadecimal string.
   * @private
   */
  static _arrayBufferToHex (buffer) {
    const byteArray = new Uint8Array(buffer)
    const hexParts = []
    for (let i = 0; i < byteArray.length; i++) {
      const hex = byteArray[i].toString(16).padStart(2, '0')
      hexParts.push(hex)
    }
    return hexParts.join('')
  }
}

// Track if we've shown the deprecation warning
MapDataExporterImporter._exportWarningShown = false
