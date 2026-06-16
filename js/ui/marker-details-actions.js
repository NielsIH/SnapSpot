/**
 * SnapSpot PWA - Marker Details Actions
 * Handles event listeners and action logic for marker details modal
 */

/* global confirm */

/**
 * Setup modal close handlers
 * @param {HTMLElement} modal - The modal element
 * @param {Object} modalManager - Modal manager instance
 * @param {Function} onClose - Callback when modal is closed
 */
export function setupCloseHandlers (modal, modalManager, onClose) {
  const closeModal = () => {
    modalManager.closeModal(modal)
    if (onClose) onClose()
  }

  modal.querySelector('.modal-close')?.addEventListener('click', closeModal)
  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal)
}

/**
 * Setup description edit mode toggle functionality
 * @param {HTMLElement} modal - The modal element
 * @param {Object} markerDetails - Marker data
 * @param {Function} onEditMarker - Callback when edit mode starts
 * @param {Function} onSaveDescription - Callback when description is saved
 * @param {string} metadataEditHtml - HTML for metadata edit form (optional)
 * @param {Object} storage - MapStorage instance (optional)
 * @param {Array<Object>} metadataDefinitions - Metadata definitions (optional)
 * @returns {Function} toggleEditMode function for external use
 */
export function setupDescriptionEditHandlers (modal, markerDetails, onEditMarker, onSaveDescription, metadataEditHtml = '', storage = null, metadataDefinitions = []) {
  const descriptionDisplay = modal.querySelector('.marker-description-display')
  const descriptionEdit = modal.querySelector('.marker-description-edit')
  const metadataEditContainer = modal.querySelector('#marker-metadata-edit')
  const editButton = modal.querySelector('#btn-edit-marker')
  const saveButton = modal.querySelector('#btn-save-description')
  const cancelButton = modal.querySelector('#btn-cancel-description-edit')
  const addPhotosButton = modal.querySelector('#btn-add-photos')
  const deleteMarkerButton = modal.querySelector('#btn-delete-marker')

  /**
   * Toggle between view and edit modes for description
   * @param {boolean} isEditing - Whether to enter edit mode
   * @param {string} updatedMetadataEditHtml - Optional updated metadata edit HTML
   */
  const toggleEditMode = (isEditing, updatedMetadataEditHtml = null) => {
    const metadataViewContainer = modal.querySelector('#marker-metadata-view')

    if (isEditing) {
      descriptionDisplay.classList.add('hidden')
      descriptionEdit.classList.remove('hidden')

      // Hide metadata view
      if (metadataViewContainer) {
        metadataViewContainer.classList.add('hidden')
      }

      // Show metadata edit form if available
      if (metadataEditContainer) {
        const htmlToUse = updatedMetadataEditHtml || metadataEditHtml
        if (htmlToUse) {
          metadataEditContainer.innerHTML = htmlToUse
          metadataEditContainer.classList.remove('hidden')
        }
      }

      // Phase 4: Direction section toggle
      const directionView = modal.querySelector('#direction-view')
      const directionEdit = modal.querySelector('#direction-edit')
      if (directionView) directionView.classList.add('hidden')
      if (directionEdit) directionEdit.classList.remove('hidden')

      // Phase 4: Type info toggle
      const typeDisplay = modal.querySelector('.marker-type-display')
      const typeEdit = modal.querySelector('.marker-type-edit')
      if (typeDisplay) typeDisplay.classList.add('hidden')
      if (typeEdit) typeEdit.classList.remove('hidden')

      editButton.classList.add('hidden')
      saveButton.classList.remove('hidden')
      cancelButton.classList.remove('hidden')
      addPhotosButton.disabled = true
      deleteMarkerButton.disabled = true
      descriptionEdit.focus()
      descriptionEdit.setSelectionRange(descriptionEdit.value.length, descriptionEdit.value.length)

      // Phase 4: Draw initial direction preview
      const directionPreview = modal.querySelector('#direction-preview-canvas')
      const directionSlider = modal.querySelector('#direction-slider')
      if (directionPreview && directionSlider) {
        drawDirectionPreview(directionPreview, parseInt(directionSlider.value))
      }
    } else {
      descriptionDisplay.classList.remove('hidden')
      descriptionEdit.classList.add('hidden')

      // Show metadata view
      if (metadataViewContainer) {
        metadataViewContainer.classList.remove('hidden')
      }

      // Hide metadata edit form
      if (metadataEditContainer) {
        metadataEditContainer.classList.add('hidden')
        metadataEditContainer.innerHTML = ''
      }

      // Phase 4: Hide direction edit, show view
      const directionView = modal.querySelector('#direction-view')
      const directionEdit = modal.querySelector('#direction-edit')
      if (directionView) directionView.classList.remove('hidden')
      if (directionEdit) directionEdit.classList.add('hidden')

      // Phase 4: Hide type edit, show display
      const typeDisplay = modal.querySelector('.marker-type-display')
      const typeEdit = modal.querySelector('.marker-type-edit')
      if (typeDisplay) typeDisplay.classList.remove('hidden')
      if (typeEdit) typeEdit.classList.add('hidden')

      editButton.classList.remove('hidden')
      saveButton.classList.add('hidden')
      cancelButton.classList.add('hidden')
      addPhotosButton.disabled = false
      deleteMarkerButton.disabled = false
    }
  }

  // Edit button - enter edit mode
  editButton?.addEventListener('click', async () => {
    // If we have storage and definitions, reload metadata to get current values
    let currentMetadataEditHtml = metadataEditHtml
    if (storage && metadataDefinitions && metadataDefinitions.length > 0) {
      const { loadMetadata, generateInlineEditHtml } = await import('./marker-details-metadata.js')
      const mapId = markerDetails.mapId || 'global'
      const { definitions, values } = await loadMetadata(storage, markerDetails.id, mapId)
      currentMetadataEditHtml = generateInlineEditHtml(definitions, values)
    }

    toggleEditMode(true, currentMetadataEditHtml)
    if (onEditMarker) onEditMarker(markerDetails.id)
  })

  // Save button - save description, metadata, direction, and type
  saveButton?.addEventListener('click', async () => {
    const newDescription = descriptionEdit.value.trim()

    // Save metadata first if storage and definitions are available
    if (storage && metadataDefinitions && metadataDefinitions.length > 0) {
      const { saveMetadataValues, loadMetadata, generateInlineViewHtml } = await import('./marker-details-metadata.js')
      const metadataSaved = await saveMetadataValues(modal, storage, markerDetails.id, metadataDefinitions)
      if (!metadataSaved) {
        // Validation failed, stay in edit mode
        return
      }

      // Reload metadata and update view
      const mapId = markerDetails.mapId || 'global'
      const { definitions, values } = await loadMetadata(storage, markerDetails.id, mapId)
      const viewHtml = generateInlineViewHtml(definitions, values)
      const metadataViewContainer = modal.querySelector('#marker-metadata-view')
      if (metadataViewContainer) {
        metadataViewContainer.outerHTML = viewHtml
      }
    }

    // Phase 4: Collect direction and marker type changes
    const extraUpdates = {}

    // Collect direction if slider exists
    const directionSlider = modal.querySelector('#direction-slider')
    if (directionSlider) {
      extraUpdates.direction = parseInt(directionSlider.value)
    }

    // Collect marker type change if select exists
    const typeSelect = modal.querySelector('#marker-type-select')
    if (typeSelect) {
      const newTypeId = typeSelect.value || null
      if (newTypeId !== markerDetails.markerTypeId) {
        extraUpdates.markerTypeId = newTypeId

        // If changing to an arrow type, initialize direction to 0 if not set
        if (newTypeId && markerDetails.allTypeDefs) {
          const newTypeDef = markerDetails.allTypeDefs.find(d => d.id === newTypeId)
          if (newTypeDef && newTypeDef.shape === 'arrow' && newTypeDef.behavior === 'point') {
            if (!extraUpdates.direction && !markerDetails.direction) {
              extraUpdates.direction = 0
            }
          }
        }

        // If changing FROM arrow to non-arrow, warn about direction loss
        if (markerDetails.markerTypeDef && markerDetails.markerTypeDef.shape === 'arrow') {
          const newTypeDef = newTypeId ? markerDetails.allTypeDefs.find(d => d.id === newTypeId) : null
          if (!newTypeId) {
            // Changing to default Photo Marker (no direction)
            delete extraUpdates.direction
          } else if (newTypeDef && newTypeDef.shape !== 'arrow') {
            delete extraUpdates.direction
          }
        }
      }
    }

    // Then save description with extra updates
    if (onSaveDescription) {
      await onSaveDescription(markerDetails.id, newDescription, extraUpdates)
    }
    toggleEditMode(false)
  })

  // Cancel button - revert and exit edit mode
  cancelButton?.addEventListener('click', () => {
    descriptionEdit.value = markerDetails.description || ''

    // Phase 4: Revert direction slider to original value
    const directionSlider = modal.querySelector('#direction-slider')
    if (directionSlider && markerDetails.direction !== undefined) {
      directionSlider.value = markerDetails.direction
    }

    toggleEditMode(false)
  })

  // Phase 4: Direction slider event handler
  const directionSlider = modal.querySelector('#direction-slider')
  const directionPreview = modal.querySelector('#direction-preview-canvas')
  const directionCurrentValue = modal.querySelector('#direction-current-value')
  const directionValueDisplay = modal.querySelector('#direction-value-display')

  if (directionSlider && directionPreview) {
    directionSlider.addEventListener('input', () => {
      const value = parseInt(directionSlider.value)
      // Update preview canvas
      drawDirectionPreview(directionPreview, value)
      // Update current value label
      if (directionCurrentValue) {
        directionCurrentValue.textContent = value + '°'
      }
      // Update view-mode display (in case save happens later)
      if (directionValueDisplay) {
        directionValueDisplay.textContent = value + '°'
      }
    })
  }

  return toggleEditMode
}

