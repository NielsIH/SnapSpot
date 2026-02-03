/**
 * Map Migrator Logic
 *
 * Handles transformation calculation, preview rendering, and export generation.
 */

/* global FileReader, confirm, alert, prompt */

import { calculateAffineMatrix, applyTransform } from '../../core/transformation/affine-transform.js'
import { calculateRMSE, detectAnomalies } from '../../core/transformation/transform-validator.js'
import { buildExport } from '../../lib/snapspot-data/writer.js'
import { mergeExports, getMergeStatistics } from '../../lib/snapspot-data/merger.js'

/**
 * Map Migrator - Main orchestration class
 */
export class MapMigrator {
  /**
   * Create a new map migrator
   * @param {UIController} uiController - UI controller instance
   */
  constructor (uiController) {
    this.ui = uiController

    // Get UI elements
    this._initializeUIElements()

    // Set up event listeners
    this._setupEventListeners()

    // Store last calculated RMSE for smart tolerance calculation
    this.lastCalculatedRMSE = null
  }

  /**
   * Initialize DOM element references
   * @private
   */
  _initializeUIElements () {
    this.calculateBtn = document.getElementById('calculate-btn')
    this.previewBtn = document.getElementById('preview-btn')
    this.exportBtn = document.getElementById('export-btn')

    this.metricsPanel = document.getElementById('metrics')
    this.rmseValue = document.getElementById('rmse-value')
    this.scaleX = document.getElementById('scale-x')
    this.scaleY = document.getElementById('scale-y')
    this.rotation = document.getElementById('rotation')
    this.warningsSection = document.getElementById('warnings')
    this.warningsList = document.getElementById('warnings-list')
    this.matrixDisplay = document.getElementById('matrix-display')
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners () {
    this.calculateBtn.addEventListener('click', () => this.calculateTransformation())
    this.previewBtn.addEventListener('click', () => this.togglePreview())
    this.exportBtn.addEventListener('click', () => this.generateMigratedExport())

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._onKeyDown(e))

    // Listen for state changes from UI controller
    this.ui.onStateReset = () => this._onStateReset()
  }

  /**
   * Handle state reset from UI controller
   * @private
   */
  _onStateReset () {
    // Reset preview button text
    this.previewBtn.textContent = 'Preview Transformed Markers'
  }

  /**
   * Calculate transformation matrix
   */
  async calculateTransformation () {
    try {
      const state = this.ui.getState()

      // Validate we have enough points
      if (state.referencePairs.length < 3) {
        this._showError('Not enough points', 'Please add at least 3 reference point pairs.')
        return
      }

      // Extract source and target points and convert from normalized (0-1) to pixels
      const sourceMapWidth = state.sourceMap.width
      const sourceMapHeight = state.sourceMap.height
      const targetMapWidth = state.targetMap.width
      const targetMapHeight = state.targetMap.height

      const sourcePoints = state.referencePairs.map(pair => ({
        x: pair.source.x * sourceMapWidth,
        y: pair.source.y * sourceMapHeight
      }))

      const targetPoints = state.referencePairs.map(pair => ({
        x: pair.target.x * targetMapWidth,
        y: pair.target.y * targetMapHeight
      }))

      // Calculate transformation matrix (in pixel space)
      const result = calculateAffineMatrix(sourcePoints, targetPoints)
      const matrix = result.matrix

      // Calculate RMSE (convert pairs to pixel space for validation)
      const pixelPairs = state.referencePairs.map((pair, i) => ({
        source: sourcePoints[i],
        target: targetPoints[i]
      }))
      const rmse = calculateRMSE(pixelPairs, matrix)

      // Store RMSE for smart tolerance calculation in merge mode
      this.lastCalculatedRMSE = rmse

      // Detect anomalies
      const anomalies = detectAnomalies(matrix)

      // Store matrix in state
      this.ui.setTransformMatrix(matrix)

      // Display metrics
      this._displayMetrics(matrix, rmse, anomalies, result.determinant)
    } catch (error) {
      console.error('Error calculating transformation:', error)
      this._showError('Transformation Failed', error.message)
    }
  }

