/**
 * SnapSpot PWA - Map Rendering System
 */

/* global console, document, window, Image, URL */
export class MapRenderer {
  constructor (canvasId) {
    this.canvas = document.getElementById(canvasId)
    this.ctx = this.canvas.getContext('2d')
    this.currentMap = null
    // this.imageData will now hold an HTMLCanvasElement (the rotated bitmap)
    this.imageData = null
    // this.originalImageData holds the original (unrotated) HTMLImageElement reference
    this.originalImageData = null
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.maxScale = 5
    this.minScale = 0.1
    this.showDebugInfo = false
    this.markers = []
    this.showCrosshair = false
    this.markersAreEditable = false
    this._highlightedMarkerId = null
    this._highlightTimeout = null
    // Map Rotation -- This is the actual rotation angle applied to the *image bitmap*
    this.currentMapRotation = 0 // Stored rotation in degrees (0, 90, 180, 270)
    // SVG Support -- Track if current map is SVG (Phase 2: full rotation support)
    this.isSvgMap = false

    // Marker size settings
    this.markerSizeSettings = {
      normal: { radius: 12, fontSizeFactor: 1.0 },
      large: { radius: 18, fontSizeFactor: 1.2 },
      extraLarge: { radius: 24, fontSizeFactor: 1.4 }
    }
    this.markerCurrentDisplaySizeKey = 'normal' // Default size
    this.customColorRules = []

    // Marker Type Definitions (Phase 3: Custom Marker Types)
    this.markerTypeDefinitions = new Map()

    if (this.canvas.offsetParent !== null) {
      this.setupCanvas()
    }
    this.setupResizeHandler()
  }

  /**
   * Set the custom marker coloring rules.
   * @param {Array<Object>} rules - An array of custom marker coloring rule objects.
   */
  setCustomColorRules (rules) {
    this.customColorRules = rules || []
    this.render() // Re-render to apply new rules
  }

  /**
   * Set marker type definitions for rendering.
   * Phase 3: Custom Marker Types — indexes definitions by ID including built-in fallbacks.
   * @param {Array<Object>} definitions - Array of MarkerTypeDefinition objects
   */
  setMarkerTypeDefinitions (definitions) {
    this.markerTypeDefinitions = new Map()
    if (definitions && definitions.length > 0) {
      for (const def of definitions) {
        this.markerTypeDefinitions.set(def.id, def)
      }
    }
    // Ensure built-in fallbacks are always available
    if (!this.markerTypeDefinitions.has('builtin-photo-marker')) {
      this.markerTypeDefinitions.set('builtin-photo-marker', {
        id: 'builtin-photo-marker',
        name: 'Photo Marker',
        shape: 'circle',
        color: '#6b7280',
        size: 'normal',
        label: '',
        behavior: 'point',
        supportsPhotos: true,
        showNumber: true,
        isBuiltIn: true
      })
    }
    if (!this.markerTypeDefinitions.has('builtin-line-marker')) {
      this.markerTypeDefinitions.set('builtin-line-marker', {
        id: 'builtin-line-marker',
        name: 'Line Marker',
        shape: 'diamond',
        color: '#e53e3e',
        size: 'normal',
        label: '',
        behavior: 'line-pair',
        supportsPhotos: false,
        showNumber: false,
        isBuiltIn: true
      })
    }
    // Re-render if markers exist to apply new type definitions
    if (this.markers && this.markers.length > 0) {
      this.render()
    }
  }

  /**
   * Get the effective marker type definition for a given marker.
   * Phase 3: Implements the lookup chain — explicit markerTypeId → legacy type='line' → default photo marker.
   * @param {Object} marker - The marker object
   * @returns {Object} The MarkerTypeDefinition for this marker
   */
  getEffectiveTypeDef (marker) {
    // 1. If marker has explicit markerTypeId, look up the definition
    if (marker.markerTypeId && this.markerTypeDefinitions.has(marker.markerTypeId)) {
      return this.markerTypeDefinitions.get(marker.markerTypeId)
    }

    // 2. Fallback for legacy line markers without markerTypeId
    if (marker.type === 'line') {
      return this.markerTypeDefinitions.get('builtin-line-marker')
    }

    // 3. Default: Photo Marker built-in
    return this.markerTypeDefinitions.get('builtin-photo-marker')
  }

  /**
   * Get the behavior for a marker (dispatches rendering/placement logic).
   * @param {Object} marker - The marker object
   * @param {Object} typeDef - The effective type definition (from getEffectiveTypeDef)
   * @returns {string} 'point' | 'line-pair'
   */
  _getBehavior (marker, typeDef) {
    if (marker.markerTypeId && typeDef) return typeDef.behavior
    if (marker.type === 'line') return 'line-pair'
    return 'point'
  }

  // --- Color Utility Methods (Phase 3) ---

