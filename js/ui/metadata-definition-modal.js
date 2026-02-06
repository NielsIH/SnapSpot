/* global DOMParser requestAnimationFrame */

/**
 * SnapSpot PWA - Metadata Definition Modal Module
 * Modal for creating and editing metadata field definitions.
 * Part of Phase 2 metadata system implementation.
 */

/**
 * Creates and displays the Metadata Definition modal (add/edit).
 * @param {Object} modalManager - Instance of ModalManager for closeModal access.
 * @param {Object} options - Configuration options.
 * @param {Object|null} options.definition - Existing definition to edit (null for new).
 * @param {string} options.scope - 'global' or mapId for map-specific.
 * @param {string|null} options.activeMapId - ID of the currently active map.
 * @param {Function} options.onSave - Callback when definition is saved.
 * @param {Function} [options.onClose] - Callback when modal closes.
 * @returns {HTMLElement} - Created modal element.
 */
export function createMetadataDefinitionModal (modalManager, options) {
  const { definition, scope, activeMapId, onSave, onClose } = options
  const isEditMode = !!definition

  console.log('MetadataDefinitionModal: Creating modal.', { isEditMode, scope })

  // Pre-populate values for edit mode
  const fieldName = definition?.name || ''
  const fieldDescription = definition?.description || ''
  const fieldType = definition?.fieldType || 'text'
  const appliesTo = definition?.appliesTo || []
  const isRequired = definition?.required || false
  const fieldOptions = definition?.options || []
  const fieldScope = definition?.scope || scope

  // Determine if "This Map Only" should be disabled
  const mapSpecificDisabled = !activeMapId && fieldScope === 'global'
  const scopeGlobalChecked = fieldScope === 'global' ? 'checked' : ''
  const scopeMapChecked = fieldScope !== 'global' ? 'checked' : ''

  // Options inputs (for select type)
  const optionsInputsHtml = fieldOptions.length > 0
    ? fieldOptions.map((opt, idx) => `
        <div class="option-input-row">
          <input type="text" class="form-control option-input" data-option-index="${idx}" value="${opt}" placeholder="Option ${idx + 1}" />
          <button type="button" class="btn btn-sm btn-danger remove-option-btn" data-option-index="${idx}">×</button>
        </div>
      `).join('')
    : `
      <div class="option-input-row">
        <input type="text" class="form-control option-input" data-option-index="0" placeholder="Option 1" />
        <button type="button" class="btn btn-sm btn-danger remove-option-btn" data-option-index="0">×</button>
      </div>
      <div class="option-input-row">
        <input type="text" class="form-control option-input" data-option-index="1" placeholder="Option 2" />
        <button type="button" class="btn btn-sm btn-danger remove-option-btn" data-option-index="1">×</button>
      </div>
    `

  const modalHtml = `
    <div class="modal" id="metadata-definition-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content medium-modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEditMode ? 'Edit' : 'Create'} Metadata Field</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <form id="metadata-definition-form" novalidate>
            <div class="form-group">
              <label for="field-name">Field Name <span class="required-indicator">*</span></label>
              <input type="text" id="field-name" class="form-control" maxlength="100" value="${fieldName}" placeholder="e.g., Inscription Author" required />
              <small class="form-error" id="field-name-error"></small>
            </div>

            <div class="form-group">
              <label for="field-description">Description</label>
              <textarea id="field-description" class="form-control" rows="3" maxlength="500" placeholder="Optional help text for this field">${fieldDescription}</textarea>
              <small class="text-secondary">Optional. Helps users understand what this field is for.</small>
            </div>

            <div class="form-group">
              <label for="field-type">Field Type <span class="required-indicator">*</span></label>
              <select id="field-type" class="form-control" required>
                <option value="text" ${fieldType === 'text' ? 'selected' : ''}>Text</option>
                <option value="number" ${fieldType === 'number' ? 'selected' : ''}>Number</option>
                <option value="date" ${fieldType === 'date' ? 'selected' : ''}>Date</option>
                <option value="boolean" ${fieldType === 'boolean' ? 'selected' : ''}>Boolean (Yes/No)</option>
                <option value="select" ${fieldType === 'select' ? 'selected' : ''}>Select (Dropdown)</option>
              </select>
              <small class="text-secondary">Choose the type of data this field will store.</small>
            </div>

            <div class="form-group" id="options-group" style="display: ${fieldType === 'select' ? 'block' : 'none'};">
              <label>Dropdown Options <span class="required-indicator">*</span></label>
              <div id="options-container">
                ${optionsInputsHtml}
              </div>
              <button type="button" class="btn btn-sm btn-secondary mt-sm" id="add-option-btn">
                ➕ <span class="btn-text">Add Option</span>
              </button>
              <small class="form-error" id="options-error"></small>
              <small class="text-secondary">Provide at least 2 options for the dropdown.</small>
            </div>

            <div class="form-group">
              <label>Applies To <span class="required-indicator">*</span></label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" class="applies-to-checkbox" value="map" ${appliesTo.includes('map') ? 'checked' : ''} />
                  Map
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" class="applies-to-checkbox" value="marker" ${appliesTo.includes('marker') ? 'checked' : ''} />
                  Marker
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" class="applies-to-checkbox" value="photo" ${appliesTo.includes('photo') ? 'checked' : ''} />
                  Photo
                </label>
              </div>
              <small class="form-error" id="applies-to-error"></small>
              <small class="text-secondary">Select at least one type of entity this field can be used with.</small>
            </div>

            <div class="form-group">
              <label>Scope <span class="required-indicator">*</span></label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" name="scope" value="global" ${scopeGlobalChecked} />
                  Global (all maps)
                </label>
                <label class="radio-label">
                  <input type="radio" name="scope" value="map-specific" ${scopeMapChecked} ${mapSpecificDisabled ? 'disabled' : ''} />
                  This Map Only ${!activeMapId ? '(no active map)' : ''}
                </label>
              </div>
              <small class="text-secondary">Global fields are available for all maps. Map-specific fields only apply to the current map.</small>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="field-required" ${isRequired ? 'checked' : ''} />
                Required Field
              </label>
              <small class="text-secondary">If checked, users must provide a value for this field.</small>
            </div>

            <div class="metadata-field-preview">
              <h4>Preview</h4>
              <div id="preview-container">
                <!-- Preview will be rendered here -->
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cancel-btn" type="button">Cancel</button>
            <button class="btn btn-primary" id="save-definition-btn" type="submit" form="metadata-definition-form">
              ${isEditMode ? 'Save Changes' : 'Create Field'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  const parser = new DOMParser()
  const modalDoc = parser.parseFromString(modalHtml, 'text/html')
  const modal = modalDoc.querySelector('.modal')
  if (!modal) {
    console.error('Failed to create metadata definition modal element.')
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
  modal.querySelector('#cancel-btn')?.addEventListener('click', closeModal)

  // Form elements
  const form = modal.querySelector('#metadata-definition-form')
  const fieldNameInput = modal.querySelector('#field-name')
  const fieldDescriptionInput = modal.querySelector('#field-description')
  const fieldTypeSelect = modal.querySelector('#field-type')
  const optionsGroup = modal.querySelector('#options-group')
  const optionsContainer = modal.querySelector('#options-container')
  const addOptionBtn = modal.querySelector('#add-option-btn')
  const appliesToCheckboxes = modal.querySelectorAll('.applies-to-checkbox')
  const scopeRadios = modal.querySelectorAll('input[name="scope"]')
  const fieldRequiredCheckbox = modal.querySelector('#field-required')
  const previewContainer = modal.querySelector('#preview-container')

  // Error elements
  const fieldNameError = modal.querySelector('#field-name-error')
  const appliesToError = modal.querySelector('#applies-to-error')
  const optionsError = modal.querySelector('#options-error')

  // Field type change handler (show/hide options)
  fieldTypeSelect?.addEventListener('change', () => {
    const selectedType = fieldTypeSelect.value
    if (optionsGroup) {
      optionsGroup.style.display = selectedType === 'select' ? 'block' : 'none'
    }
    updatePreview()
  })

  // Options management
  let optionCounter = fieldOptions.length > 0 ? fieldOptions.length : 2

  addOptionBtn?.addEventListener('click', () => {
    const newOptionRow = document.createElement('div')
    newOptionRow.classList.add('option-input-row')
    newOptionRow.innerHTML = `
      <input type="text" class="form-control option-input" data-option-index="${optionCounter}" placeholder="Option ${optionCounter + 1}" />
      <button type="button" class="btn btn-sm btn-danger remove-option-btn" data-option-index="${optionCounter}">×</button>
    `
    optionsContainer.appendChild(newOptionRow)
    optionCounter++

    // Add remove listener
    newOptionRow.querySelector('.remove-option-btn')?.addEventListener('click', (e) => {
      newOptionRow.remove()
      updatePreview()
    })

    // Add input listener
    newOptionRow.querySelector('.option-input')?.addEventListener('input', updatePreview)
  })

  // Remove option buttons
  modal.querySelectorAll('.remove-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.option-input-row')
      if (row) {
        // Only allow removal if more than 2 options remain
        const remainingOptions = optionsContainer.querySelectorAll('.option-input-row').length
        if (remainingOptions > 2) {
          row.remove()
          updatePreview()
        }
      }
    })
  })

  // Preview update function
  const updatePreview = () => {
    const name = fieldNameInput.value.trim() || 'Field Name'
    const type = fieldTypeSelect.value
    const required = fieldRequiredCheckbox.checked

    let previewHtml = `
      <div class="form-group">
        <label>${name}${required ? ' <span class="required-indicator">*</span>' : ''}</label>
    `

    if (type === 'text') {
      previewHtml += '<input type="text" class="form-control" placeholder="Enter text..." disabled />'
    } else if (type === 'number') {
      previewHtml += '<input type="number" class="form-control" placeholder="Enter number..." disabled />'
    } else if (type === 'date') {
      previewHtml += '<input type="date" class="form-control" disabled />'
    } else if (type === 'boolean') {
      previewHtml += `
        <label class="checkbox-label">
          <input type="checkbox" disabled />
          Yes
        </label>
      `
    } else if (type === 'select') {
      const options = Array.from(optionsContainer.querySelectorAll('.option-input'))
        .map(input => input.value.trim())
        .filter(val => val.length > 0)

      previewHtml += '<select class="form-control" disabled>'
      previewHtml += '<option value="">Select an option...</option>'
      options.forEach(opt => {
        previewHtml += `<option value="${opt}">${opt}</option>`
      })
      previewHtml += '</select>'
    }

    previewHtml += '</div>'
    previewContainer.innerHTML = previewHtml
  }

  // Attach input listeners for live preview
  fieldNameInput?.addEventListener('input', updatePreview)
  fieldTypeSelect?.addEventListener('change', updatePreview)
  fieldRequiredCheckbox?.addEventListener('change', updatePreview)
  modal.querySelectorAll('.option-input').forEach(input => {
    input.addEventListener('input', updatePreview)
  })

  // Validation function
  const validateForm = () => {
    let isValid = true

    // Clear previous errors
    fieldNameError.textContent = ''
    appliesToError.textContent = ''
    optionsError.textContent = ''

    // Validate field name
    const name = fieldNameInput.value.trim()
    if (name.length === 0) {
      fieldNameError.textContent = 'Field name is required.'
      isValid = false
    }

    // Validate applies to
    const selectedAppliesTo = Array.from(appliesToCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value)
    if (selectedAppliesTo.length === 0) {
      appliesToError.textContent = 'Select at least one entity type.'
      isValid = false
    }

    // Validate options (for select type)
    if (fieldTypeSelect.value === 'select') {
      const options = Array.from(optionsContainer.querySelectorAll('.option-input'))
        .map(input => input.value.trim())
        .filter(val => val.length > 0)

      if (options.length < 2) {
        optionsError.textContent = 'Provide at least 2 options for a dropdown field.'
        isValid = false
      }
    }

    return isValid
  }

  // Form submission
  form?.addEventListener('submit', (e) => {
    e.preventDefault()

    if (!validateForm()) {
      console.warn('MetadataDefinitionModal: Form validation failed.')
      return
    }

    // Collect form data
    const name = fieldNameInput.value.trim()
    const description = fieldDescriptionInput.value.trim()
    const type = fieldTypeSelect.value
    const appliesTo = Array.from(appliesToCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value)
    const scopeValue = Array.from(scopeRadios).find(r => r.checked)?.value
    const required = fieldRequiredCheckbox.checked

    const options = type === 'select'
      ? Array.from(optionsContainer.querySelectorAll('.option-input'))
        .map(input => input.value.trim())
        .filter(val => val.length > 0)
      : []

    const finalScope = scopeValue === 'global' ? 'global' : activeMapId

    const definitionData = {
      id: definition?.id || crypto.randomUUID(),
      name,
      fieldType: type,
      scope: finalScope,
      appliesTo,
      required,
      options,
      description,
      createdDate: definition?.createdDate || new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    console.log('MetadataDefinitionModal: Submitting definition:', definitionData)

    if (onSave) {
      onSave(definitionData)
    }

    closeModal()
  })

  // Show modal
  requestAnimationFrame(() => {
    modal.classList.add('show')
    updatePreview()
  })

  return modal
}
