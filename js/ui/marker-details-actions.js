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

      editButton.classList.add('hidden')
      saveButton.classList.remove('hidden')
      cancelButton.classList.remove('hidden')
      addPhotosButton.disabled = true
      deleteMarkerButton.disabled = true
      descriptionEdit.focus()
      descriptionEdit.setSelectionRange(descriptionEdit.value.length, descriptionEdit.value.length)
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
      const { definitions, values } = await loadMetadata(storage, markerDetails.id)
      currentMetadataEditHtml = generateInlineEditHtml(definitions, values)
    }

    toggleEditMode(true, currentMetadataEditHtml)
    if (onEditMarker) onEditMarker(markerDetails.id)
  })

  // Save button - save description and metadata, then exit edit mode
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
      const { definitions, values } = await loadMetadata(storage, markerDetails.id)
      const viewHtml = generateInlineViewHtml(definitions, values)
      const metadataViewContainer = modal.querySelector('#marker-metadata-view')
      if (metadataViewContainer) {
        metadataViewContainer.outerHTML = viewHtml
      }
    }

    // Then save description
    if (onSaveDescription) {
      await onSaveDescription(markerDetails.id, newDescription)
    }
    toggleEditMode(false)
  })

  // Cancel button - revert and exit edit mode
  cancelButton?.addEventListener('click', () => {
    descriptionEdit.value = markerDetails.description || ''
    toggleEditMode(false)
  })

  return toggleEditMode
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