  /**
   * Darken a hex color by a given factor.
   * @param {string} hex - Hex color string (e.g., '#6b7280')
   * @param {number} factor - Darkening factor (0-1, e.g., 0.15 = 15% darker)
   * @returns {string} Darkened hex color
   */
  _darkenColor (hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const dr = Math.max(0, Math.round(r * (1 - factor)))
    const dg = Math.max(0, Math.round(g * (1 - factor)))
    const db = Math.max(0, Math.round(b * (1 - factor)))
    return '#' + [dr, dg, db].map(c => c.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Lighten a hex color by a given factor.
   * @param {string} hex - Hex color string
   * @param {number} factor - Lightening factor (0-1, e.g., 0.30 = 30% lighter)
   * @returns {string} Lightened hex color
   */
  _lightenColor (hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const lr = Math.min(255, Math.round(r + (255 - r) * factor))
    const lg = Math.min(255, Math.round(g + (255 - g) * factor))
    const lb = Math.min(255, Math.round(b + (255 - b) * factor))
    return '#' + [lr, lg, lb].map(c => c.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Saturate a hex color. For grey tones (all channels equal), maps to a warm red.
   * For already colored tones, increases saturation by shifting channels away from grey.
   * @param {string} hex - Hex color string
   * @param {number} amount - Saturation amount (0-1)
   * @returns {string} Saturated hex color
   */
  _saturateColor (hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    const maxChannel = Math.max(r, g, b)
    const minChannel = Math.min(r, g, b)
    const spread = maxChannel - minChannel

    // Treat near-grey colors (channel spread ≤ 30) as grey — map to vibrant
    // This handles #6b7280 and similar muted tones that should saturate to red
    if (spread <= 30) {
      const luminance = (r + g + b) / 3
      if (luminance < 128) {
        // Dark/mid grey → warm red (#ef4444)
        const sr = Math.min(255, Math.round(luminance + (239 - luminance) * amount))
        const sg = Math.max(0, Math.round(luminance * (1 - amount * 0.9)))
        const sb = Math.max(0, Math.round(luminance * (1 - amount * 0.9)))
        return '#' + [sr, sg, sb].map(c => c.toString(16).padStart(2, '0')).join('')
      } else {
        // Light grey → amber (#fbbf24)
        const sr = Math.min(255, Math.round(luminance + (251 - luminance) * amount))
        const sg = Math.min(255, Math.round(luminance + (191 - luminance) * amount))
        const sb = Math.max(0, Math.round(luminance * (1 - amount * 0.8)))
        return '#' + [sr, sg, sb].map(c => c.toString(16).padStart(2, '0')).join('')
      }
    }

    // Already colored: boost the dominant channel, reduce others
    const mid = (maxChannel + minChannel) / 2

    const sr = Math.min(255, Math.round(r + (r - mid) * amount))
    const sg = Math.min(255, Math.round(g + (g - mid) * amount))
    const sb = Math.min(255, Math.round(b + (b - mid) * amount))

    return '#' + [sr, sg, sb].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')
  }

  // --- End Color Utilities ---

  /**
   * Initialize canvas setup
   */
  setupCanvas () {
    if (!this.canvas) {
      console.error('MapRenderer: Canvas element not found')
      return
    }
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true
      this.ctx.imageSmoothingQuality = 'high'
    }
  }

  /**
   * Set up window resize handler
   */
  setupResizeHandler () {
    let resizeTimeout
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        this.resizeCanvas()
        this.render()
      }, 250)
    })
  }

  /**
   * Resize canvas to fill container
   */
  resizeCanvas () {
    if (!this.canvas) return

    const container = this.canvas.parentElement
    if (!container || container.offsetParent === null) {
      console.warn('MapRenderer: resizeCanvas - Container not visible or element not in DOM yet.')
      return false // Container not visible yet
    }

    const rect = container.getBoundingClientRect()

    const width = Math.max(container.clientWidth || rect.width, 100)
    const height = Math.max(container.clientHeight || rect.height, 100)

    console.log(`MapRenderer: resizeCanvas - Calculated dimensions: ${width}x${height} from parent (clientWidth: ${container.clientWidth}, rect.width: ${rect.width}).`)

    if (this.canvas.width === width && this.canvas.height === height) {
      console.log('MapRenderer: resizeCanvas - Canvas already correct size.')
      return // Avoid unnecessary redraws if size is the same
    }

    this.canvas.width = width
    this.canvas.height = height

    this.canvas.style.width = width + 'px'
    this.canvas.style.height = height + 'px'

    console.log(`MapRenderer: resizeCanvas - Canvas set to: ${this.canvas.width}x${this.canvas.height}.`)
  }

  /**
   * Helper to create a rotated version of an image on an offscreen canvas.
   * This offscreen canvas is then used as `this.imageData`.
   * @param {HTMLImageElement} img - The original (unrotated) HTMLImageElement.
   * @param {number} degrees - Rotation angle (0, 90, 180, 270) clockwise.
   * @returns {HTMLCanvasElement} A new canvas containing the rotated image.
   */
  _getRotatedImageCanvas (img, degrees) {
    const offscreenCanvas = document.createElement('canvas')
    const offscreenCtx = offscreenCanvas.getContext('2d')

    const width = img.naturalWidth
    const height = img.naturalHeight

    let rotatedCanvasWidth = width
    let rotatedCanvasHeight = height

    if (degrees === 90 || degrees === 270) {
      rotatedCanvasWidth = height
      rotatedCanvasHeight = width
    }

    offscreenCanvas.width = rotatedCanvasWidth
    offscreenCanvas.height = rotatedCanvasHeight

    offscreenCtx.save()
    // Translate to the center of the offscreen canvas, rotate, then draw original image
    offscreenCtx.translate(rotatedCanvasWidth / 2, rotatedCanvasHeight / 2)
    offscreenCtx.rotate(degrees * Math.PI / 180)
    offscreenCtx.drawImage(img, -width / 2, -height / 2) // Draw original image centered inside rotated context
    offscreenCtx.restore()

    return offscreenCanvas
  }

  /**
   * Load and display a map
   * @param {Object} mapData - Map metadata from storage
   * @param {File|Blob} imageSource - File object or Blob
   * MODIFIED: Store original image reference and create rotated bitmap.
   */
  async loadMap (mapData, imageSource) {
    try {
      this.currentMap = mapData

      if (!(imageSource instanceof File) && !(imageSource instanceof Blob)) {
        throw new Error('Invalid image source: must be File or Blob object.')
      }

      // Clean up previous image data object URL if it was a Blob
      if (this.originalImageData && this.originalImageData.src && this.originalImageData.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.originalImageData.src)
      }

      return new Promise((resolve, reject) => {
        const img = new Image()

        // Detect SVG maps (Phase 2: Full SVG support with rotation)
        this.isSvgMap = (mapData.fileType === 'image/svg+xml')

        img.onload = () => {
          this.originalImageData = img // Store reference to original Image object (unrotated)

          // For SVG, use the original image directly (rotation applied via canvas transforms)
          if (this.isSvgMap) {
            this.imageData = img
            console.log('SVG map loaded with rotation support (Phase 2)')
          } else {
            // Create the initial rotated bitmap using the currentMapRotation setting
            this.imageData = this._getRotatedImageCanvas(this.originalImageData, this.currentMapRotation)
          }

          this.resizeCanvas()
          this.fitToScreen()
          this.render()

          resolve()
        }

        img.onerror = () => {
          reject(new Error('Failed to load map image'))
        }
        img.src = URL.createObjectURL(imageSource) // img.src uses Blob URL
      })
    } catch (error) {
      console.error('MapRenderer: Error loading map:', error)
      throw error
    }
  }

  /**
   * Create a placeholder image for maps without file data
   * @param {Object} mapData - Map metadata
   * MODIFIED: Clear originalImageData when loading placeholder.
   */
  async loadPlaceholder (mapData) {
    try {
      this.currentMap = mapData
      this.imageData = null // Clear the rotated bitmap (canvas element)
      this.originalImageData = null // Clear original image reference
      this.markers = [] // Clear markers for placeholder
      this.isSvgMap = false // Reset SVG flag for placeholder

      this.render()
    } catch (error) {
      console.error('MapRenderer: Error loading placeholder:', error)
      throw error
    }
  }

  /**
   * Calculate scale and position to fit image to screen.
   * For SVG: calculates dimensions based on current rotation.
   * For raster: uses pre-rotated canvas dimensions.
   */
  fitToScreen () {
    if (!this.imageData || !this.canvas) {
      console.warn('MapRenderer: fitToScreen - No image data or canvas. Skipping.')
      return
    }

    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height

    let effectiveContentWidth, effectiveContentHeight

    if (this.isSvgMap) {
      // For SVG, calculate effective dimensions based on rotation
      const imgWidth = this.originalImageData.naturalWidth
      const imgHeight = this.originalImageData.naturalHeight

      if (this.currentMapRotation === 90 || this.currentMapRotation === 270) {
        effectiveContentWidth = imgHeight
        effectiveContentHeight = imgWidth
      } else {
        effectiveContentWidth = imgWidth
        effectiveContentHeight = imgHeight
      }
    } else {
      // For raster, use the pre-rotated canvas dimensions
      effectiveContentWidth = this.imageData.width
      effectiveContentHeight = this.imageData.height
    }

    console.log(`MapRenderer: fitToScreen - Canvas: ${canvasWidth}x${canvasHeight}, Image: ${effectiveContentWidth}x${effectiveContentHeight}.`)

    if (canvasWidth <= 0 || canvasHeight <= 0 || effectiveContentWidth <= 0 || effectiveContentHeight <= 0) {
      this.scale = 1
      this.offsetX = 0
      this.offsetY = 0
      console.warn('MapRenderer: fitToScreen - Invalid dimensions (0 or less). Resetting scale/offset.')
      return
    }

    const scaleX = canvasWidth / effectiveContentWidth
    const scaleY = canvasHeight / effectiveContentHeight
    this.scale = Math.min(scaleX, scaleY, 1)

    this.scale = Math.max(this.scale, this.minScale)

    // Calculate offsets based on current bitmap dimensions
    this.offsetX = (canvasWidth - effectiveContentWidth * this.scale) / 2
    this.offsetY = (canvasHeight - effectiveContentHeight * this.scale) / 2
  }

  /**
   * Render the current map on canvas.
   * MODIFIED: Simplified as imageData is an already rotated HTMLCanvasElement.
   */
  render () {
    if (!this.canvas || !this.ctx) return

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.imageData) {
      this.renderImage()
      this.renderMarkers()
    } else if (this.currentMap) {
      this.renderPlaceholder()
    } else {
      this.renderEmptyState()
    }

    if (this.showCrosshair) {
      this.drawCrosshair()
    }
    if (this.showDebugInfo) {
      this.renderDebugInfo()
    }
  }

  /**
   * Render the map image.
   * For raster images: draws the pre-rotated canvas bitmap.
   * For SVG images: applies rotation via canvas transform to preserve vector quality.
   */
  renderImage () {
    if (!this.imageData) return

    if (this.isSvgMap) {
      // SVG with CSS transform rotation (Phase 2)
      this.ctx.save()

      // Calculate dimensions based on rotation
      const imgWidth = this.originalImageData.naturalWidth
      const imgHeight = this.originalImageData.naturalHeight

      let rotatedWidth = imgWidth
      let rotatedHeight = imgHeight

      if (this.currentMapRotation === 90 || this.currentMapRotation === 270) {
        rotatedWidth = imgHeight
        rotatedHeight = imgWidth
      }

      // Calculate the center point for rotation
      const centerX = this.offsetX + (rotatedWidth * this.scale) / 2
      const centerY = this.offsetY + (rotatedHeight * this.scale) / 2

      // Apply transformations
      this.ctx.translate(centerX, centerY)
      this.ctx.rotate(this.currentMapRotation * Math.PI / 180)
      this.ctx.scale(this.scale, this.scale)

      // Draw image centered on rotation point
      this.ctx.drawImage(
        this.imageData,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      )

      this.ctx.restore()
    } else {
      // Raster image (already pre-rotated canvas)
      this.ctx.drawImage(
        this.imageData,
        this.offsetX,
        this.offsetY,
        this.imageData.width * this.scale,
        this.imageData.height * this.scale
      )
    }
  }

  /**
   * Render placeholder for maps without image data
   */
  renderPlaceholder () {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    this.ctx.fillStyle = '#f8fafc'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.strokeStyle = '#e2e8f0'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([10, 10])
    this.ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40)
    this.ctx.setLineDash([])

    this.ctx.font = '48px sans-serif'
    this.ctx.fillStyle = '#64748b'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('🗺️', centerX, centerY - 40)

    this.ctx.font = '20px sans-serif'
    this.ctx.fillStyle = '#0f172a'
    this.ctx.fillText(this.currentMap.name, centerX, centerY + 20)

    this.ctx.font = '14px sans-serif'
    this.ctx.fillStyle = '#64748b'
    this.ctx.fillText(
      `${this.currentMap.width} × ${this.currentMap.height} pixels`,
      centerX,
      centerY + 45
    )
  }

  /**
   * Render empty state when no map is loaded
   */
  renderEmptyState () {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    this.ctx.fillStyle = '#f0f0f0'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.font = '18px sans-serif'
    this.ctx.fillStyle = '#64748b'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('No map loaded', centerX, centerY - 10)
    this.ctx.fillText('Upload a map to get started', centerX, centerY + 15)
  }

  /**
   * Render debug information overlay
   */
  renderDebugInfo () {
    const padding = 10
    const lineHeight = 16
    let y = padding + lineHeight

    this.ctx.font = '12px monospace'
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'

    const info = [
      `Scale: ${this.scale.toFixed(3)}`,
      `Offset: ${this.offsetX.toFixed(0)}, ${this.offsetY.toFixed(0)}`,
      `Canvas: ${this.canvas.width}×${this.canvas.height}`
    ]
    if (this.imageData) {
      info.push(
        `Image: ${this.imageData.width}x${this.imageData.height}`, // Use imageData.width/height directly
        `Rendered: ${(this.imageData.width * this.scale).toFixed(0)}x${(this.imageData.height * this.scale).toFixed(0)}`,
        `Rotation: ${this.currentMapRotation}°` // Use currentMapRotation
      )
    }
    info.push(`Markers: ${this.markers.length}`)

    info.forEach(line => {
      this.ctx.fillText(line, padding, y)
      y += lineHeight
    })
  }

  /**
   * Draw a crosshair at the center of the canvas.
   */
  drawCrosshair () {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const crosshairSize = 15 // Length of each arm of the cross
    const crosshairThickness = 1
    const crosshairColor = 'rgba(255, 0, 0, 0.7)' // Semi-transparent red

    this.ctx.save()

    this.ctx.strokeStyle = crosshairColor
    this.ctx.lineWidth = crosshairThickness

    // Horizontal line
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - crosshairSize, centerY)
    this.ctx.lineTo(centerX + crosshairSize, centerY)
    this.ctx.stroke()

    // Vertical line
    this.ctx.beginPath()
    this.ctx.moveTo(centerX, centerY - crosshairSize)
    this.ctx.lineTo(centerX, centerY + crosshairSize)
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * Toggle the visibility of the crosshair.
   * @param {boolean} visible - Whether the crosshair should be visible.
   */
  toggleCrosshair (visible) {
    this.showCrosshair = visible
    this.render() // Re-render to show/hide the crosshair
  }

  /**
   * Set the map's current rotation. This will re-render the image with the new rotation.
   * This version attempts to preserve the current pan and zoom level, specifically
   * by ensuring the *center of the viewport* (where the crosshair is) remains focused
   * on the same point in map coordinates.
   * @param {number} degrees - The new rotation angle (0, 90, 180, 270).
   */
  setMapRotation (degrees) {
    const validDegrees = [0, 90, 180, 270]
    if (!validDegrees.includes(degrees)) {
      console.warn('MapRenderer: Invalid rotation degrees:', degrees, '. Must be 0, 90, 180, or 270.')
      return
    }

    if (!this.originalImageData) {
      // If no original image is loaded, just update the rotation property.
      // It will be applied when an image is eventually loaded.
      this.currentMapRotation = degrees
      console.warn('MapRenderer: Cannot immediately set rotation, no original image data loaded. Rotation will apply when map loads.')
      return
    }

    if (this.currentMapRotation === degrees) {
      // If the rotation is already at the desired angle, just re-render in case
      // other properties changed (e.g., markers updated, but rotation was not changed explicitly).
      this.render()
      return
    }

    // --- 1. Capture the current viewport center's *map coordinates* ---
    // This is the key to preserving the view. We convert the screen center
    // to a fixed point on the original (unrotated) map.
    const oldScale = this.scale
    const viewportCenterX = this.canvas.width / 2
    const viewportCenterY = this.canvas.height / 2
    const mapCenterPoint = this.screenToMap(viewportCenterX, viewportCenterY) // {x, y} in original map coords

    if (!mapCenterPoint) {
      console.error('MapRenderer: Could not determine map center point for rotation adjustment. Falling back to fitToScreen.')
      this.fitToScreen() // Fallback if coordinate conversion fails
      this.render()
      return
    }

    // --- 2. Update the map's rotation and re-create the rotated image ---
    this.currentMapRotation = degrees

    // For SVG, update rotation property only (rotation applied via transform in renderImage)
    // For raster images, recreate the rotated canvas bitmap
    if (!this.isSvgMap) {
      this.imageData = this._getRotatedImageCanvas(this.originalImageData, this.currentMapRotation)
    }

    // --- 3. Adjust canvas size (if responsive container changes dimensions) ---
    // This will update this.canvas.width/height if the container dictates a change.
    // We don't need its return value here, as we're explicitly setting pan/zoom.
    this.resizeCanvas()

    // --- 4. Re-calculate offsetX and offsetY to keep the 'mapCenterPoint' at 'viewportCenterX/Y' ---
    // First, find where our 'mapCenterPoint' *would* be on screen with the new rotation
    // if offsetX and offsetY were both 0 (relative to the newly rotated image).
    const newScreenCoordsOfMapCenter = this.mapToScreen(mapCenterPoint.x, mapCenterPoint.y)

    if (newScreenCoordsOfMapCenter) {
      // We want the 'mapCenterPoint' to appear at (viewportCenterX, viewportCenterY).
      // 'newScreenCoordsOfMapCenter' tells us where it is *now* (before adjusting offsets).
      // The difference is how much we need to shift our offsets.
      this.offsetX -= (newScreenCoordsOfMapCenter.x - viewportCenterX)
      this.offsetY -= (newScreenCoordsOfMapCenter.y - viewportCenterY)

      // Preserve the previous scale. This keeps the zoom level consistent.
      this.scale = oldScale

      // Ensure the scale remains within defined min/max bounds.
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale))
    } else {
      console.warn('MapRenderer: Failed to convert map center point to new screen coordinates after rotation. Falling back to fitToScreen.')
      this.fitToScreen() // Fallback if conversion fails unexpectedly
    }

    // --- 5. Re-render the canvas with the new rotation, pan, and zoom ---
    this.render()
  }

  /**
   * Get current map bounds for coordinate calculations
   */
  getMapBounds () {
    if (!this.imageData) return null

    let width, height

    if (this.isSvgMap) {
      // For SVG, calculate dimensions based on rotation
      const imgWidth = this.originalImageData.naturalWidth
      const imgHeight = this.originalImageData.naturalHeight

      if (this.currentMapRotation === 90 || this.currentMapRotation === 270) {
        width = imgHeight * this.scale
        height = imgWidth * this.scale
      } else {
        width = imgWidth * this.scale
        height = imgHeight * this.scale
      }
    } else {
      width = this.imageData.width * this.scale
      height = this.imageData.height * this.scale
    }

    return {
      x: this.offsetX,
      y: this.offsetY,
      width,
      height,
      scale: this.scale
    }
  }

  /**
 * Convert screen coordinates to map coordinates.
 * MODIFIED: Simplified - operates directly on the already rotated imageData.
 * @param {number} screenX - Screen X coordinate (raw canvas pixel)
 * @param {number} screenY - Screen Y coordinate (raw canvas pixel)
 * @returns {Object} Map coordinates (x,y relative to top-left of the original, unrotated image)
 */
  screenToMap (screenX, screenY) {
    if (!this.imageData || !this.originalImageData) return null

    // 1. Convert screen coords to coords on the *rotated* image bitmap (normalized between 0 and rotatedImage.width/height)
    const rotatedImageCoordsX = (screenX - this.offsetX) / this.scale
    const rotatedImageCoordsY = (screenY - this.offsetY) / this.scale

    let mapX, mapY
    const originalWidth = this.originalImageData.naturalWidth
    const originalHeight = this.originalImageData.naturalHeight

    switch (this.currentMapRotation) {
      case 0:
        mapX = rotatedImageCoordsX
        mapY = rotatedImageCoordsY
        break
      case 90:
      // A point (x', y') on the rotated image corresponds to (y', originalHeight - x') on the *original* image
      // rotatedImageCoordsX is x', rotatedImageCoordsY is y'
        mapX = rotatedImageCoordsY
        mapY = originalHeight - rotatedImageCoordsX
        break
      case 180:
      // A point (x', y') on the rotated image corresponds to (originalWidth - x', originalHeight - y') on the *original* image
      // rotatedImageCoordsX is x', rotatedImageCoordsY is y'
        mapX = originalWidth - rotatedImageCoordsX
        mapY = originalHeight - rotatedImageCoordsY
        break
      case 270:
      // A point (x', y') on the rotated image corresponds to (originalWidth - y', x') on the *original* image
      // rotatedImageCoordsX is x', rotatedImageCoordsY is y'
        mapX = originalWidth - rotatedImageCoordsY
        mapY = rotatedImageCoordsX
        break
      default:
        console.warn('MapRenderer: screenToMap - Unknown rotation, defaulting to 0.')
        mapX = rotatedImageCoordsX
        mapY = rotatedImageCoordsY
    }

    return { x: mapX, y: mapY }
  }

  /**
   * Convert map coordinates to screen coordinates.
   * MODIFIED: Simplified - operates directly on the already rotated imageData.
   * @param {number} mapX - Map X coordinate (x,y relative to top-left of the original, unrotated image)
   * @param {number} mapY - Map Y coordinate (x,y relative to top-left of the original, unrotated image)
   * @returns {Object} Screen coordinates (raw canvas pixel)
   */
  mapToScreen (mapX, mapY) {
    if (!this.imageData || !this.originalImageData) return null

    // First convert from *original* map coords to *rotated* map coords
    let rotatedMapX, rotatedMapY
    const originalWidth = this.originalImageData.naturalWidth
    const originalHeight = this.originalImageData.naturalHeight

    switch (this.currentMapRotation) {
      case 0:
        rotatedMapX = mapX
        rotatedMapY = mapY
        break
      case 90: // Original (x,y) -> Rotated (OriginalHeight - y, x)
        rotatedMapX = originalHeight - mapY
        rotatedMapY = mapX
        break
      case 180: // Original (x,y) -> Rotated (OriginalWidth - x, OriginalHeight - y)
        rotatedMapX = originalWidth - mapX
        rotatedMapY = originalHeight - mapY
        break
      case 270: // Original (x,y) -> Rotated (y, OriginalWidth - x)
        rotatedMapX = mapY
        rotatedMapY = originalWidth - mapX
        break
      default:
        // Should not happen, but default to simple conversion
        rotatedMapX = mapX
        rotatedMapY = mapY
    }

    // Now convert rotated map coords to screen coords
    const screenX = rotatedMapX * this.scale + this.offsetX
    const screenY = rotatedMapY * this.scale + this.offsetY

    return { x: screenX, y: screenY }
  }

  /**
   * Converts a screen-space vector (deltaX, deltaY) into a map-space vector,
   * accounting for current rotation and scale.
   * This is useful for drag operations where the movement on screen
   * needs to be translated to movement on the original unrotated map.
   * @param {number} deltaScreenX - The change in X in screen coordinates.
   * @param {number} deltaScreenY - The change in Y in screen coordinates.
   * @returns {{mapDeltaX: number, mapDeltaY: number}} The corresponding change in map coordinates.
   */
  screenVectorToMapVector (deltaScreenX, deltaScreenY) {
    // First, convert screen deltas to deltas on the *rotated* image bitmap (imageData.width/height)
    const rotatedMapDeltaX = deltaScreenX / this.scale
    const rotatedMapDeltaY = deltaScreenY / this.scale

    let mapDeltaX, mapDeltaY

    // Now convert these deltas from *rotated* map space back to *original* map space
    switch (this.currentMapRotation) {
      case 0:
        mapDeltaX = rotatedMapDeltaX
        mapDeltaY = rotatedMapDeltaY
        break
      case 90:
        // A movement right on screen (+deltaScreenX) was a movement down on original map (+mapDeltaY)
        // A movement down on screen (+deltaScreenY) was a movement left on original map (-mapDeltaX)
        mapDeltaX = rotatedMapDeltaY
        mapDeltaY = -rotatedMapDeltaX
        break
      case 180:
        // A movement right on screen (+deltaScreenX) was a movement left on original map (-mapDeltaX)
        // A movement down on screen (+deltaScreenY) was a movement up on original map (-mapDeltaY)
        mapDeltaX = -rotatedMapDeltaX
        mapDeltaY = -rotatedMapDeltaY
        break
      case 270:
        // A movement right on screen (+deltaScreenX) was a movement up on original map (-mapDeltaY)
        // A movement down on screen (+deltaScreenY) was a movement right on original map (+mapDeltaX)
        mapDeltaX = -rotatedMapDeltaY
        mapDeltaY = rotatedMapDeltaX
        break
      default:
        mapDeltaX = rotatedMapDeltaX
        mapDeltaY = rotatedMapDeltaY
    }
    return { mapDeltaX, mapDeltaY }
  }

  /**
   * Zoom in/out by a factor or to a specific scale.
   * @param {number} factor - Zoom factor (e.g., 1.2 for 20% zoom in) OR
   *                          If newScaleValue is provided, this acts as the factor to multiply current scale by.
   * @param {number} centerX - Zoom center X (optional)
   * @param {number} centerY - Zoom center Y (optional)
   * @param {number} [newScaleValue] - Optional. If provided, zoom directly to this scale.
   */
  zoom (factor, centerX = null, centerY = null, newScaleValue = null) {
    if (!this.imageData) return

    const oldScale = this.scale
    let newScale

    if (newScaleValue !== null) {
      newScale = newScaleValue
    } else {
      newScale = this.scale * factor
    }

    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale))

    if (newScale === this.scale) return // No change

    // Use canvas center if no center specified
    const zoomCenterX = centerX !== null ? centerX : this.canvas.width / 2
    const zoomCenterY = centerY !== null ? centerY : this.canvas.height / 2

    // Calculate new offset to zoom around the specified point
    const scaleDiff = newScale / oldScale
    this.offsetX = zoomCenterX - (zoomCenterX - this.offsetX) * scaleDiff
    this.offsetY = zoomCenterY - (zoomCenterY - this.offsetY) * scaleDiff
    this.scale = newScale

    this.render()
  }

  /**
   * Pan the map by a delta
   * @param {number} deltaX - X offset change
   * @param {number} deltaY - Y offset change
   */
  pan (deltaX, deltaY) {
    this.offsetX += deltaX
    this.offsetY += deltaY
    this.render()
  }

  /**
   * Reset view to fit screen
   */
  resetView () {
    this.fitToScreen()
    this.render()
  }

  /**
   * Get current view state
   */
  getViewState () {
    return {
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      mapId: this.currentMap ? this.currentMap.id : null
    }
  }

  /**
   * Set view state
   * @param {Object} state - View state object
   */
  setViewState (state) {
    if (state.scale !== undefined) this.scale = state.scale
    if (state.offsetX !== undefined) this.offsetX = state.offsetX
    if (state.offsetY !== undefined) this.offsetY = state.offsetY
    this.render()
  }

  /**
   * Pans the map to bring the specified map coordinates into view,
   * optionally zooming to a target scale, respecting current map rotation.
   * @param {number} mapX - The X coordinate in map (original image) space.
   * @param {number} mapY - The Y coordinate in map (original image) space.
   * @param {number} [targetScaleFactor=this.scale] - Desired zoom level.
   *                                            If less than 1.0, it's a factor of current scale.
   *                                            If 1.0 or greater, it's an absolute scale clamped.
   */
  panAndZoomToCoordinates (mapX, mapY, targetScaleFactor = this.scale) {
    if (!this.imageData || !this.originalImageData) {
      console.warn('MapRenderer: Cannot pan and zoom, no image data loaded.')
      return
    }

    // Determine target scale
    let newScale
    if (targetScaleFactor < 1.0 && targetScaleFactor !== 0) { // Factor, e.g., 0.8
      newScale = this.scale * targetScaleFactor
    } else if (targetScaleFactor >= 1.0) { // Absolute target scale
      newScale = targetScaleFactor
    } else { // Fallback, use current scale
      newScale = this.scale
    }
    // Clamp the new scale
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale))

    // --- Extract the core transformed coordinates from mapToScreen logic ---
    // This part of mapToScreen calculates where the mapX, mapY would be
    // on the *rotated* image canvas at 1x scale, with 0 offset.
    let rotatedMapX, rotatedMapY
    const originalWidth = this.originalImageData.naturalWidth
    const originalHeight = this.originalImageData.naturalHeight

    switch (this.currentMapRotation) {
      case 0:
        rotatedMapX = mapX
        rotatedMapY = mapY
        break
      case 90:
        rotatedMapX = originalHeight - mapY
        rotatedMapY = mapX
        break
      case 180:
        rotatedMapX = originalWidth - mapX
        rotatedMapY = originalHeight - mapY
        break
      case 270:
        rotatedMapX = mapY
        rotatedMapY = originalWidth - mapX
        break
      default:
        rotatedMapX = mapX
        rotatedMapY = mapY
    }
    // --- End extraction ---

    // Now, calculate the new offsets directly.
    // We want the point (rotatedMapX, rotatedMapY)
    // when scaled by `newScale`, to appear at the center of the canvas.
    // screen_center = rotated_point_scaled + new_offset
    this.offsetX = (this.canvas.width / 2) - (rotatedMapX * newScale)
    this.offsetY = (this.canvas.height / 2) - (rotatedMapY * newScale)
    this.scale = newScale

    this.render()
  }

  /**
   * Temporarily highlights a marker by its ID. The highlight fades after a few seconds.
   * @param {string} markerId - The ID of the marker to highlight.
   */
  highlightMarker (markerId) {
    // Clear any existing highlight and timeout
    if (this._highlightTimeout) {
      clearTimeout(this._highlightTimeout)
      this._highlightTimeout = null
    }
    this._highlightedMarkerId = null // Clear previous highlight visually on next render if needed

    const markerToHighlight = this.markers.find(m => m.id === markerId)
    if (markerToHighlight) {
      this._highlightedMarkerId = markerId
      this.render() // Re-render immediately to show highlight

      this._highlightTimeout = setTimeout(() => {
        this._highlightedMarkerId = null // Remove highlight
        this.render() // Re-render to remove highlight
        this._highlightTimeout = null
      }, 5000) // Highlight for 5 seconds
    } else {
      console.warn(`MapRenderer: Marker ${markerId} not found, cannot highlight.`)
    }
  }

  /**
   * Set the markers to be rendered.
   * @param {Array} markersArray - An array of marker objects.
   */
  setMarkers (markersArray) {
    this.markers = markersArray || []
    // No immediate render call here, as app.js will call render after setting markers.
    // This avoids redundant renders if multiple state changes happen together.
  }

  /**
   * Render all current markers on the canvas.
   * Phase 3: Unified loop with type-definition-based shape dispatch and chronological numbering.
   */
  renderMarkers () {
    if (!this.markers || this.markers.length === 0) return

    // Separate line-pair markers for connector rendering (drawn first, behind everything)
    const linePairMarkers = this.markers.filter(marker => {
      const typeDef = this.getEffectiveTypeDef(marker)
      const behavior = this._getBehavior(marker, typeDef)
      return behavior === 'line-pair'
    })

    // Draw line connectors behind markers
    this.renderLineConnectors(linePairMarkers)

    // Build chronological number map for all markers whose type supports photos/numbers
    const numberedMarkers = this.markers
      .filter(marker => {
        const typeDef = this.getEffectiveTypeDef(marker)
        return typeDef && typeDef.supportsPhotos !== false
      })
      .sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate))

    const numberMap = new Map(numberedMarkers.map((m, i) => [m.id, i + 1]))

    // Sort all markers chronologically for consistent rendering order
    const sortedMarkers = [...this.markers].sort((a, b) =>
      new Date(a.createdDate) - new Date(b.createdDate)
    )

    // Unified render pass
    sortedMarkers.forEach((marker) => {
      const screenCoords = this.mapToScreen(marker.x, marker.y)
      if (
        screenCoords &&
        screenCoords.x > -20 && screenCoords.x < this.canvas.width + 20 &&
        screenCoords.y > -20 && screenCoords.y < this.canvas.height + 20
      ) {
        const typeDef = this.getEffectiveTypeDef(marker)
        const showNumber = typeDef && typeDef.showNumber !== false && numberMap.has(marker.id)
        const number = showNumber ? numberMap.get(marker.id) : null
        this.drawMarker(screenCoords.x, screenCoords.y, number, marker)
      }
    })
  }

  /**
   * Clip a line segment to the canvas boundaries using the Liang-Barsky algorithm.
   * Given two screen-space points, returns the clipped segment endpoints,
   * or null if the line is entirely outside the canvas.
   * @param {number} x0 - Start point X in screen coords
   * @param {number} y0 - Start point Y in screen coords
   * @param {number} x1 - End point X in screen coords
   * @param {number} y1 - End point Y in screen coords
   * @returns {{ x0: number, y0: number, x1: number, y1: number } | null}
   */
  clipLineToCanvas (x0, y0, x1, y1) {
    const xmin = 0
    const ymin = 0
    const xmax = this.canvas.width
    const ymax = this.canvas.height

    const dx = x1 - x0
    const dy = y1 - y0

    // Parametric: P(t) = P0 + t * (P1 - P0), t in [0, 1]
    const p = [-dx, dx, -dy, dy]
    const q = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0]

    let t0 = 0
    let t1 = 1

    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        // Line is parallel to this edge
        if (q[i] < 0) {
          return null // Line is entirely outside
        }
      } else {
        const t = q[i] / p[i]
        if (p[i] < 0) {
          // Entering the clipping boundary
          if (t > t0) t0 = t
        } else {
          // Leaving the clipping boundary
          if (t < t1) t1 = t
        }
      }
    }

    if (t0 > t1) return null // Line is entirely outside

    return {
      x0: x0 + t0 * dx,
      y0: y0 + t0 * dy,
      x1: x0 + t1 * dx,
      y1: y0 + t1 * dy
    }
  }

  renderLineConnectors (lineMarkers) {
    if (!lineMarkers || lineMarkers.length === 0) return

    const markersByGroup = new Map()

    lineMarkers.forEach(marker => {
      if (!marker.lineGroupId) return
      if (!markersByGroup.has(marker.lineGroupId)) {
        markersByGroup.set(marker.lineGroupId, [])
      }
      markersByGroup.get(marker.lineGroupId).push(marker)
    })

    markersByGroup.forEach(groupMarkers => {
      if (groupMarkers.length < 2) return

      const firstMarker = groupMarkers[0]
      const secondMarker = groupMarkers[1]
      const firstScreen = this.mapToScreen(firstMarker.x, firstMarker.y)
      const secondScreen = this.mapToScreen(secondMarker.x, secondMarker.y)

      if (!firstScreen || !secondScreen) return

      // Clip the line segment to the visible canvas area
      const clipped = this.clipLineToCanvas(
        firstScreen.x, firstScreen.y,
        secondScreen.x, secondScreen.y
      )

      // Line is entirely outside the canvas — nothing to draw
      if (!clipped) return

      const lineColor = firstMarker.lineColor || secondMarker.lineColor || '#e53e3e'
      const lineCaption = (firstMarker.lineCaption || secondMarker.lineCaption || '').trim()

      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.moveTo(clipped.x0, clipped.y0)
      this.ctx.lineTo(clipped.x1, clipped.y1)
      this.ctx.strokeStyle = lineColor
      this.ctx.lineWidth = 3
      this.ctx.lineCap = 'round'
      this.ctx.stroke()

      if (lineCaption) {
        // Place caption at the midpoint of the visible (clipped) segment
        const midX = (clipped.x0 + clipped.x1) / 2
        const midY = (clipped.y0 + clipped.y1) / 2

        this.ctx.font = 'bold 14px Arial, sans-serif'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        this.ctx.fillText(lineCaption, midX + 1, midY + 1)

        this.ctx.fillStyle = lineColor
        this.ctx.fillText(lineCaption, midX, midY)
      }

      this.ctx.restore()
    })
  }

  /**
   * Set whether markers should be rendered as editable.
   * @param {boolean} editable - True if markers should appear editable (unlocked), false otherwise (locked).
   */
  setMarkersEditable (editable) {
    if (this.markersAreEditable !== editable) {
      this.markersAreEditable = editable
      this.render() // Re-render to update marker appearance
    }
  }

  /**
   * Get the properties of the currently active marker display size.
   * @returns {Object} An object containing radius and fontSizeFactor.
   */
  getCurrentMarkerDisplaySize () {
    return this.markerSizeSettings[this.markerCurrentDisplaySizeKey]
  }

  /**
   * Set the display size of the markers.
   * @param {string} sizeKey - 'normal', 'large', or 'extraLarge'.
   */
  setMarkerDisplaySize (sizeKey) {
    if (this.markerSizeSettings[sizeKey]) {
      this.markerCurrentDisplaySizeKey = sizeKey
      this.render() // Re-render to show updated marker sizes
    } else {
      console.warn('MapRenderer: Invalid marker size key:', sizeKey, '. Keeping current size.')
    }
  }

  /**
   * Checks if a given description matches the default "Marker at X, Y" pattern.
   * @param {string} description - The marker description to check.
   * @returns {boolean} True if it's a default description, false otherwise.
   * @private
   */
  _isDefaultMarkerDescription (description) {
    // Regex to match "Marker at X, Y" where X and Y are numbers
    const defaultPattern = /^Marker at \d+, \d+$/
    return defaultPattern.test(description.trim())
  }

  /**
   * Draw a single marker on the canvas.
   * Phase 3: Type-definition-driven shape dispatch. Replaces the binary type==='line' check
   * with a lookup-based approach supporting circle, square, diamond, and arrow shapes.
   * @param {number} x - Screen X coordinate of the marker center.
   * @param {number} y - Screen Y coordinate of the marker center.
   * @param {number|null} number - Optional number to display on the marker (null for line/arrow/diamond).
   * @param {Object} marker - The full marker object.
   */
  drawMarker (x, y, number, marker) {
    const typeDef = this.getEffectiveTypeDef(marker)
    const behavior = this._getBehavior(marker, typeDef)

    // --- Size calculation ---
    // Map type definition size to base size, then scale by global display size setting
    const TYPE_SIZE_MAP = {
      small: { radius: 8, fontSizeFactor: 0.85 },
      normal: { radius: 12, fontSizeFactor: 1.0 },
      large: { radius: 18, fontSizeFactor: 1.2 }
    }
    const baseSizeConfig = TYPE_SIZE_MAP[typeDef.size] || TYPE_SIZE_MAP.normal
    const globalSize = this.markerSizeSettings[this.markerCurrentDisplaySizeKey]
    const globalScale = globalSize.radius / 12 // 12 is normal baseline
    const radius = baseSizeConfig.radius * globalScale
    const fontSize = radius * baseSizeConfig.fontSizeFactor

    // --- Color determination ---
    const { fillColor, borderColor, textColor } = this._determineMarkerColors(marker, typeDef)

    // --- Highlight ring (drawn first, behind the marker) ---
    this._drawHighlightRing(x, y, radius, marker)

    // --- Behavior dispatch ---
    if (behavior === 'line-pair') {
      // Line markers: always diamond shape with line connector (no numbering)
      this._drawDiamondShape(x, y, radius, fillColor, borderColor, null, null, null, marker)
      return
    }

    // Point behavior: shape dispatch
    switch (typeDef.shape) {
      case 'circle':
        this._drawCircleShape(x, y, radius, fillColor, borderColor, number, fontSize, textColor)
        break
      case 'square':
        this._drawSquareShape(x, y, radius, fillColor, borderColor, number, fontSize, textColor)
        break
      case 'diamond':
        this._drawDiamondShape(x, y, radius, fillColor, borderColor, number, fontSize, textColor, marker)
        break
      case 'arrow':
        this._drawArrowShape(x, y, radius, fillColor, number, fontSize, textColor, marker)
        break
    }

    // --- Label rendering (for types with a label) ---
    if (typeDef.label && typeDef.label.trim()) {
      this._drawTypeLabel(x, y, radius, typeDef.label.trim(), typeDef.color)
    }
  }

  /**
   * Determine fill, border, and text colors for a marker based on its type definition,
   * editable/locked state, photo status, and custom coloring rules.
   * Phase 3: Uses type definition color as the locked-state base color.
   * @returns {{ fillColor: string, borderColor: string, textColor: string }}
   */
  _determineMarkerColors (marker, typeDef) {
    const isEditable = this.markersAreEditable
    const hasPhotos = marker.hasPhotos
    const behavior = this._getBehavior(marker, typeDef)

    // 1. Per-marker lineColor override (line-pair markers only) — highest precedence
    if (behavior === 'line-pair' && marker.lineColor) {
      if (isEditable) {
        return {
          fillColor: marker.lineColor,
          borderColor: '#ffffff',
          textColor: '#ffffff'
        }
      }
      return {
        fillColor: marker.lineColor,
        borderColor: this._darkenColor(marker.lineColor, 0.15),
        textColor: '#ffffff'
      }
    }

    // 2. Determine base color: custom rule wins over type definition
    let baseColor = typeDef.color || '#6b7280'
    if (!marker.markerTypeId) {
      const customColor = this._applyCustomColorRules(marker)
      if (customColor) {
        baseColor = customColor
      }
    }

    // 3. Apply state modifiers on top of the base color
    if (isEditable) {
      // Editable (unlocked) state: saturate + brighten the base color
      const saturated = this._saturateColor(baseColor, 1.0)
      if (hasPhotos) {
        const brightened = this._lightenColor(saturated, 0.2)
        return {
          fillColor: brightened,
          borderColor: this._darkenColor(brightened, 0.15),
          textColor: '#ffffff'
        }
      } else {
        return {
          fillColor: saturated,
          borderColor: this._darkenColor(saturated, 0.15),
          textColor: '#1f2937'
        }
      }
    } else {
      // Locked state: base color is used directly
      if (hasPhotos) {
        return {
          fillColor: baseColor,
          borderColor: this._darkenColor(baseColor, 0.15),
          textColor: '#ffffff'
        }
      } else {
        return {
          fillColor: this._lightenColor(baseColor, 0.30),
          borderColor: this._darkenColor(baseColor, 0.15),
          textColor: '#374151'
        }
      }
    }
  }

  /**
   * Apply legacy custom coloring rules to a marker.
   * @returns {string|null} The custom color hex if a rule matched, null otherwise
   */
  _applyCustomColorRules (marker) {
    for (let i = this.customColorRules.length - 1; i >= 0; i--) {
      const rule = this.customColorRules[i]
      if (!rule) continue

      const markerDescription = marker.description || ''
      const processedDescription = this._isDefaultMarkerDescription(markerDescription) ? '' : markerDescription

      let ruleMatches = false
      switch (rule.operator) {
        case 'isEmpty':
          ruleMatches = processedDescription.trim() === ''
          break
        case 'isNotEmpty':
          ruleMatches = processedDescription.trim() !== ''
          break
        case 'contains':
          ruleMatches = markerDescription.toLowerCase().includes(rule.value.toLowerCase())
          break
      }

      if (ruleMatches) {
        return rule.color
      }
    }
    return null
  }

  /**
   * Draw the highlight ring around a marker when it's the highlighted marker.
   */
  _drawHighlightRing (x, y, radius, marker) {
    if (this._highlightedMarkerId !== marker.id) return

    const highlightRadius = radius * 1.5
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(x, y, highlightRadius, 0, Math.PI * 2, false)
    this.ctx.strokeStyle = '#3b82f6'
    this.ctx.lineWidth = 4
    this.ctx.stroke()
    this.ctx.restore()
  }

  // --- Shape Drawing Methods ---

  /**
   * Draw a circle-shaped marker.
   */
  _drawCircleShape (x, y, radius, fillColor, borderColor, number, fontSize, textColor) {
    this.ctx.save()

    if (this.markersAreEditable) {
      this.ctx.shadowColor = fillColor
      this.ctx.shadowBlur = 10
    }

    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = fillColor
    this.ctx.fill()
    this.ctx.strokeStyle = borderColor
    this.ctx.lineWidth = 1.5
    this.ctx.stroke()

    // Draw number
    if (number !== null) {
      this.ctx.font = `${fontSize}px Arial, sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillStyle = textColor
      this.ctx.fillText(String(number), x, y + 1)
    }

    this.ctx.restore()
  }

  /**
   * Draw a square-shaped marker.
   */
  _drawSquareShape (x, y, radius, fillColor, borderColor, number, fontSize, textColor) {
    this.ctx.save()

    if (this.markersAreEditable) {
      this.ctx.shadowColor = fillColor
      this.ctx.shadowBlur = 10
    }

    this.ctx.fillStyle = fillColor
    this.ctx.strokeStyle = borderColor
    this.ctx.lineWidth = 1.5
    this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    this.ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2)

    // Draw number
    if (number !== null) {
      this.ctx.font = `${fontSize}px Arial, sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillStyle = textColor
      this.ctx.fillText(String(number), x, y + 1)
    }

    this.ctx.restore()
  }

  /**
   * Draw a diamond-shaped marker (45° rotated square).
   */
  _drawDiamondShape (x, y, radius, fillColor, borderColor, number, fontSize, textColor, marker) {
    this.ctx.save()

    if (this.markersAreEditable) {
      this.ctx.shadowColor = fillColor
      this.ctx.shadowBlur = 10
    }

    this.ctx.translate(x, y)
    this.ctx.rotate(Math.PI / 4)
    this.ctx.fillStyle = fillColor
    this.ctx.strokeStyle = this.markersAreEditable ? '#ffffff' : borderColor
    this.ctx.lineWidth = this.markersAreEditable ? 2 : 1.5
    this.ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
    this.ctx.strokeRect(-radius, -radius, radius * 2, radius * 2)

    this.ctx.restore()

    // Draw number (unrotated, centered on marker)
    if (number !== null && fontSize && textColor) {
      this.ctx.save()
      this.ctx.font = `${fontSize}px Arial, sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillStyle = textColor
      this.ctx.fillText(String(number), x, y + 1)
      this.ctx.restore()
    }
  }

  /**
   * Draw an arrow-shaped marker with stem and arrowhead.
   * Direction comes from marker.direction (0-360°, 0° = up).
   * Map rotation is composed with the arrow direction so the arrow points
   * to the same geographic direction regardless of map rotation.
   */
  _drawArrowShape (x, y, radius, color, number, fontSize, textColor, marker) {
    this.ctx.save()

    if (this.markersAreEditable) {
      this.ctx.shadowColor = color
      this.ctx.shadowBlur = 10
    }

    // Compose arrow direction with map rotation
    // marker.direction is stored in original map coordinate space (0° = up on unrotated map)
    // Add currentMapRotation so the arrow points to the same geographic direction
    const direction = marker.direction || 0
    const effectiveDirection = (direction + this.currentMapRotation) % 360

    this.ctx.translate(x, y)
    this.ctx.rotate(effectiveDirection * Math.PI / 180)

    // Draw stem (line from center upward)
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(0, -radius * 2)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Draw arrowhead (triangle at tip)
    this.ctx.beginPath()
    this.ctx.moveTo(0, -radius * 2) // Tip
    this.ctx.lineTo(-radius * 0.8, -radius * 1.2) // Left wing
    this.ctx.lineTo(radius * 0.8, -radius * 1.2) // Right wing
    this.ctx.closePath()
    this.ctx.fillStyle = color
    this.ctx.fill()

    this.ctx.restore()

    // Draw number at center (unrotated, always upright and readable)
    if (number !== null && fontSize && textColor) {
      this.ctx.save()
      this.ctx.font = `bold ${fontSize}px Arial, sans-serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      // White text with dark outline for readability over arrow stem
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      this.ctx.lineWidth = 3
      this.ctx.strokeText(String(number), x, y + 1)
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText(String(number), x, y + 1)
      this.ctx.restore()
    }
  }

  /**
   * Draw a type label near the marker with a semi-transparent white pill background.
   */
  _drawTypeLabel (x, y, radius, label, color) {
    this.ctx.save()

    this.ctx.font = 'bold 10px sans-serif'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'

    const textMetrics = this.ctx.measureText(label)
    const labelWidth = textMetrics.width + 6
    const labelHeight = 14
    const labelX = x + radius + 2
    const labelY = y + radius + 2

    // Semi-transparent white pill background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    const pillRadius = 7
    this.ctx.beginPath()
    this.ctx.moveTo(labelX + pillRadius, labelY)
    this.ctx.lineTo(labelX + labelWidth - pillRadius, labelY)
    this.ctx.arc(labelX + labelWidth - pillRadius, labelY + pillRadius, pillRadius, -Math.PI / 2, Math.PI / 2)
    this.ctx.lineTo(labelX + pillRadius, labelY + labelHeight)
    this.ctx.arc(labelX + pillRadius, labelY + pillRadius, pillRadius, Math.PI / 2, -Math.PI / 2)
    this.ctx.closePath()
    this.ctx.fill()

    // Label text
    this.ctx.fillStyle = color
    this.ctx.fillText(label, labelX + 3, labelY + 1)

    this.ctx.restore()
  }

  /**
   * Toggle debug info display
   */
  toggleDebugInfo () {
    this.showDebugInfo = !this.showDebugInfo
    this.render()
  }

  /**
   * Format file size for display
   */
  formatFileSize (bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Clean up resources
   * MODIFIED: Also revoke originalImageData object URL
   */
  dispose () {
    // Clean up any object URLs or resources
    if (this.originalImageData && this.originalImageData.src && this.originalImageData.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.originalImageData.src)
    }

    this.imageData = null // The canvas element itself
    this.originalImageData = null // The original Image object
    this.currentMap = null
    this.markers = [] // Clear markers on dispose
    this.markerTypeDefinitions = new Map() // Clear type definitions

    console.log('MapRenderer: Resources cleaned up')
  }
}
