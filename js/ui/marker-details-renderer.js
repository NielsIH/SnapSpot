/**
 * SnapSpot PWA - Marker Details Renderer
 * Handles HTML generation for marker details modal
 */

/**
 * Generate the main modal HTML structure
 * @param {Object} markerDetails - Marker data to display
 * @param {string} metadataHtml - Pre-generated metadata section HTML
 * @returns {string} HTML string for the modal
 */
export function generateModalHtml (markerDetails, metadataHtml = '') {
  const photoThumbnailsHtml = generatePhotoThumbnailsHtml(markerDetails.photos)

  return `
    <div class="modal" id="marker-details-modal" data-marker-id="${markerDetails.id}">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Marker Details</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          ${generateMarkerInfoSection(markerDetails)}
          ${metadataHtml}
          ${generatePhotoListSection(photoThumbnailsHtml)}
        </div>
        <div class="modal-footer">
          ${generateModalActions()}
        </div>
      </div>
    </div>
  `
}

/**
 * Generate marker information section HTML
 * @param {Object} markerDetails - Marker data
 * @returns {string} HTML for marker info section
 */
function generateMarkerInfoSection (markerDetails) {
  return `
    <div class="marker-info-section">
      <p><strong>ID:</strong> <span class="text-xs text-secondary">${markerDetails.id}</span></p>
      <p><strong>Coordinates:</strong> ${markerDetails.coords}</p>
      <p>
        <strong>Description:</strong>
        <span class="marker-description-display">${markerDetails.description || 'No description'}</span>
        <textarea class="marker-description-edit hidden" rows="3" maxlength="500" placeholder="Enter description">${markerDetails.description || ''}</textarea>
      </p>
      <p><strong>Photos:</strong> <span class="marker-photo-count">${markerDetails.photoCount}</span> associated</p>
    </div>
  `
}

/**
 * Generate photo list section HTML
 * @param {string} photoThumbnailsHtml - Pre-generated photo thumbnails HTML
 * @returns {string} HTML for photo list section
 */
function generatePhotoListSection (photoThumbnailsHtml) {
  return `
    <div class="photo-list-section">
      <h4>Associated Photos</h4>
      <div class="photo-thumbnails-container" id="marker-photo-thumbnails">
        ${photoThumbnailsHtml}
      </div>
    </div>
  `
}

/**
 * Generate photo thumbnails HTML
 * @param {Array<Object>} photos - Array of photo objects
 * @returns {string} HTML for photo thumbnails
 */
function generatePhotoThumbnailsHtml (photos) {
  if (!photos || photos.length === 0) {
    return '<p class="text-secondary text-center">No photos yet. Click "Add Photos" to add some!</p>'
  }

  return photos
    .map(
      (photo) => `
        <div class="photo-thumbnail-item" data-photo-id="${photo.id}" style="position: relative;">
          <img src="" alt="${photo.fileName}" class="photo-thumbnail clickable-thumbnail" data-photo-id="${photo.id}" data-use-full-image="true" />
          <span class="photo-name">${photo.fileName}</span>
          <button class="btn btn-tiny btn-danger delete-photo-btn" data-photo-id="${photo.id}" title="Remove Photo">×</button>
        </div>
      `
    )
    .join('')
}

/**
 * Generate modal action buttons HTML
 * @returns {string} HTML for modal footer actions
 */
function generateModalActions () {
  return `
    <div class="modal-actions">
      <button class="btn btn-primary" id="btn-add-photos" type="button">📸 Add Photos</button>
      <button class="btn btn-secondary" id="btn-edit-marker" type="button">✏️ Edit Marker</button>
      <button class="btn btn-primary hidden" id="btn-save-description" type="button">💾 Save</button>
      <button class="btn btn-secondary hidden" id="btn-cancel-description-edit" type="button">✖️ Cancel</button>
      <button class="btn btn-danger" id="btn-delete-marker" type="button">🗑️ Delete Marker</button>
    </div>
  `
}

/**
 * Update description display in an open modal
 * @param {string} markerId - Marker ID
 * @param {string} newDescription - New description text
 */
export function updateDescriptionDisplay (markerId, newDescription) {
  const modal = document.querySelector(`#marker-details-modal[data-marker-id="${markerId}"]`)
  if (!modal) {
    console.warn(`Marker details modal for ${markerId} not found to update description.`)
    return
  }

  const descriptionDisplaySpan = modal.querySelector('.marker-description-display')
  const descriptionEditTextArea = modal.querySelector('.marker-description-edit')

  if (descriptionDisplaySpan) {
    descriptionDisplaySpan.textContent = newDescription || 'No description'
  }
  if (descriptionEditTextArea) {
    descriptionEditTextArea.value = newDescription || ''
  }

  console.log(`Updated description for marker ${markerId} to "${newDescription}"`)
}
