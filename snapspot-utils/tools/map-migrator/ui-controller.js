/**
 * Map Migrator UI Controller
 *
 * Manages UI interactions for the map migration tool.
 * Handles file loading, point selection, canvas rendering, and user interactions.
 */

/* global Image, confirm, alert */

import { CanvasRenderer } from '../../shared/utils/canvas-helpers.js'
import { FileLoader } from '../../shared/utils/file-loader.js'
import { parseExport } from '../../core/formats/snapspot/parser.js'

/**
 * UI Controller for Map Migrator
 */
export class UIController {
  /**
   * Create a new UI controller
   * @param {string} sourceCanvasId - ID of source canvas element
   * @param {string} targetCanvasId - ID of target canvas element
   */
  constructor (sourceCanvasId, targetCanvasId) {
    // Get canvas elements
    this.sourceCanvas = document.getElementById(sourceCanvasId)
    this.targetCanvas = document.getElementById(targetCanvasId)

    if (!this.sourceCanvas || !this.targetCanvas) {
      throw new Error('Canvas elements not found')
    }

    // Create canvas renderers
    this.sourceRenderer = new CanvasRenderer(this.sourceCanvas)
    this.targetRenderer = new CanvasRenderer(this.targetCanvas)

    // Enable pan and zoom for both canvases
    this.sourceRenderer.enablePanZoom()
    this.targetRenderer.enablePanZoom()

    // Set up redraw callbacks to maintain markers during pan/zoom
    this.sourceRenderer.onRedraw = () => this._drawSourceOverlays()
    this.targetRenderer.onRedraw = () => this._drawTargetOverlays()

    // Application state
    this.state = {
      sourceExport: null,
      sourceMap: null, // { blob, width, height }
      targetMap: null, // { blob, width, height, name }
      referencePairs: [], // [{ source: {x, y}, target: {x, y} }]
      transformMatrix: null,
      previewActive: false,
      nextClickTarget: 'source', // 'source' or 'target'
      pendingSourcePoint: null // Store incomplete pair
    }

    // Get UI elements
    this._initializeUIElements()

    // Set up event listeners
    this._setupEventListeners()

    // Set canvas sizes
    this._resizeCanvases()
  }

  /**
   * Initialize DOM element references
   * @private
   */
  _initializeUIElements () {
    // Drop zones
    this.sourceDrop = document.getElementById('source-drop')
    this.targetDrop = document.getElementById('target-drop')

    // File inputs
    this.sourceFileInput = document.getElementById('source-file-input')
    this.targetFileInput = document.getElementById('target-file-input')
    this.sourceFileBtn = document.getElementById('source-file-btn')
    this.targetFileBtn = document.getElementById('target-file-btn')

    // Info panels
    this.sourceInfo = document.getElementById('source-info')
    this.targetInfo = document.getElementById('target-info')
    this.sourceName = document.getElementById('source-name')
    this.sourceSize = document.getElementById('source-size')
    this.sourceMarkers = document.getElementById('source-markers')
    this.targetName = document.getElementById('target-name')
    this.targetSize = document.getElementById('target-size')

    // Points table
    this.pointsTable = document.getElementById('points-table')
    this.pointsTbody = document.getElementById('points-tbody')
    this.pointCount = document.getElementById('point-count')
    this.clearPointsBtn = document.getElementById('clear-points')

    // Metrics panel
    this.metricsPanel = document.getElementById('metrics')

    // Action buttons
    this.calculateBtn = document.getElementById('calculate-btn')
    this.previewBtn = document.getElementById('preview-btn')
    this.exportBtn = document.getElementById('export-btn')

    // Help modal
    this.helpBtn = document.getElementById('help-btn')
    this.helpModal = document.getElementById('help-modal')
    this.closeHelpBtn = document.getElementById('close-help')
  }

