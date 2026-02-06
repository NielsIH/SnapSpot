/**
 * SnapSpot PWA - Marker Details Modal
 * Orchestrates the marker details modal creation and management
 */

/* global document, DOMParser, requestAnimationFrame */

import { generateModalHtml, updateDescriptionDisplay } from './marker-details-renderer.js'
import { loadPhotoThumbnails, setupPhotoClickHandlers, setupPhotoDeleteHandlers } from './marker-details-photos.js'
import { setupCloseHandlers, setupDescriptionEditHandlers, setupActionButtonHandlers } from './marker-details-actions.js'
import { loadMetadata, generateInlineViewHtml, generateInlineEditHtml } from './marker-details-metadata.js'

/**
 * Update the displayed description in an already open marker details modal
 * @param {Object} modalManager - Modal manager instance
 * @param {string} markerId - Marker ID
 * @param {string} newDescription - New description text
 */
export function updateMarkerDetailsDescription (modalManager, markerId, newDescription) {
  updateDescriptionDisplay(markerId, newDescription)
}

/**
 * Create and display marker details modal
 * @param {Object} modalManager - Modal manager instance
 * @param {Object} markerDetails - Marker data to display
 * @param {Function} onAddPhotos - Callback for Add Photos button
 * @param {Function} onEditMarker - Callback for Edit Marker button
 * @param {Function} onSaveDescription - Callback when description is saved
 * @param {Function} onDeleteMarker - Callback for Delete Marker button
 * @param {Function} onDeletePhoto - Callback when photo delete button is clicked
 * @param {Function} onViewPhoto - Callback when photo thumbnail is clicked
 * @param {Function} onClose - Callback when modal is closed
 * @param {Object} storage - MapStorage instance for metadata (optional)
 * @returns {Promise<HTMLElement>} The created modal element
 */
export async function createMarkerDetailsModal (
  modalManager,
  markerDetails,
  onAddPhotos,
  onEditMarker,
  onSaveDescription,
  onDeleteMarker,
  onDeletePhoto,
  onViewPhoto,
  onClose,
  storage = null
) {
  // Load metadata
  const metadata = await loadMetadata(storage, markerDetails.id)
  const metadataViewHtml = generateInlineViewHtml(metadata.definitions, metadata.values)
  const metadataEditHtml = generateInlineEditHtml(metadata.definitions, metadata.values)

  // Generate modal HTML with inline metadata
  const modalHtml = generateModalHtml(markerDetails, metadataViewHtml)

  // Parse and create modal element
  const parser = new DOMParser()
  const modalDoc = parser.parseFromString(modalHtml, 'text/html')
  const modal = modalDoc.querySelector('.modal')

  if (!modal) {
    console.error('Failed to create marker details modal element.')
    if (onClose) onClose()
    return null
  }

  // Add to DOM and track
  document.body.appendChild(modal)
  modalManager.activeModals.add(modal)

  // Setup all event handlers
  setupCloseHandlers(modal, modalManager, onClose)
  setupDescriptionEditHandlers(
    modal,
    markerDetails,
    onEditMarker,
    onSaveDescription,
    metadataEditHtml,
    storage,
    metadata.definitions
  )
  setupActionButtonHandlers(modal, markerDetails.id, onAddPhotos, onDeleteMarker)
  setupPhotoClickHandlers(modal, onViewPhoto)
  setupPhotoDeleteHandlers(modal, markerDetails.id, onDeletePhoto)

  // Load photo thumbnails
  loadPhotoThumbnails(modal, markerDetails.photos, modalManager)

  // Show modal with animation
  requestAnimationFrame(() => {
    modal.classList.add('show')
  })

  return modal
}
