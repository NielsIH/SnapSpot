/**
 * Canvas Helpers
 *
 * Provides reusable canvas rendering utilities for map tools.
 * Handles image rendering, pan/zoom, coordinate transformations, and marker drawing.
 */

/**
 * Canvas Renderer for interactive image display
 */
export class CanvasRenderer {
  /**
   * Create a new canvas renderer
   * @param {HTMLCanvasElement} canvasElement - The canvas element to render to
   */
  constructor (canvasElement) {
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error('CanvasRenderer requires a valid canvas element')
    }

    this.canvas = canvasElement
    this.ctx = canvasElement.getContext('2d')

    // View state
    this.state = {
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0
    }

    // Image state
    this.image = null
    this.imageWidth = 0
    this.imageHeight = 0

    // Interaction state
    this.isPanning = false
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.panEnabled = false

    // Bind event handlers
    this._onWheel = this._onWheel.bind(this)
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onContextMenu = this._onContextMenu.bind(this)
  }

  /**
   * Render an image on the canvas
   * @param {Blob|string} imageSource - Image blob or data URL
   * @param {string} fit - Fit mode: 'contain', 'cover', 'fill'
   * @returns {Promise<void>}
   */
  async renderImage (imageSource, fit = 'contain') {
    // Load image
    const img = await this._loadImage(imageSource)
    this.image = img
    this.imageWidth = img.width
    this.imageHeight = img.height

    // Reset view
    this.resetView()

    // Fit to canvas
    this._fitImage(fit)

    // Draw
    this._draw()
  }

  /**
   * Load an image from blob or data URL
   * @private
   */
  async _loadImage (source) {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        if (source instanceof Blob) {
          URL.revokeObjectURL(img.src)
        }
        resolve(img)
      }

      img.onerror = () => {
        if (source instanceof Blob) {
          URL.revokeObjectURL(img.src)
        }
        reject(new Error('Failed to load image'))
      }

      if (source instanceof Blob) {
        img.src = URL.createObjectURL(source)
      } else {
        img.src = source
      }
    })
  }

  /**
   * Fit image to canvas
   * @private
   */
  _fitImage (fit) {
    if (!this.image) return

    const canvasRatio = this.canvas.width / this.canvas.height
    const imageRatio = this.imageWidth / this.imageHeight

    if (fit === 'contain') {
      if (imageRatio > canvasRatio) {
        // Image is wider
        this.state.zoom = this.canvas.width / this.imageWidth
      } else {
        // Image is taller
        this.state.zoom = this.canvas.height / this.imageHeight
      }
    } else if (fit === 'cover') {
      if (imageRatio > canvasRatio) {
        this.state.zoom = this.canvas.height / this.imageHeight
      } else {
        this.state.zoom = this.canvas.width / this.imageWidth
      }
    } else if (fit === 'fill') {
      this.state.zoom = 1.0
    }

    // Center the image
    this.state.panX = (this.canvas.width - this.imageWidth * this.state.zoom) / 2
    this.state.panY = (this.canvas.height - this.imageHeight * this.state.zoom) / 2
  }

  /**
   * Convert screen coordinates to canvas coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{x: number, y: number}} Canvas coordinates
   */
  screenToCanvas (screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect()
    const x = (screenX - rect.left - this.state.panX) / this.state.zoom
    const y = (screenY - rect.top - this.state.panY) / this.state.zoom
    return { x, y }
  }

  /**
   * Convert canvas coordinates to screen coordinates
   * @param {number} canvasX - Canvas X coordinate
   * @param {number} canvasY - Canvas Y coordinate
   * @returns {{x: number, y: number}} Screen coordinates
   */
  canvasToScreen (canvasX, canvasY) {
    const rect = this.canvas.getBoundingClientRect()
    const x = canvasX * this.state.zoom + this.state.panX + rect.left
    const y = canvasY * this.state.zoom + this.state.panY + rect.top
    return { x, y }
  }

  /**
   * Set zoom level
   * @param {number} level - Zoom level (1.0 = 100%)
   * @param {number} centerX - X coordinate to zoom around (screen coords)
   * @param {number} centerY - Y coordinate to zoom around (screen coords)
   */
  setZoom (level, centerX = null, centerY = null) {
    const oldZoom = this.state.zoom
    this.state.zoom = Math.max(0.1, Math.min(10, level))

    // Zoom around a specific point
    if (centerX !== null && centerY !== null) {
      const rect = this.canvas.getBoundingClientRect()
      const mouseX = centerX - rect.left
      const mouseY = centerY - rect.top

      // Adjust pan to keep the point under the cursor
      this.state.panX = mouseX - (mouseX - this.state.panX) * (this.state.zoom / oldZoom)
      this.state.panY = mouseY - (mouseY - this.state.panY) * (this.state.zoom / oldZoom)
    }

    this._draw()
  }

  /**
   * Set pan offset
   * @param {number} offsetX - X offset in pixels
   * @param {number} offsetY - Y offset in pixels
   */
  setPan (offsetX, offsetY) {
    this.state.panX = offsetX
    this.state.panY = offsetY
    this._draw()
  }

  /**
   * Reset view to initial state
   */
  resetView () {
    this.state.zoom = 1.0
    this.state.panX = 0
    this.state.panY = 0
    this.state.rotation = 0
    this._draw()
  }

  /**
   * Clear the canvas
   */
  clear () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * Draw the current state
   * @private
   */
  _draw () {
    this.clear()

    if (!this.image) return

    // Save context
    this.ctx.save()

    // Apply transformations
    this.ctx.translate(this.state.panX, this.state.panY)
    this.ctx.scale(this.state.zoom, this.state.zoom)

    // Draw image
    this.ctx.drawImage(this.image, 0, 0)

    // Restore context
    this.ctx.restore()
  }

  /**
   * Draw a marker on the canvas
   * @param {number} x - X coordinate (canvas coords)
   * @param {number} y - Y coordinate (canvas coords)
   * @param {Object} options - Marker options
   * @param {string} options.color - Marker color
   * @param {number} options.size - Marker size (diameter)
   * @param {string} options.label - Marker label
   * @param {number} options.opacity - Marker opacity (0-1)
   */
  drawMarker (x, y, options = {}) {
    const {
      color = '#ff0000',
      size = 24,
      label = '',
      opacity = 1.0
    } = options

    // Convert to screen coordinates
    const screenX = x * this.state.zoom + this.state.panX
    const screenY = y * this.state.zoom + this.state.panY
    const screenSize = size * this.state.zoom

    this.ctx.save()
    this.ctx.globalAlpha = opacity

    // Draw circle
    this.ctx.beginPath()
    this.ctx.arc(screenX, screenY, screenSize / 2, 0, Math.PI * 2)
    this.ctx.fillStyle = color
    this.ctx.fill()
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw label
    if (label) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = `bold ${Math.max(10, screenSize * 0.5)}px sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(label, screenX, screenY)
    }

    this.ctx.restore()
  }

  /**
   * Draw a line on the canvas
   * @param {number} x1 - Start X coordinate (canvas coords)
   * @param {number} y1 - Start Y coordinate (canvas coords)
   * @param {number} x2 - End X coordinate (canvas coords)
   * @param {number} y2 - End Y coordinate (canvas coords)
   * @param {Object} options - Line options
   * @param {string} options.color - Line color
   * @param {number} options.width - Line width
   * @param {number} options.opacity - Line opacity (0-1)
   */
  drawLine (x1, y1, x2, y2, options = {}) {
    const {
      color = '#ff0000',
      width = 2,
      opacity = 1.0
    } = options

    // Convert to screen coordinates
    const screenX1 = x1 * this.state.zoom + this.state.panX
    const screenY1 = y1 * this.state.zoom + this.state.panY
    const screenX2 = x2 * this.state.zoom + this.state.panX
    const screenY2 = y2 * this.state.zoom + this.state.panY

    this.ctx.save()
    this.ctx.globalAlpha = opacity

    this.ctx.beginPath()
    this.ctx.moveTo(screenX1, screenY1)
    this.ctx.lineTo(screenX2, screenY2)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = width
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * Highlight a marker (draw outline)
   * @param {number} x - X coordinate (canvas coords)
   * @param {number} y - Y coordinate (canvas coords)
   * @param {number} size - Marker size
   */
  highlightMarker (x, y, size = 24) {
    const screenX = x * this.state.zoom + this.state.panX
    const screenY = y * this.state.zoom + this.state.panY
    const screenSize = size * this.state.zoom

    this.ctx.save()

    // Draw highlight circle
    this.ctx.beginPath()
    this.ctx.arc(screenX, screenY, screenSize / 2 + 4, 0, Math.PI * 2)
    this.ctx.strokeStyle = '#ffff00'
    this.ctx.lineWidth = 3
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * Enable pan/zoom interactions
   */
  enablePanZoom () {
    if (this.panEnabled) return

    this.canvas.addEventListener('wheel', this._onWheel, { passive: false })
    this.canvas.addEventListener('mousedown', this._onMouseDown)
    this.canvas.addEventListener('contextmenu', this._onContextMenu)

    this.panEnabled = true
  }

  /**
   * Disable pan/zoom interactions
   */
  disablePanZoom () {
    if (!this.panEnabled) return

    this.canvas.removeEventListener('wheel', this._onWheel)
    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mouseup', this._onMouseUp)
    this.canvas.removeEventListener('contextmenu', this._onContextMenu)

    this.panEnabled = false
  }

  /**
   * Handle mouse wheel (zoom)
   * @private
   */
  _onWheel (e) {
    e.preventDefault()

    const delta = -e.deltaY
    const zoomFactor = delta > 0 ? 1.1 : 0.9
    const newZoom = this.state.zoom * zoomFactor

    this.setZoom(newZoom, e.clientX, e.clientY)
  }

  /**
   * Handle mouse down (start pan)
   * @private
   */
  _onMouseDown (e) {
    // Middle mouse button or Ctrl+left click
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault()
      this.isPanning = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY

      this.canvas.addEventListener('mousemove', this._onMouseMove)
      this.canvas.addEventListener('mouseup', this._onMouseUp)

      this.canvas.style.cursor = 'grabbing'
    }
  }

  /**
   * Handle mouse move (pan)
   * @private
   */
  _onMouseMove (e) {
    if (!this.isPanning) return

    const dx = e.clientX - this.lastMouseX
    const dy = e.clientY - this.lastMouseY

    this.state.panX += dx
    this.state.panY += dy

    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY

    this._draw()
  }

  /**
   * Handle mouse up (end pan)
   * @private
   */
  _onMouseUp (e) {
    if (this.isPanning) {
      this.isPanning = false
      this.canvas.removeEventListener('mousemove', this._onMouseMove)
      this.canvas.removeEventListener('mouseup', this._onMouseUp)
      this.canvas.style.cursor = 'default'
    }
  }

  /**
   * Prevent context menu on canvas
   * @private
   */
  _onContextMenu (e) {
    e.preventDefault()
  }

  /**
   * Redraw all layers (for external updates)
   */
  redraw () {
    this._draw()
  }
}