  /**
   * Set up all event listeners
   * @private
   */
  _setupEventListeners () {
    // File loading - drop zones
    this.sourceDrop.addEventListener('dragover', (e) => this._onDragOver(e))
    this.sourceDrop.addEventListener('drop', (e) => this._onSourceDrop(e))
    this.targetDrop.addEventListener('dragover', (e) => this._onDragOver(e))
    this.targetDrop.addEventListener('drop', (e) => this._onTargetDrop(e))

    // File loading - browse buttons
    this.sourceFileBtn.addEventListener('click', () => this.sourceFileInput.click())
    this.targetFileBtn.addEventListener('click', () => this.targetFileInput.click())
    this.sourceFileInput.addEventListener('change', (e) => this._onSourceFileSelect(e))
    this.targetFileInput.addEventListener('change', (e) => this._onTargetFileSelect(e))

    // Canvas clicks for point selection
    this.sourceCanvas.addEventListener('click', (e) => this._onSourceCanvasClick(e))
    this.targetCanvas.addEventListener('click', (e) => this._onTargetCanvasClick(e))

    // Point management
    this.clearPointsBtn.addEventListener('click', () => this._onClearPoints())

    // Use event delegation for delete buttons since they're dynamically created
    this.pointsTbody.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete')) {
        const index = parseInt(e.target.dataset.index)
        this._removePoint(index)
      }
    })

    // Help modal
    this.helpBtn.addEventListener('click', () => this._showHelp())
    this.closeHelpBtn.addEventListener('click', () => this._hideHelp())

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._onKeyDown(e))

    // Window resize
    window.addEventListener('resize', () => this._resizeCanvases())
  }

  /**
   * Resize canvases to fit container
   * @private
   */
  _resizeCanvases () {
    const width = 600
    const height = 360

    this.sourceCanvas.width = width
    this.sourceCanvas.height = height
    this.targetCanvas.width = width
    this.targetCanvas.height = height

    // Redraw if images loaded
    if (this.state.sourceMap) {
      this._renderSourceMap()
    }
    if (this.state.targetMap) {
      this._renderTargetMap()
    }
  }

  /**
   * Handle drag over event
   * @private
   */
  _onDragOver (e) {
    e.preventDefault()
    e.stopPropagation()
  }

  /**
   * Handle source file drop
   * @private
   */
  async _onSourceDrop (e) {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await this.handleSourceFileDrop(files[0])
    }
  }

  /**
   * Handle target file drop
   * @private
   */
  async _onTargetDrop (e) {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await this.handleTargetFileDrop(files[0])
    }
  }

  /**
   * Handle source file selection via browse
   * @private
   */
  async _onSourceFileSelect (e) {
    const files = e.target.files
    if (files.length > 0) {
      await this.handleSourceFileDrop(files[0])
    }
  }

  /**
   * Handle target file selection via browse
   * @private
   */
  async _onTargetFileSelect (e) {
    const files = e.target.files
    if (files.length > 0) {
      await this.handleTargetFileDrop(files[0])
    }
  }

  /**
   * Load SnapSpot export file
   * @param {File} file - Export JSON file
   */
  async handleSourceFileDrop (file) {
    try {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Source file must be a .json file')
      }

      // Show loading indicator
      this._showLoading(this.sourceDrop, 'Loading export...')

      // Load and parse file
      const text = await FileLoader.loadAsText(file)
      const exportData = await parseExport(text)

      // Extract map image
      const mapImage = exportData.mapImage

      // Render map first to get actual dimensions
      await this.sourceRenderer.renderImage(mapImage, 'contain')

      // Get actual rendered dimensions (SVGs may have different metadata dimensions)
      const actualWidth = this.sourceRenderer.imageWidth
      const actualHeight = this.sourceRenderer.imageHeight

      // Normalize marker coordinates from pixels to 0-1 range
      const normalizedMarkers = exportData.markers.map(marker => ({
        ...marker,
        x: marker.x / actualWidth,
        y: marker.y / actualHeight
      }))

      // Store in state
      this.state.sourceExport = exportData
      this.state.sourceMap = {
        blob: mapImage,
        width: actualWidth,
        height: actualHeight,
        name: exportData.map.name,
        markers: normalizedMarkers
      }

      // Redraw with markers
      this._renderSourceMap()

      // Update UI
      this._hideDropZone(this.sourceDrop)
      this._showInfo(this.sourceInfo)
      this.sourceName.textContent = exportData.map.name
      this.sourceSize.textContent = `${actualWidth} × ${actualHeight}px`
      this.sourceMarkers.textContent = exportData.markers.length

      // Update canvas cursor
      this._updateCanvasCursors()
    } catch (error) {
      console.error('Error loading source file:', error)
      this._showError('Failed to load source file', error.message)
      this._hideLoading(this.sourceDrop)
    }
  }

  /**
   * Load target map image
   * @param {File} file - Map image file
   */
  async handleTargetFileDrop (file) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Target file must be an image')
      }

      // Show loading indicator
      this._showLoading(this.targetDrop, 'Loading image...')

      // Load image
      const blob = await FileLoader.loadAsBlob(file)

      // Get image dimensions
      const dimensions = await this._getImageDimensions(blob)

      // Store in state
      this.state.targetMap = {
        blob,
        width: dimensions.width,
        height: dimensions.height,
        name: file.name
      }

      // Render map
      await this._renderTargetMap()

      // Update UI
      this._hideDropZone(this.targetDrop)
      this._showInfo(this.targetInfo)
      this.targetName.textContent = file.name
      this.targetSize.textContent = `${dimensions.width} × ${dimensions.height}px`

      // Update canvas cursor
      this._updateCanvasCursors()
    } catch (error) {
      console.error('Error loading target file:', error)
      this._showError('Failed to load target file', error.message)
      this._hideLoading(this.targetDrop)
    }
  }

  /**
   * Get image dimensions from blob
   * @private
   */
  async _getImageDimensions (blob) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(blob)

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
   * Render source map on canvas
   * @private
   */
  async _renderSourceMap () {
    // Only reset view on first load
    const isFirstLoad = this.sourceRenderer.currentBlob !== this.state.sourceMap.blob
    this.sourceRenderer.currentBlob = this.state.sourceMap.blob

    await this.sourceRenderer.renderImage(this.state.sourceMap.blob, 'contain', isFirstLoad)
    // Overlays are drawn automatically via onRedraw callback
  }

  /**
   * Render target map on canvas
   * @private
   */
  async _renderTargetMap () {
    // Only reset view on first load
    const isFirstLoad = this.targetRenderer.currentBlob !== this.state.targetMap.blob
    this.targetRenderer.currentBlob = this.state.targetMap.blob

    await this.targetRenderer.renderImage(this.state.targetMap.blob, 'contain', isFirstLoad)
    // Overlays are drawn automatically via onRedraw callback
  }

  /**
   * Draw all overlays on source canvas (markers + reference points)
   * Called automatically after pan/zoom via onRedraw callback
   * @private
   */
  _drawSourceOverlays () {
    this._drawSourceMarkers()
    this._drawReferencePairs('source')
  }

  /**
   * Draw all overlays on target canvas (reference points only)
   * Called automatically after pan/zoom via onRedraw callback
   * @private
   */
  _drawTargetOverlays () {
    this._drawReferencePairs('target')

    // Also draw preview markers if preview is active
    if (this.state.previewActive) {
      this._drawPreviewMarkers()
    }
  }

  /**
   * Draw preview markers on target canvas
   * @private
   */
  _drawPreviewMarkers () {
    const matrix = this.state.transformMatrix
    if (!matrix) return

    const markers = this.state.sourceMap.markers
    const sourceMapWidth = this.state.sourceMap.width
    const sourceMapHeight = this.state.sourceMap.height
    const targetImageWidth = this.state.targetMap.width
    const targetImageHeight = this.state.targetMap.height

    // Import applyTransform
    import('../../core/transformation/affine-transform.js').then(({ applyTransform }) => {
      markers.forEach(marker => {
        // Convert from normalized (0-1) to source pixel coordinates
        const sourcePixel = {
          x: marker.x * sourceMapWidth,
          y: marker.y * sourceMapHeight
        }

        // Transform marker position (result is in target pixel coordinates)
        // drawMarker expects image pixel coordinates, not canvas coordinates
        const transformed = applyTransform(sourcePixel, matrix)

        // Draw transformed marker (pass image pixels directly)
        this.targetRenderer.drawMarker(transformed.x, transformed.y, {
          color: 'rgba(255, 0, 0, 0.5)',
          size: 6,
          opacity: 0.5
        })
      })

      // Draw error vectors for reference points
      this.state.referencePairs.forEach((pair, index) => {
        // Convert source from normalized to pixels
        const sourcePixel = {
          x: pair.source.x * sourceMapWidth,
          y: pair.source.y * sourceMapHeight
        }

        // Transform source point (result is in target pixel coordinates)
        const transformed = applyTransform(sourcePixel, matrix)

        // Convert target from normalized to image pixels
        const targetPixelX = pair.target.x * targetImageWidth
        const targetPixelY = pair.target.y * targetImageHeight

        // Draw error line (drawLine also expects image pixel coordinates)
        this.targetRenderer.drawLine(
          transformed.x,
          transformed.y,
          targetPixelX,
          targetPixelY,
          {
            color: 'rgba(255, 0, 0, 0.7)',
            width: 1.5
          }
        )
      })
    })
  }

  /**
   * Draw source markers on canvas
   * @private
   */
  _drawSourceMarkers () {
    if (!this.state.sourceMap || !this.state.sourceMap.markers) return

    const markers = this.state.sourceMap.markers

    markers.forEach(marker => {
      // Convert map coordinates (0-1) to canvas coordinates using renderer's dimensions
      const canvasX = marker.x * this.sourceRenderer.imageWidth
      const canvasY = marker.y * this.sourceRenderer.imageHeight

      // Draw small dot for each marker
      this.sourceRenderer.drawMarker(canvasX, canvasY, {
        color: 'rgba(100, 100, 100, 0.5)',
        size: 6,
        opacity: 0.5
      })
    })
  }

  /**
   * Draw reference point pairs on canvas
   * @private
   */
  _drawReferencePairs (canvasType) {
    const renderer = canvasType === 'source' ? this.sourceRenderer : this.targetRenderer

    this.state.referencePairs.forEach((pair, index) => {
      const point = canvasType === 'source' ? pair.source : pair.target

      // Convert map coordinates (0-1) to canvas coordinates using renderer's dimensions
      const canvasX = point.x * renderer.imageWidth
      const canvasY = point.y * renderer.imageHeight

      // Color for this pair
      const hue = (index * 137.5) % 360
      const color = `hsl(${hue}, 70%, 50%)`

      // Draw crosshair marker with number
      renderer.drawMarker(canvasX, canvasY, {
        color,
        size: 20,
        label: String(index + 1),
        style: 'crosshair'
      })
    })

    // Draw pending source point if exists
    if (canvasType === 'source' && this.state.pendingSourcePoint) {
      const canvasX = this.state.pendingSourcePoint.x * renderer.imageWidth
      const canvasY = this.state.pendingSourcePoint.y * renderer.imageHeight

      renderer.drawMarker(canvasX, canvasY, {
        color: '#ff9800',
        size: 20,
        label: '?',
        style: 'crosshair'
      })
    }
  }

  /**
   * Handle source canvas click
   * @private
   */
  _onSourceCanvasClick (e) {
    if (!this.state.sourceMap || !this.state.targetMap) {
      this._showError('Load both maps first', 'Please load a SnapSpot export and target map before selecting points.')
      return
    }

    if (this.state.previewActive) {
      return // Disable during preview
    }

    // Don't place marker if user is panning (Ctrl+click or middle button)
    if (e.ctrlKey || e.button === 1 || this.sourceRenderer.isPanning) {
      return
    }

    if (this.state.nextClickTarget !== 'source') {
      this._showError('Click target map next', 'Please click the matching location on the target map to complete the pair.')
      return
    }

    // Get image coordinates
    // Convert screen coordinates to canvas coordinates (image pixels)
    const canvasPoint = this.sourceRenderer.screenToCanvas(e.clientX, e.clientY)

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(this.sourceRenderer.imageWidth, canvasPoint.x))
    const clampedY = Math.max(0, Math.min(this.sourceRenderer.imageHeight, canvasPoint.y))

    // Convert to map coordinates (0-1 normalized using renderer's actual dimensions)
    const imagePoint = {
      x: clampedX / this.sourceRenderer.imageWidth,
      y: clampedY / this.sourceRenderer.imageHeight
    }

    // Store pending source point
    this.state.pendingSourcePoint = imagePoint
    this.state.nextClickTarget = 'target'

    // Redraw to show pending point
    this._renderSourceMap()

    // Update cursor
    this._updateCanvasCursors()
  }

  /**
   * Handle target canvas click
   * @private
   */
  _onTargetCanvasClick (e) {
    if (!this.state.sourceMap || !this.state.targetMap) {
      this._showError('Load both maps first', 'Please load a SnapSpot export and target map before selecting points.')
      return
    }

    if (this.state.previewActive) {
      return // Disable during preview
    }

    // Don't place marker if user is panning (Ctrl+click or middle button)
    if (e.ctrlKey || e.button === 1 || this.targetRenderer.isPanning) {
      return
    }

    if (this.state.nextClickTarget !== 'target') {
      this._showError('Click source map next', 'Please click a location on the source map first.')
      return
    }

    if (!this.state.pendingSourcePoint) {
      this._showError('Click source map first', 'Please click a location on the source map first.')
      return
    }

    // Get image coordinates
    // Convert screen coordinates to canvas coordinates (image pixels)
    const canvasPoint = this.targetRenderer.screenToCanvas(e.clientX, e.clientY)

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(this.targetRenderer.imageWidth, canvasPoint.x))
    const clampedY = Math.max(0, Math.min(this.targetRenderer.imageHeight, canvasPoint.y))

    // Convert to map coordinates (0-1 normalized using renderer's actual dimensions)
    const imagePoint = {
      x: clampedX / this.targetRenderer.imageWidth,
      y: clampedY / this.targetRenderer.imageHeight
    }

    // Create pair
    const pair = {
      source: this.state.pendingSourcePoint,
      target: imagePoint
    }

    // Add to pairs
    this.state.referencePairs.push(pair)
    this.state.pendingSourcePoint = null
    this.state.nextClickTarget = 'source'

    // Update UI
    this._updatePointsTable()
    this._renderSourceMap()
    this._renderTargetMap()
    this._updateCanvasCursors()
    this._updateButtonStates()
  }

  /**
   * Update points table
   * @private
   */
  _updatePointsTable () {
    const tbody = this.pointsTbody

    // Clear table
    tbody.innerHTML = ''

    if (this.state.referencePairs.length === 0) {
      // Show empty state
      tbody.innerHTML = `
        <tr class="empty-state">
          <td colspan="4">
            <div class="empty-message">
              <p>No reference points added yet</p>
              <p class="empty-hint">Click on matching locations in both maps to create point pairs</p>
            </div>
          </td>
        </tr>
      `
    } else {
      // Add rows for each pair
      this.state.referencePairs.forEach((pair, index) => {
        const row = document.createElement('tr')

        const hue = (index * 137.5) % 360
        const color = `hsl(${hue}, 70%, 50%)`

        row.innerHTML = `
          <td><span class="point-number" style="color: ${color}">●</span> ${index + 1}</td>
          <td>(${Math.round(pair.source.x * (this.state.sourceMap?.width || 1))}, ${Math.round(pair.source.y * (this.state.sourceMap?.height || 1))})</td>
          <td>(${Math.round(pair.target.x * (this.state.targetMap?.width || 1))}, ${Math.round(pair.target.y * (this.state.targetMap?.height || 1))})</td>
          <td>
            <button class="btn-delete" data-index="${index}" title="Delete this point pair">×</button>
          </td>
        `

        tbody.appendChild(row)
      })
    }

    // Update count
    const count = this.state.referencePairs.length
    this.pointCount.textContent = `(${count}/3 minimum)`

    // Update clear button
    this.clearPointsBtn.disabled = count === 0
  }

  /**
   * Remove a point pair
   * @private
   */
  _removePoint (index) {
    this.state.referencePairs.splice(index, 1)

    // Update UI
    this._updatePointsTable()
    this._renderSourceMap()
    this._renderTargetMap()
    this._updateButtonStates()
  }

  /**
   * Clear all points
   * @private
   */
  _onClearPoints () {
    if (this.state.referencePairs.length === 0) return

    if (confirm('Clear all reference points?')) {
      this.state.referencePairs = []
      this.state.pendingSourcePoint = null
      this.state.nextClickTarget = 'source'
      this.state.transformMatrix = null

      // Update UI
      this._updatePointsTable()
      this._renderSourceMap()
      this._renderTargetMap()
      this._updateCanvasCursors()
      this._updateButtonStates()
      this._hideMetrics()
    }
  }

  /**
   * Update canvas cursors based on state
   * @private
   */
  _updateCanvasCursors () {
    const canClick = this.state.sourceMap && this.state.targetMap && !this.state.previewActive

    if (!canClick) {
      this.sourceCanvas.style.cursor = 'default'
      this.targetCanvas.style.cursor = 'default'
      return
    }

    if (this.state.nextClickTarget === 'source') {
      this.sourceCanvas.style.cursor = 'crosshair'
      this.targetCanvas.style.cursor = 'not-allowed'
    } else {
      this.sourceCanvas.style.cursor = 'not-allowed'
      this.targetCanvas.style.cursor = 'crosshair'
    }
  }

  /**
   * Update button states
   * @private
   */
  _updateButtonStates () {
    const hasEnoughPoints = this.state.referencePairs.length >= 3
    const hasTransform = this.state.transformMatrix !== null

    this.calculateBtn.disabled = !hasEnoughPoints
    this.previewBtn.disabled = !hasTransform
    this.exportBtn.disabled = !hasTransform
  }

  /**
   * Show loading indicator on drop zone
   * @private
   */
  _showLoading (dropZone, message) {
    const content = dropZone.querySelector('.drop-zone-content')
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `
  }

  /**
   * Hide loading indicator
   * @private
   */
  _hideLoading (dropZone) {
    // Restore original content - not needed since we hide the drop zone
  }

  /**
   * Hide drop zone and show canvas
   * @private
   */
  _hideDropZone (dropZone) {
    dropZone.style.display = 'none'
  }

  /**
   * Show info panel
   * @private
   */
  _showInfo (infoPanel) {
    infoPanel.style.display = 'flex'
  }

  /**
   * Hide metrics panel
   * @private
   */
  _hideMetrics () {
    this.metricsPanel.classList.add('hidden')
  }

  /**
   * Show error message
   * @private
   */
  _showError (title, message) {
    alert(`${title}\n\n${message}`)
  }

  /**
   * Show help modal
   * @private
   */
  _showHelp () {
    this.helpModal.classList.remove('hidden')
  }

  /**
   * Hide help modal
   * @private
   */
  _hideHelp () {
    this.helpModal.classList.add('hidden')
  }

  /**
   * Handle keyboard shortcuts
   * @private
   */
  _onKeyDown (e) {
    // Ctrl+O: Open source file
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault()
      this.sourceFileInput.click()
    }

    // Ctrl+M: Open target file
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault()
      this.targetFileInput.click()
    }

    // Ctrl+Z: Remove last point
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault()
      if (this.state.referencePairs.length > 0) {
        this._removePoint(this.state.referencePairs.length - 1)
      }
    }

    // Delete/Backspace: Remove last point
    if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.tagName !== 'INPUT') {
      e.preventDefault()
      if (this.state.referencePairs.length > 0) {
        this._removePoint(this.state.referencePairs.length - 1)
      }
    }

    // Escape: Cancel pending point
    if (e.key === 'Escape') {
      if (this.state.pendingSourcePoint) {
        this.state.pendingSourcePoint = null
        this.state.nextClickTarget = 'source'
        this._renderSourceMap()
        this._updateCanvasCursors()
      }
    }

    // Space: Calculate transformation
    if (e.key === ' ' && e.target.tagName !== 'INPUT') {
      e.preventDefault()
      if (!this.calculateBtn.disabled) {
        this.calculateBtn.click()
      }
    }
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState () {
    return this.state
  }

  /**
   * Set transformation matrix
   * @param {Array} matrix - 3x3 transformation matrix
   */
  setTransformMatrix (matrix) {
    this.state.transformMatrix = matrix
    this._updateButtonStates()
  }

  /**
   * Set preview active state
   * @param {boolean} active - Preview active
   */
  setPreviewActive (active) {
    this.state.previewActive = active
    this._updateCanvasCursors()
  }

  /**
   * Get target renderer (for preview drawing)
   * @returns {CanvasRenderer} Target canvas renderer
   */
  getTargetRenderer () {
    return this.targetRenderer
  }

  /**
   * Redraw target canvas (for preview updates)
   */
  redrawTarget () {
    this._renderTargetMap()
  }
}