  /**
   * Display transformation metrics
   * @private
   */
  _displayMetrics (matrix, rmseData, anomalies, determinant) {
    // Show metrics panel
    this.metricsPanel.classList.remove('hidden')

    // Calculate metric values from matrix {a, b, c, d, e, f}
    const scaleX = Math.sqrt(matrix.a ** 2 + matrix.c ** 2)
    const scaleY = Math.sqrt(matrix.b ** 2 + matrix.d ** 2)
    const rotation = Math.atan2(matrix.c, matrix.a) * (180 / Math.PI)

    // Display RMSE
    const rmseClass = rmseData < 5 ? 'good' : rmseData < 15 ? 'warning' : 'error'
    this.rmseValue.innerHTML = `<span class="${rmseClass}">${rmseData.toFixed(2)}px</span>`

    // Display scale
    this.scaleX.textContent = scaleX.toFixed(4)
    this.scaleY.textContent = scaleY.toFixed(4)

    // Display rotation
    this.rotation.textContent = `${rotation.toFixed(2)}°`

    // Display matrix
    this.matrixDisplay.textContent = this._formatMatrix(matrix)

    // Display warnings
    const warnings = []

    if (rmseData > 15) {
      warnings.push('High RMSE error - point placement may be inaccurate')
    }

    if (Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY) > 0.1) {
      warnings.push('Unequal scaling detected - maps may have different aspect ratios')
    }

    const shear = matrix.b + matrix.c
    if (Math.abs(shear) > 0.1) {
      warnings.push('Shear transformation detected - maps may be skewed')
    }

    if (anomalies.hasNegativeDeterminant) {
      warnings.push('Transformation includes reflection/mirroring')
    }

    if (anomalies.hasExtremeScale) {
      warnings.push('Extreme scaling detected - verify your reference points')
    }

    if (anomalies.hasExtremeShear) {
      warnings.push('Extreme shear detected - maps may be heavily skewed')
    }

    if (anomalies.isDegenerate) {
      warnings.push('Degenerate transformation - points may be collinear')
    }

