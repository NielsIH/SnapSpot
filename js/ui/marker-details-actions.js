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
 * @returns {Function} toggleEditMode function for external use
 */
export function setupDescriptionEditHandlers (modal, markerDetails, onEditMarker, onSaveDescription) {
  const descriptionDisplay = modal.querySelector('.marker-description-display')
  const descriptionEdit = modal.querySelector('.marker-description-edit')
  const editButton = modal.querySelector('#btn-edit-marker')
  const saveButton = modal.querySelector('#btn-save-description')
  const cancelButton = modal.querySelector('#btn-cancel-description-edit')
  const addPhotosButton = modal.querySelector('#btn-add-photos')
  const deleteMarkerButton = modal.querySelector('#btn-delete-marker')

  /**
   * Toggle between view and edit modes for description
   * @param {boolean} isEditing - Whether to enter edit mode
   */
  const toggleEditMode = (isEditing) => {
    if (isEditing) {
      descriptionDisplay.classList.add('hidden')
      descriptionEdit.classList.remove('hidden')
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
      editButton.classList.remove('hidden')
      saveButton.classList.add('hidden')
      cancelButton.classList.add('hidden')
      addPhotosButton.disabled = false
      deleteMarkerButton.disabled = false
    }
  }

  // Edit button - enter edit mode
  editButton?.addEventListener('click', () => {
    toggleEditMode(true)
    if (onEditMarker) onEditMarker(markerDetails.id)
  })

  // Save button - save description and exit edit mode
  saveButton?.addEventListener('click', () => {
    const newDescription = descriptionEdit.value.trim()
    if (onSaveDescription) {
      onSaveDescription(markerDetails.id, newDescription)
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
