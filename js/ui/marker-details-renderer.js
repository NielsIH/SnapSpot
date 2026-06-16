/**
 * SnapSpot PWA - Marker Details Renderer
 * Handles HTML generation for marker details modal
 */

/**
 * Generate the main modal HTML structure
 * @param {Object} markerDetails - Marker data to display
 * @param {string} metadataViewHtml - Pre-generated metadata view HTML (inline)
 * @returns {string} HTML string for the modal
 */
export function generateModalHtml (markerDetails, metadataViewHtml = '') {
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
          ${generateMarkerInfoSection(markerDetails, metadataViewHtml)}
          ${generateDirectionSection(markerDetails)}
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
 * @param {string} metadataViewHtml - Metadata in view mode (inline, no headers)
 * @returns {string} HTML for marker info section
 */
function generateMarkerInfoSection (markerDetails, metadataViewHtml = '') {
  const escapedDescription = escapeHtml(markerDetails.description || '')

  // Phase 4: Generate marker type info
  const typeInfoHtml = generateMarkerTypeInfo(markerDetails)

  return `
    <div class="marker-info-section">
      ${typeInfoHtml}
      <p><strong>ID:</strong> <span class="text-xs text-secondary">${markerDetails.id}</span></p>
      <p><strong>Coordinates:</strong> ${markerDetails.coords}</p>
      <p>
        <strong>Description:</strong>
        <span class="marker-description-display">${markerDetails.description ? escapedDescription : 'No description'}</span>
        <textarea class="marker-description-edit hidden" rows="3" maxlength="500" placeholder="Enter description">${escapedDescription}</textarea>
      </p>
      ${metadataViewHtml}
      <div class="marker-metadata-edit hidden" id="marker-metadata-edit"></div>
      <p><strong>Photos:</strong> <span class="marker-photo-count">${markerDetails.photoCount}</span> associated</p>
    </div>
  `
}

/**
 * Phase 4: Generate marker type info display and edit dropdown
 * @param {Object} markerDetails - Marker data with type info
 * @returns {string} HTML for type info row
 */
function generateMarkerTypeInfo (markerDetails) {
  const SHAPE_ICONS = { circle: '●', square: '■', diamond: '◆', arrow: '▲' }
  const typeDef = markerDetails.markerTypeDef
  const isLine = markerDetails.markerTypeId === 'builtin-line-marker'

  // Determine display name
  let typeName = 'Photo Marker (default)'
  let typeIcon = '●'
  let typeColor = '#6b7280'

  if (typeDef) {
    typeName = typeDef.name
    typeIcon = SHAPE_ICONS[typeDef.shape] || '●'
    typeColor = typeDef.color || '#6b7280'
  } else if (isLine) {
    typeName = 'Line Marker (default)'
    typeIcon = '◆'
    typeColor = '#e53e3e'
  }

  // Build type change dropdown (edit mode only, not for line markers)
  const allTypeDefs = markerDetails.allTypeDefs || []
  const pointTypes = allTypeDefs.filter(d => d.behavior === 'point')
  const typeDropdownHtml = isLine
    ? '<p class="text-secondary text-sm">Line marker type cannot be changed.</p>'
    : `
      <select class="form-control marker-type-select hidden" id="marker-type-select">
        ${pointTypes.map(def => {
          const selected = def.id === markerDetails.markerTypeId ? 'selected' : ''
          return `<option value="${def.id}" ${selected}>${SHAPE_ICONS[def.shape] || '●'} ${def.name}</option>`
        }).join('')}
        <option value="" ${!markerDetails.markerTypeId ? 'selected' : ''}>● Photo Marker (default)</option>
      </select>
    `

  return `
    <p class="marker-type-info">
      <strong>Type:</strong>
      <span class="marker-type-display">
        <span style="color: ${typeColor};">${typeIcon}</span> ${typeName}
      </span>
      <span class="marker-type-edit hidden" id="marker-type-edit">
        ${typeDropdownHtml}
      </span>
    </p>
  `
}

/**
 * Phase 4: Generate direction control section for arrow markers
 * @param {Object} markerDetails - Marker data with direction info
 * @returns {string} HTML for direction section
 */
function generateDirectionSection (markerDetails) {
  if (!markerDetails.hasDirection) return ''

  const currentDirection = markerDetails.direction || 0

  return `
    <div class="direction-section" id="marker-direction-section">
      <h4>Direction</h4>
      <div class="direction-view" id="direction-view">
        <p><strong>Direction:</strong> <span id="direction-value-display">${currentDirection}°</span></p>
      </div>
      <div class="direction-edit hidden" id="direction-edit">
        <div class="direction-preview-wrapper">
          <canvas class="direction-preview-canvas" id="direction-preview-canvas" width="72" height="72"></canvas>
        </div>
        <div class="direction-slider-wrapper">
          <input type="range" class="direction-slider" id="direction-slider"
            min="0" max="360" value="${currentDirection}" step="1"
            aria-label="Direction angle" />
          <div class="direction-slider-labels">
            <span>0°</span>
            <span class="direction-current-value" id="direction-current-value">${currentDirection}°</span>
            <span>360°</span>
          </div>
        </div>
      </div>
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
 * Escape HTML special characters for safe insertion into HTML content.
 * @param {string} value - Raw text value
 * @returns {string} Escaped HTML string
 */
function escapeHtml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
