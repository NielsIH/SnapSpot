/**
 * SnapSpot PWA - Marker Details Photos
 * Handles photo-specific functionality for marker details modal
 */

/* global URL, confirm, console */

/**
 * Load photo thumbnails in the modal with fallback strategy
 * @param {HTMLElement} modal - The modal element
 * @param {Array<Object>} photos - Array of photo objects
 * @param {Object} modalManager - Modal manager instance for URL tracking
 */
export function loadPhotoThumbnails (modal, photos, modalManager) {
  const modalId = modal.id

  // Initialize object URL tracking for this modal
  modalManager.trackObjectUrl(modalId, null)

  modal.querySelectorAll('.photo-thumbnail[data-use-full-image="true"]').forEach(async (img) => {
    const photoId = img.dataset.photoId
    const photo = photos.find(p => p.id === photoId)

    if (!photo) return

    // Try full-size image first, with fallback to thumbnail
    if (photo.imageData) {
      loadFullSizeImage(img, photo, modalId, modalManager)
    } else if (photo.thumbnailData) {
      loadThumbnailImage(img, photo)
    } else {
      setPlaceholderImage(img)
    }
  })
}

/**
 * Load full-size image with fallback to thumbnail on error
 * @param {HTMLImageElement} img - Image element
 * @param {Object} photo - Photo object
 * @param {string} modalId - Modal ID for URL tracking
 * @param {Object} modalManager - Modal manager instance
 */
function loadFullSizeImage (img, photo, modalId, modalManager) {
  try {
    const imageUrl = URL.createObjectURL(photo.imageData)
    modalManager.trackObjectUrl(modalId, imageUrl)

    // Set up fallback to thumbnail BEFORE setting the src
    img.addEventListener('error', () => {
      if (photo.thumbnailData) {
        if (photo.thumbnailData instanceof Blob) {
          const thumbnailUrl = URL.createObjectURL(photo.thumbnailData)
          modalManager.trackObjectUrl(modalId, thumbnailUrl)
          img.src = thumbnailUrl
        } else {
          img.src = photo.thumbnailData // Assume it's a data URL
        }
      } else {
        setPlaceholderImage(img)
      }
    }, { once: true })

    // Set the source to the full-size image
    img.src = imageUrl
  } catch (error) {
    console.error('Failed to create object URL, falling back to thumbnail:', error)
    if (photo.thumbnailData) {
      loadThumbnailImage(img, photo)
    } else {
      setPlaceholderImage(img)
    }
  }
}

/**
 * Load thumbnail image
 * @param {HTMLImageElement} img - Image element
 * @param {Object} photo - Photo object
 */
function loadThumbnailImage (img, photo) {
  img.src = photo.thumbnailData
}

/**
 * Set placeholder image when no image data is available
 * @param {HTMLImageElement} img - Image element
 */
function setPlaceholderImage (img) {
  img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" font-family="Arial" font-size="10" fill="%23999" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>'
}

/**
 * Setup photo thumbnail click handlers
 * @param {HTMLElement} modal - The modal element
 * @param {Function} onViewPhoto - Callback when thumbnail is clicked
 */
export function setupPhotoClickHandlers (modal, onViewPhoto) {
  modal.querySelectorAll('.photo-thumbnail.clickable-thumbnail').forEach((thumbnail) => {
    thumbnail.addEventListener('click', (e) => {
      e.stopPropagation()
      const photoId = thumbnail.dataset.photoId
      console.log('marker-details-photos: Thumbnail clicked. PhotoId:', photoId)
      if (onViewPhoto) {
        onViewPhoto(photoId)
      }
    })
  })
}

/**
 * Setup photo delete button handlers
 * @param {HTMLElement} modal - The modal element
 * @param {string} markerId - Marker ID
 * @param {Function} onDeletePhoto - Callback when delete button is clicked
 */
export function setupPhotoDeleteHandlers (modal, markerId, onDeletePhoto) {
  modal.querySelectorAll('.delete-photo-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const photoId = button.dataset.photoId
      console.log(
        'marker-details-photos: Delete button clicked. PhotoId:',
        photoId,
        'MarkerId:',
        markerId
      )
      if (onDeletePhoto && confirm('Are you sure you want to remove this photo from the marker?')) {
        onDeletePhoto(markerId, photoId)
      }
    })
  })
}