    if (warnings.length > 0) {
      this.warningsSection.style.display = 'block'
      this.warningsList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('')
    } else {
      this.warningsSection.style.display = 'none'
    }
  }

  /**
   * Format matrix for display
   * @private
   */
  _formatMatrix (matrix) {
    // Format affine matrix {a, b, c, d, e, f} as:
    // [a  b  e]
    // [c  d  f]
    // [0  0  1]
    return [
      `[${matrix.a.toFixed(6).padStart(12)}, ${matrix.b.toFixed(6).padStart(12)}, ${matrix.e.toFixed(6).padStart(12)}]`,
      `[${matrix.c.toFixed(6).padStart(12)}, ${matrix.d.toFixed(6).padStart(12)}, ${matrix.f.toFixed(6).padStart(12)}]`,
      '[           0,            0,            1]'
    ].join('\n')
  }

  /**
   * Toggle preview of transformed markers
   */
  togglePreview () {
    const state = this.ui.getState()

    if (!state.transformMatrix) {
      this._showError('No transformation', 'Calculate transformation first.')
      return
    }

    const isActive = state.previewActive

    if (isActive) {
      // Hide preview
      this.ui.setPreviewActive(false)
      this.previewBtn.textContent = 'Preview Transformed Markers'
      this.ui.redrawTarget()
    } else {
      // Show preview
      this.ui.setPreviewActive(true)
      this.previewBtn.textContent = 'Hide Preview'
      this._renderPreview()
    }
  }

  /**
   * Render preview of transformed markers
   * @private
   */
  _renderPreview () {
    const state = this.ui.getState()
    const renderer = this.ui.getTargetRenderer()

    // Redraw base map
    this.ui.redrawTarget()

    // Transform and draw all markers
    const markers = state.sourceMap.markers
    const matrix = state.transformMatrix
    const sourceMapWidth = state.sourceMap.width
    const sourceMapHeight = state.sourceMap.height
    const targetImageWidth = state.targetMap.width
    const targetImageHeight = state.targetMap.height

    markers.forEach(marker => {
      // Convert from normalized (0-1) to source pixel coordinates
      const sourcePixel = {
        x: marker.x * sourceMapWidth,
        y: marker.y * sourceMapHeight
      }

      // Transform marker position (result is in target pixel coordinates)
      const transformed = applyTransform(sourcePixel, matrix)

      // Draw transformed marker
      renderer.drawMarker(transformed.x, transformed.y, {
        color: 'rgba(255, 0, 0, 0.5)',
        size: 8,
        opacity: 0.5
      })
    })

    // Draw error vectors for reference points
    state.referencePairs.forEach((pair, index) => {
      // Convert source from normalized to pixels
      const sourcePixel = {
        x: pair.source.x * sourceMapWidth,
        y: pair.source.y * sourceMapHeight
      }

      // Transform source point
      const transformed = applyTransform(sourcePixel, matrix)

      // Convert target from normalized to pixels
      const targetCanvasX = pair.target.x * targetImageWidth
      const targetCanvasY = pair.target.y * targetImageHeight

      // Draw error line
      renderer.drawLine(
        transformed.x,
        transformed.y,
        targetCanvasX,
        targetCanvasY,
        {
          color: 'rgba(255, 0, 0, 0.7)',
          width: 2
        }
      )
    })

    console.log('Preview rendered:', markers.length, 'markers')
  }

  /**
   * Generate migrated export file
   */
  async generateMigratedExport () {
    try {
      const state = this.ui.getState()

      if (!state.transformMatrix) {
        this._showError('No transformation', 'Calculate transformation first.')
        return
      }

      // Show progress
      this.exportBtn.disabled = true
      this.exportBtn.textContent = 'Generating...'

      // Clone source export
      const sourceExport = state.sourceExport
      const matrix = state.transformMatrix

      // Transform all markers
      // Note: markers in state are normalized (0-1), need to convert to pixels for transformation
      const transformedMarkers = state.sourceMap.markers.map((marker, index) => {
        // Convert from normalized (0-1) to source pixel coordinates
        const sourcePixel = {
          x: marker.x * state.sourceMap.width,
          y: marker.y * state.sourceMap.height
        }

        // Apply transformation (result is in target pixel coordinates)
        const transformed = applyTransform(sourcePixel, matrix)

        // Clamp to target map bounds
        const clampedX = Math.max(0, Math.min(state.targetMap.width, transformed.x))
        const clampedY = Math.max(0, Math.min(state.targetMap.height, transformed.y))

        // Get original marker from source export (by index, which should match)
        const originalMarker = sourceExport.markers[index] || {}

        // Preserve all original marker properties, only update coordinates
        return {
          ...originalMarker,
          x: Math.round(clampedX),
          y: Math.round(clampedY),
          // Ensure required fields exist
          photoIds: originalMarker.photoIds || [],
          label: originalMarker.label || '',
          createdDate: originalMarker.createdDate,
          lastModified: new Date().toISOString()
        }
      })

      // Check for out-of-bounds markers
      const outOfBounds = transformedMarkers.filter((m, i) => {
        const sourcePixel = {
          x: state.sourceMap.markers[i].x * state.sourceMap.width,
          y: state.sourceMap.markers[i].y * state.sourceMap.height
        }
        const orig = applyTransform(sourcePixel, matrix)
        return orig.x < 0 || orig.x > state.targetMap.width ||
               orig.y < 0 || orig.y > state.targetMap.height
      })

      if (outOfBounds.length > 0) {
        const proceed = confirm(
          `Warning: ${outOfBounds.length} marker(s) fall outside the target map bounds and will be clamped.\n\n` +
          'Do you want to proceed with the export?'
        )
        if (!proceed) {
          this.exportBtn.disabled = false
          this.exportBtn.textContent = 'Generate Export File'
          return
        }
      }

      let exportData
      let filename

      // Check if target is an export (merge mode) or just an image (replace mode)
      if (state.targetMap.isExport && state.targetExport) {
        // MERGE MODE: Target is an export, merge transformed markers with existing markers
        console.log('Target is an export - using merge mode')

        // Create a temporary export with transformed markers
        const transformedExport = {
          map: sourceExport.map,
          markers: transformedMarkers,
          photos: sourceExport.photos || [],
          metadata: {
            sourceApp: 'SnapSpot Map Migrator',
            exportDate: new Date().toISOString()
          }
        }

        // Calculate smart tolerance based on transformation RMSE
        const rmseValue = this.lastCalculatedRMSE || 5
        const recommendedTolerance = Math.max(5, Math.ceil(rmseValue * 2.5))

        // Ask user for merge strategy
        const strategyChoice = prompt(
          'Choose merge strategy:\n\n' +
          '1 - Add all as new markers (no duplicate detection) [DEFAULT]\n' +
          '2 - Smart duplicate detection (photos → labels → coordinates)\n' +
          '3 - Detect by photo filenames (70% match threshold)\n' +
          '4 - Detect by label/description (case-insensitive)\n' +
          '5 - Detect by coordinates (uses calculated tolerance)\n\n' +
          `Note: Transformation RMSE = ${rmseValue.toFixed(2)}px\n` +
          `Recommended coordinate tolerance = ${recommendedTolerance}px\n\n` +
          'Enter 1-5 (default is 1):',
          '1'
        )

        let duplicateStrategy = 'none'
        let coordinateTolerance = recommendedTolerance
        let strategyName = 'Add all as new'

        if (strategyChoice === '2') {
          duplicateStrategy = 'smart'
          strategyName = 'Smart (photos → labels → coordinates)'
        } else if (strategyChoice === '3') {
          duplicateStrategy = 'photos'
          strategyName = 'Detect by photo filenames (70% match)'
        } else if (strategyChoice === '4') {
          duplicateStrategy = 'label'
          strategyName = 'Detect by label/description'
        } else if (strategyChoice === '5') {
          duplicateStrategy = 'coordinates'
          const customTolerance = prompt(
            `Enter coordinate tolerance in pixels:\n(Recommended: ${recommendedTolerance}px based on RMSE)`,
            recommendedTolerance.toString()
          )
          coordinateTolerance = parseInt(customTolerance) || recommendedTolerance
          strategyName = `Detect by coordinates (${coordinateTolerance}px tolerance)`
        }

        // Get merge statistics with chosen strategy
        const stats = getMergeStatistics(state.targetExport, transformedExport, {
          duplicateStrategy,
          coordinateTolerance
        })

        // Show merge preview to user
        const mergeMessage = `Merge Preview (${strategyName}):\n\n` +
          `Transformed markers: ${transformedMarkers.length}\n` +
          `Target markers: ${state.targetExport.markers.length}\n\n` +
          `Will add ${stats.newMarkers} new marker(s)\n` +
          `Will merge ${stats.duplicateMarkers} duplicate marker(s)\n` +
          `Will add ${stats.newPhotos} new photo(s)\n\n` +
          'Continue with merge?'

        const proceedWithMerge = confirm(mergeMessage)
        if (!proceedWithMerge) {
          this.exportBtn.disabled = false
          this.exportBtn.textContent = 'Generate Export File'
          return
        }

        // Perform merge with chosen strategy
        exportData = mergeExports(state.targetExport, transformedExport, {
          duplicateStrategy,
          coordinateTolerance,
          duplicatePhotoStrategy: 'skip',
          preserveTimestamps: true
        })

        // Update map metadata
        exportData.map.lastModified = new Date().toISOString()
        exportData.map.description = `Merged with ${sourceExport.map.name}`

        // Generate filename for merged export
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const targetMapName = state.targetExport.map.name.replace(/[^a-z0-9]/gi, '_')
        filename = `Snapspot_Migrator_Export_${targetMapName}_${timestamp}.json`

        // Show success message with merge statistics
        const successMessage = 'Merge completed successfully!\n\n' +
          `File: ${filename}\n\n` +
          `Total markers: ${exportData.markers.length}\n` +
          `Added: ${stats.newMarkers} new markers\n` +
          `Merged: ${stats.duplicateMarkers} duplicate markers\n` +
          `Added: ${stats.newPhotos} new photos`

        // Convert to JSON string for download
        const exportJson = JSON.stringify(exportData, null, 2)
        this._downloadFile(exportJson, filename)

        alert(successMessage)
      } else {
        // REPLACE MODE: Target is just an image, create new export
        console.log('Target is an image - using replace mode')

        // Create new map metadata object (without image data - that's passed separately)
        const newMap = {
          id: 'migrated-map',
          name: `${sourceExport.map.name} (Migrated)`,
          width: state.targetMap.width,
          height: state.targetMap.height,
          description: `Migrated from ${sourceExport.map.name}`,
          fileName: state.targetMap.name || 'target-map.png'
        }

        // Keep all photos unchanged
        const photos = sourceExport.photos || []

        // Build export using lib/snapspot-data writer
        // Signature: buildExport(map, mapImage, markers, photos, options)
        exportData = await buildExport(
          newMap,
          state.targetMap.blob, // Pass blob as separate parameter
          transformedMarkers,
          photos,
          {
            sourceApp: 'SnapSpot Map Migrator',
            preserveMapId: false
          }
        )

        // Add optional fields to map metadata
        exportData.map.description = newMap.description || ''
        exportData.map.fileName = newMap.fileName
        exportData.map.fileSize = state.targetMap.blob.size
        exportData.map.fileType = state.targetMap.blob.type
        exportData.map.isActive = true

        // Convert to JSON string for download
        const exportJson = JSON.stringify(exportData, null, 2)

        // Generate filename using target map name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const targetMapName = state.targetMap.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '_') // Remove extension and sanitize
        filename = `Snapspot_Migrator_Export_${targetMapName}_${timestamp}.json`

        // Download file
        this._downloadFile(exportJson, filename)

        // Show success
        alert(`Export generated successfully!\n\nFile: ${filename}\nMarkers: ${transformedMarkers.length}`)
      }

      // Reset button
      this.exportBtn.disabled = false
      this.exportBtn.textContent = 'Generate Export File'
    } catch (error) {
      console.error('Error generating export:', error)
      this._showError('Export Failed', error.message)

      // Reset button
      this.exportBtn.disabled = false
      this.exportBtn.textContent = 'Generate Export File'
    }
  }

  /**
   * Convert blob to data URL
   * @private
   */
  async _blobToDataURL (blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        resolve(reader.result)
      }

      reader.onerror = () => {
        reject(new Error('Failed to read blob'))
      }

      reader.readAsDataURL(blob)
    })
  }

  /**
   * Generate a simple hash for the image
   * @private
   */
  _generateHash () {
    return 'hash_' + Math.random().toString(36).substring(2, 15)
  }

  /**
   * Download file to user's computer
   * @private
   */
  _downloadFile (data, filename) {
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }

  /**
   * Show error message
   * @private
   */
  _showError (title, message) {
    alert(`${title}\n\n${message}`)
  }

  /**
   * Handle keyboard shortcuts
   * @private
   */
  _onKeyDown (e) {
    // Ctrl+P: Toggle preview
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault()
      if (!this.previewBtn.disabled) {
        this.togglePreview()
      }
    }

    // Ctrl+S: Generate export
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      if (!this.exportBtn.disabled) {
        this.generateMigratedExport()
      }
    }
  }

  /**
   * Initialize the migrator
   */
  init () {
    console.log('Map Migrator initialized')
  }
}