/**
 * Phase 4: Draw an arrow preview on a small canvas
 * @param {HTMLCanvasElement} canvas - The preview canvas
 * @param {number} degrees - Direction in degrees (0 = up, 90 = right)
 */
function drawDirectionPreview (canvas, degrees) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const cy = h / 2

  ctx.clearRect(0, 0, w, h)

  // Background
  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.translate(cx, cy)

  // Rotate: 0° = up (canvas 0 is right, so we need -90° offset)
  // Arrow points "up" naturally if drawn pointing to top
  const rad = (degrees - 90) * Math.PI / 180
  ctx.rotate(rad)

  // Draw arrow
  const arrowColor = '#3b82f6'
  const arrowSize = 22

  ctx.fillStyle = arrowColor
  ctx.strokeStyle = _darkenColor(arrowColor, 0.2)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  // Arrow head (pointing right = 0° in canvas coords)
  ctx.moveTo(arrowSize, 0)
  ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.65)
  ctx.lineTo(-arrowSize * 0.2, 0)
  ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.65)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

/**
 * Simple darken hex color utility (used by direction preview)
 * @param {string} hex - Hex color
 * @param {number} factor - Darken factor
 * @returns {string} Darkened hex
 */
function _darkenColor (hex, factor) {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor)))
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor)))
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor)))
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

/**
 * Setup action button handlers (Add Photos, Delete Marker)
 * @param {HTMLElement} modal - The modal element
 * @param {string} markerId - Marker ID
 * @param {Function} onAddPhotos - Callback when Add Photos is clicked
 * @param {Function} onDeleteMarker - Callback when Delete Marker is clicked
 */
export function setupActionButtonHandlers (modal, markerId, onAddPhotos, onDeleteMarker) {
  const addPhotosButton = modal.querySelector('#btn-add-photos')
  const deleteMarkerButton = modal.querySelector('#btn-delete-marker')

  addPhotosButton?.addEventListener('click', () => {
    if (onAddPhotos) onAddPhotos(markerId)
  })

  deleteMarkerButton?.addEventListener('click', () => {
    if (
      onDeleteMarker &&
      confirm(
        'Are you sure you want to delete this marker and all its associated photos? This cannot be undone.'
      )
    ) {
      onDeleteMarker(markerId)
    }
  })
}
