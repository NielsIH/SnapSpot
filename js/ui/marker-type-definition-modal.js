/* global DOMParser requestAnimationFrame */

/**
 * SnapSpot PWA - Marker Type Definition Modal Module
 * Modal for creating and editing custom marker type definitions.
 * Part of Phase 2 marker types system implementation.
 */

const SHAPE_ICONS = {
  circle: '●',
  square: '■',
  diamond: '◆',
  arrow: '▲'
}

const DEFAULT_COLOR_SWATCHES = [
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'
]

/**
 * Creates and displays the Marker Type Definition modal (add/edit).
 * @param {Object} modalManager - Instance of ModalManager for closeModal access.
 * @param {Object} options - Configuration options.
 * @param {Object|null} options.definition - Existing definition to edit (null for new).
 * @param {Function} options.onSave - Callback when definition is saved: onSave(definition).
 * @param {Function} [options.onClose] - Callback when modal closes.
 * @returns {HTMLElement} - Created modal element.
 */
export function createMarkerTypeDefinitionModal (modalManager, options) {
  const { definition, onSave, onClose } = options
  const isEditMode = !!definition

  console.log('MarkerTypeDefinitionModal: Creating modal.', { isEditMode })

  // Pre-populate values for edit mode
  const typeName = definition?.name || ''
  const typeShape = definition?.shape || 'circle'
  const typeColor = definition?.color || '#ef4444'
  const typeLabel = definition?.label || ''
  const typeShowNumber = definition?.showNumber !== undefined ? definition.showNumber : true

  const escapeHtmlAttribute = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const isBuiltIn = definition?.isBuiltIn || false

  const modalHtml = `
    <div class="modal" id="marker-type-definition-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content small-modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEditMode ? 'Edit' : 'Add'} Custom Marker Type</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <form id="marker-type-definition-form" novalidate>
            <div class="form-group">
              <label for="marker-type-name">Name <span class="required-indicator">*</span></label>
              <input type="text" id="marker-type-name" class="form-control" maxlength="100" value="${escapeHtmlAttribute(typeName)}" placeholder="e.g., Hazard Zone" required autofocus />
              <small class="form-error" id="marker-type-name-error"></small>
            </div>

            <div class="form-group">
              <label>Shape <span class="required-indicator">*</span></label>
              <div class="shape-picker-grid">
                ${Object.entries(SHAPE_ICONS).map(([shape, icon]) => `
                  <button type="button" class="shape-picker-btn ${shape === typeShape ? 'selected' : ''}${isBuiltIn ? ' disabled' : ''}" data-shape="${shape}" ${isBuiltIn ? 'disabled' : ''}>
                    <span class="shape-picker-icon">${icon}</span>
                    <span class="shape-picker-label">${capitalizeFirst(shape)}</span>
                  </button>
                `).join('')}
              </div>
              ${isBuiltIn ? '<small class="text-secondary">Shape is locked for built-in types.</small>' : ''}
            </div>

            <div class="form-group">
              <label>Color</label>
              <div class="color-swatch-row">
                ${DEFAULT_COLOR_SWATCHES.map(c => `
                  <button type="button" class="color-swatch-btn ${c === typeColor ? 'selected' : ''}" style="background-color: ${c};" data-color="${c}" title="${c}"></button>
                `).join('')}
              </div>
              <div class="color-custom-row mt-sm">
                <label for="marker-type-color" class="sr-only">Custom Color</label>
                <input type="text" id="marker-type-color" class="form-control" value="${escapeHtmlAttribute(typeColor)}" placeholder="#RRGGBB" pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$" />
                <span class="color-preview-swatch" style="background-color: ${typeColor};"></span>
              </div>
              <small class="form-error" id="marker-type-color-error"></small>
            </div>

            <div class="form-group">
              <label for="marker-type-label">Label (optional)</label>
              <input type="text" id="marker-type-label" class="form-control" maxlength="4" value="${escapeHtmlAttribute(typeLabel)}" placeholder="e.g., HZ" />
              <small class="text-secondary">Short label displayed on map. Max 4 characters.</small>
            </div>

            <div class="form-group">
              <label class="checkbox-label toggle-switch-label">
                <input type="checkbox" id="marker-type-show-number" ${typeShowNumber ? 'checked' : ''} />
                <span class="toggle-switch-slider"></span>
                Show number on map
              </label>
              <small class="text-secondary mt-xs">Display a unique number on this marker type. Useful for correlating markers with photos.</small>
            </div>

            <div class="modal-footer no-border">
              <div class="modal-actions full-width">
                <button type="button" class="btn btn-secondary" id="marker-type-cancel-btn">Cancel</button>
                <button type="submit" class="btn btn-primary" id="marker-type-save-btn">Save</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  const parser = new DOMParser()
  const modalDoc = parser.parseFromString(modalHtml, 'text/html')
  const modal = modalDoc.querySelector('.modal')
  if (!modal) {
    console.error('Failed to create marker type definition modal element.')
    if (onClose) onClose()
    return null
  }

  document.body.appendChild(modal)
  modalManager.activeModals.add(modal)

  // Close handler
  const closeModal = () => {
    modalManager.closeModal(modal)
    if (onClose) onClose()
  }
  modal.querySelector('.modal-close')?.addEventListener('click', closeModal)
  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal)
  modal.querySelector('#marker-type-cancel-btn')?.addEventListener('click', closeModal)

  // Shape picker
  const shapeButtons = modal.querySelectorAll('.shape-picker-btn:not(.disabled)')
  let selectedShape = typeShape

  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeButtons.forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedShape = btn.dataset.shape
    })
  })

  // Color swatches
  const colorSwatchBtns = modal.querySelectorAll('.color-swatch-btn')
  const colorInput = modal.querySelector('#marker-type-color')
  const colorPreview = modal.querySelector('.color-preview-swatch')
  let selectedColor = typeColor

  colorSwatchBtns.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatchBtns.forEach(s => s.classList.remove('selected'))
      swatch.classList.add('selected')
      selectedColor = swatch.dataset.color
      colorInput.value = selectedColor
      if (colorPreview) colorPreview.style.backgroundColor = selectedColor
    })
  })

  // Custom color input
  colorInput?.addEventListener('input', () => {
    const val = colorInput.value
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
      selectedColor = val
      if (colorPreview) colorPreview.style.backgroundColor = val
      colorSwatchBtns.forEach(s => s.classList.remove('selected'))
      // Check if matches a swatch
      const matchingSwatch = modal.querySelector(`.color-swatch-btn[data-color="${val.toLowerCase()}"]`)
      if (matchingSwatch) matchingSwatch.classList.add('selected')
    }
  })

  // Form submission
  const form = modal.querySelector('#marker-type-definition-form')
  const nameInput = modal.querySelector('#marker-type-name')
  const nameError = modal.querySelector('#marker-type-name-error')
  const colorError = modal.querySelector('#marker-type-color-error')

  form?.addEventListener('submit', (e) => {
    e.preventDefault()

    // Validate name
    const name = nameInput.value.trim()
    if (!name) {
      nameError.textContent = 'Name is required.'
      nameInput.focus()
      return
    }
    if (name.length > 100) {
      nameError.textContent = 'Name must be 100 characters or less.'
      nameInput.focus()
      return
    }
    nameError.textContent = ''

    // Validate color
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(selectedColor)) {
      colorError.textContent = 'Color must be a valid hex color (#RRGGBB or #RGB).'
      colorInput?.focus()
      return
    }
    colorError.textContent = ''

    // Build definition object
    const result = {
      name,
      shape: selectedShape,
      color: selectedColor,
      label: modal.querySelector('#marker-type-label')?.value?.trim() || '',
      behavior: 'point',
      size: 'normal',
      supportsPhotos: true,
      showNumber: modal.querySelector('#marker-type-show-number')?.checked ?? true,
      scope: 'global',
      isBuiltIn: false,
      isPreset: false
    }

    // For edit mode, preserve the existing ID
    if (isEditMode && definition) {
      result.id = definition.id
      result.isBuiltIn = definition.isBuiltIn || false
      result.isPreset = definition.isPreset || false
      result.createdDate = definition.createdDate
    }

    closeModal()
    onSave(result)
  })

  // Show modal with animation
  requestAnimationFrame(() => {
    modal.classList.add('show')
  })

  // Focus name input
  requestAnimationFrame(() => {
    nameInput?.focus()
  })

  return modal
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirst (str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
