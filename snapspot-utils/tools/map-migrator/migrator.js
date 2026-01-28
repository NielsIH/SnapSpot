/**
 * Map Migrator Logic
 *
 * Handles transformation calculation, preview rendering, and export generation.
 */

/* global FileReader, confirm, alert */

import { calculateAffineMatrix, applyTransform } from '../../core/transformation/affine-transform.js'
import { calculateRMSE, detectAnomalies } from '../../core/transformation/transform-validator.js'
import { buildExport } from '../../core/formats/snapspot/writer.js'

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

      // Build export using Phase 2 writer
      // Signature: buildExport(map, mapImage, markers, photos, options)
      const writerOutput = await buildExport(
        newMap,
        state.targetMap.blob, // Pass blob as separate parameter
        transformedMarkers,
        photos,
        {
          sourceApp: 'SnapSpot Map Migrator',
          preserveMapId: false
        }
      )

      // Transform to SnapSpot PWA format (writer.js uses different property names)
      const writerData = JSON.parse(writerOutput)
      const exportData = JSON.stringify({
        version: writerData.version,
        type: 'SnapSpotDataExport', // Correct type name
        sourceApp: writerData.sourceApp,
        timestamp: writerData.exportDate, // Rename exportDate to timestamp

        map: {
          id: writerData.map.id,
          name: writerData.map.name,
          description: newMap.description || '',
          fileName: newMap.fileName,
          width: writerData.map.width,
          height: writerData.map.height,
          fileSize: state.targetMap.blob.size,
          fileType: state.targetMap.blob.type,
          createdDate: writerData.map.created, // Rename created to createdDate
          lastModified: writerData.map.modified, // Rename modified to lastModified
          isActive: true,
          imageHash: writerData.map.hash, // Rename hash to imageHash
          imageData: writerData.map.imageData
        },

        markers: writerData.markers,
        photos: writerData.photos
      }, null, 2)

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `${sourceExport.map.name.replace(/[^a-z0-9]/gi, '_')}_migrated_${timestamp}.json`

      // Download file
      this._downloadFile(exportData, filename)

      // Show success
      alert(`Export generated successfully!\n\nFile: ${filename}\nMarkers: ${transformedMarkers.length}`)

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
