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
    const height = 400

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

      // Store in state
      this.state.sourceExport = exportData
      this.state.sourceMap = {
        blob: mapImage,
        width: exportData.map.width,
        height: exportData.map.height,
        name: exportData.map.name,
        markers: exportData.markers
      }

      // Render map
      await this._renderSourceMap()

      // Update UI
      this._hideDropZone(this.sourceDrop)
      this._showInfo(this.sourceInfo)
      this.sourceName.textContent = exportData.map.name
      this.sourceSize.textContent = `${exportData.map.width} × ${exportData.map.height}px`
      this.sourceMarkers.textContent = exportData.markers.length

      // Update canvas cursor
      this._updateCanvasCursors()

      console.log('Source export loaded:', exportData.map.name)
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

      console.log('Target image loaded:', file.name)
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
    await this.sourceRenderer.renderImage(this.state.sourceMap.blob, 'contain')
    this._drawSourceMarkers()
    this._drawReferencePairs('source')
  }

  /**
   * Render target map on canvas
   * @private
   */
  async _renderTargetMap () {
    await this.targetRenderer.renderImage(this.state.targetMap.blob, 'contain')
    this._drawReferencePairs('target')
  }

  /**
   * Draw source markers on canvas
   * @private
   */
  _drawSourceMarkers () {
    if (!this.state.sourceMap || !this.state.sourceMap.markers) return

    const markers = this.state.sourceMap.markers

    markers.forEach(marker => {
      // Convert map coordinates (0-1) to canvas coordinates (image pixels)
      const canvasX = marker.x * this.sourceImageWidth
      const canvasY = marker.y * this.sourceImageHeight

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
    const imageWidth = canvasType === 'source' ? this.sourceImageWidth : this.targetImageWidth
    const imageHeight = canvasType === 'source' ? this.sourceImageHeight : this.targetImageHeight

    this.state.referencePairs.forEach((pair, index) => {
      const point = canvasType === 'source' ? pair.source : pair.target
      
      // Convert map coordinates (0-1) to canvas coordinates (image pixels)
      const canvasX = point.x * imageWidth
      const canvasY = point.y * imageHeight

      // Color for this pair
      const hue = (index * 137.5) % 360
      const color = `hsl(${hue}, 70%, 50%)`

      // Draw marker with number
      renderer.drawMarker(canvasX, canvasY, {
        color,
        size: 24,
        label: String(index + 1)
      })
    })

    // Draw pending source point if exists
    if (canvasType === 'source' && this.state.pendingSourcePoint) {
      const canvasX = this.state.pendingSourcePoint.x * imageWidth
      const canvasY = this.state.pendingSourcePoint.y * imageHeight

      renderer.drawMarker(canvasX, canvasY, {
        color: '#ff9800',
        size: 24,
        label: '?'
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

    if (this.state.nextClickTarget !== 'source') {
      this._showError('Click target map next', 'Please click the matching location on the target map to complete the pair.')
      return
    }

    // Get image coordinates
    const rect = this.sourceCanvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    const imagePoint = this.sourceRenderer.screenPointToMap(screenX, screenY)

    // Store pending source point
    this.state.pendingSourcePoint = imagePoint
    this.state.nextClickTarget = 'target'

    // Redraw to show pending point
    this._renderSourceMap()

    // Update cursor
    this._updateCanvasCursors()

    console.log('Source point selected:', imagePoint)
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

    if (this.state.nextClickTarget !== 'target') {
      this._showError('Click source map next', 'Please click a location on the source map first.')
      return
    }

    if (!this.state.pendingSourcePoint) {
      this._showError('Click source map first', 'Please click a location on the source map first.')
      return
    }

    // Get image coordinates
    const rect = this.targetCanvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    const imagePoint = this.targetRenderer.screenPointToMap(screenX, screenY)

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

    console.log('Point pair added:', pair)
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
          <td>(${Math.round(pair.source.x)}, ${Math.round(pair.source.y)})</td>
          <td>(${Math.round(pair.target.x)}, ${Math.round(pair.target.y)})</td>
          <td>
            <button class="btn-delete" data-index="${index}" title="Delete this point pair">×</button>
          </td>
        `

        // Add delete handler
        const deleteBtn = row.querySelector('.btn-delete')
        deleteBtn.addEventListener('click', () => this._removePoint(index))

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

    console.log('Point pair removed:', index)
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

      console.log('All points cleared')
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
