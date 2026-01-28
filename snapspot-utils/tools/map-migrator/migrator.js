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

      // Extract source and target points
      const sourcePoints = state.referencePairs.map(pair => pair.source)
      const targetPoints = state.referencePairs.map(pair => pair.target)

      console.log('Calculating transformation with', sourcePoints.length, 'point pairs')

      // Calculate transformation matrix
      const matrix = calculateAffineMatrix(sourcePoints, targetPoints)

      // Calculate RMSE
      const rmse = calculateRMSE(state.referencePairs, matrix)

      // Detect anomalies
      const anomalies = detectAnomalies(matrix)

      // Store matrix in state
      this.ui.setTransformMatrix(matrix)

      // Display metrics
      this._displayMetrics(matrix, rmse, anomalies)

      console.log('Transformation calculated:', { matrix, rmse, anomalies })
    } catch (error) {
      console.error('Error calculating transformation:', error)
      this._showError('Transformation Failed', error.message)
    }
  }

  /**
   * Display transformation metrics
   * @private
   */
  _displayMetrics (matrix, rmseData, anomalies) {
    // Show metrics panel
    this.metricsPanel.classList.remove('hidden')

    // Calculate metric values
    const scaleX = Math.sqrt(matrix[0][0] ** 2 + matrix[1][0] ** 2)
    const scaleY = Math.sqrt(matrix[0][1] ** 2 + matrix[1][1] ** 2)
    const rotation = Math.atan2(matrix[1][0], matrix[0][0]) * (180 / Math.PI)

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

    const shear = matrix[0][1] + matrix[1][0]
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
    return matrix.map(row =>
      '[' + row.map(val => val.toFixed(6).padStart(12)).join(', ') + ']'
    ).join('\n')
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
    const targetImageWidth = state.targetMap.width
    const targetImageHeight = state.targetMap.height

    markers.forEach(marker => {
      // Transform marker position
      const transformed = applyTransform({ x: marker.x, y: marker.y }, matrix)

      // Convert map coordinates (0-1) to canvas coordinates (image pixels)
      const canvasX = transformed.x * targetImageWidth
      const canvasY = transformed.y * targetImageHeight

      // Draw transformed marker
      renderer.drawMarker(canvasX, canvasY, {
        color: 'rgba(255, 0, 0, 0.5)',
        size: 8,
        opacity: 0.5
      })
    })

    // Draw error vectors for reference points
    state.referencePairs.forEach((pair, index) => {
      // Transform source point
      const transformed = applyTransform(pair.source, matrix)

      // Convert map coordinates (0-1) to canvas coordinates (image pixels)
      const transformedCanvasX = transformed.x * targetImageWidth
      const transformedCanvasY = transformed.y * targetImageHeight
      const targetCanvasX = pair.target.x * targetImageWidth
      const targetCanvasY = pair.target.y * targetImageHeight

      // Draw error line
      renderer.drawLine(
        transformedCanvasX,
        transformedCanvasY,
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

      console.log('Generating migrated export...')

      // Show progress
      this.exportBtn.disabled = true
      this.exportBtn.textContent = 'Generating...'

      // Clone source export
      const sourceExport = state.sourceExport
      const matrix = state.transformMatrix

      // Transform all markers
      const transformedMarkers = sourceExport.markers.map(marker => {
        const transformed = applyTransform({ x: marker.x, y: marker.y }, matrix)

        // Clamp to target map bounds
        const clampedX = Math.max(0, Math.min(state.targetMap.width, transformed.x))
        const clampedY = Math.max(0, Math.min(state.targetMap.height, transformed.y))

        return {
          ...marker,
          x: Math.round(clampedX),
          y: Math.round(clampedY),
          mapId: 'migrated-map' // Will be updated by writer
        }
      })

      // Check for out-of-bounds markers
      const outOfBounds = transformedMarkers.filter((m, i) => {
        const orig = applyTransform({ x: sourceExport.markers[i].x, y: sourceExport.markers[i].y }, matrix)
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

      // Create new map object with target image
      const newMap = {
        id: 'migrated-map',
        name: `${sourceExport.map.name} (Migrated)`,
        width: state.targetMap.width,
        height: state.targetMap.height,
        imageData: await this._blobToDataURL(state.targetMap.blob),
        hash: this._generateHash()
      }

      // Keep all photos unchanged
      const photos = sourceExport.photos || []

      // Build export using Phase 2 writer
      const exportData = buildExport(newMap, transformedMarkers, photos, {
        sourceApp: 'SnapSpot Map Migrator',
        timestamp: new Date().toISOString()
      })

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `${sourceExport.map.name.replace(/[^a-z0-9]/gi, '_')}_migrated_${timestamp}.json`

      // Download file
      this._downloadFile(exportData, filename)

      // Show success
      alert(`Export generated successfully!\n\nFile: ${filename}\nMarkers: ${transformedMarkers.length}`)

      console.log('Export generated:', filename)

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
