/**
 * SnapSpot PWA - Metadata Form Generator
 * Utility for generating dynamic metadata forms from definitions.
 * Part of Phase 3 metadata system implementation.
 */

/**
 * Metadata Form Generator
 * Generates HTML forms from metadata definitions, validates input, and extracts values.
 */
export class MetadataFormGenerator {
  /**
   * Generate complete metadata form HTML
   * @param {Array<Object>} definitions - Array of metadata definitions
   * @param {Array<Object>} existingValues - Array of existing metadata values (for edit mode)
   * @param {string} entityType - Type of entity ('map', 'marker', 'photo')
   * @returns {string} - HTML string for the metadata form
   */
  static generateForm (definitions, existingValues = [], entityType = '') {
    if (!definitions || definitions.length === 0) {
      return `
        <div class="metadata-empty-state">
          <p class="text-secondary">No custom fields defined for ${entityType}s.</p>
          <small class="text-muted">Add fields in Settings → Metadata.</small>
        </div>
      `
    }

    // Create a map of existing values by definitionId for quick lookup
    const valuesMap = new Map()
    existingValues.forEach(value => {
      valuesMap.set(value.definitionId, value.value)
    })

    const fieldsHtml = definitions
      .map(definition => {
        const existingValue = valuesMap.get(definition.id)
        return this.renderField(definition, existingValue)
      })
      .join('')

    return `
      <div class="metadata-form-container">
        ${fieldsHtml}
      </div>
    `
  }

  /**
   * Render a single field based on its definition
   * @param {Object} definition - Metadata field definition
   * @param {*} existingValue - Existing value (if any)
   * @returns {string} - HTML string for the field
   */
  static renderField (definition, existingValue = null) {
    const { id, name, fieldType, required, description, options = [] } = definition
    const requiredIndicator = required ? '<span class="required-indicator">*</span>' : ''
    const fieldId = `metadata-field-${id}`
    const helpText = description ? `<small class="text-secondary">${description}</small>` : ''

    let inputHtml = ''

    switch (fieldType) {
      case 'text':
        inputHtml = `<input type="text" id="${fieldId}" class="form-control metadata-input" data-definition-id="${id}" data-field-type="text" value="${existingValue || ''}" ${required ? 'required' : ''} />`
        break

      case 'number':
        inputHtml = `<input type="number" id="${fieldId}" class="form-control metadata-input" data-definition-id="${id}" data-field-type="number" value="${existingValue || ''}" ${required ? 'required' : ''} />`
        break

      case 'date':
        inputHtml = `<input type="date" id="${fieldId}" class="form-control metadata-input" data-definition-id="${id}" data-field-type="date" value="${existingValue || ''}" ${required ? 'required' : ''} />`
        break

      case 'boolean': {
        const checked = existingValue === true || existingValue === 'true' ? 'checked' : ''
        inputHtml = `
          <label class="checkbox-label">
            <input type="checkbox" id="${fieldId}" class="metadata-input" data-definition-id="${id}" data-field-type="boolean" ${checked} ${required ? 'required' : ''} />
            Yes
          </label>
        `
        break
      }

      case 'select': {
        const optionsHtml = options.map(option => {
          const selected = existingValue === option ? 'selected' : ''
          return `<option value="${option}" ${selected}>${option}</option>`
        }).join('')
        inputHtml = `
          <select id="${fieldId}" class="form-control metadata-input" data-definition-id="${id}" data-field-type="select" ${required ? 'required' : ''}>
            <option value="">Select an option...</option>
            ${optionsHtml}
          </select>
        `
        break
      }

      default:
        console.warn(`MetadataFormGenerator: Unknown field type "${fieldType}"`)
        inputHtml = `<p class="text-danger">Unknown field type: ${fieldType}</p>`
    }

    return `
      <div class="form-group metadata-field" data-definition-id="${id}">
        <label for="${fieldId}">${name} ${requiredIndicator}</label>
        ${inputHtml}
        ${helpText}
        <small class="form-error metadata-error" data-definition-id="${id}"></small>
      </div>
    `
  }

  /**
   * Validate metadata form
   * @param {HTMLElement} formElement - Form container element
   * @param {Array<Object>} definitions - Metadata definitions
   * @returns {Object} - { valid: boolean, errors: Array<{ definitionId, message }> }
   */
  static validateForm (formElement, definitions) {
    const errors = []

    definitions.forEach(definition => {
      const input = formElement.querySelector(`[data-definition-id="${definition.id}"]`)
      if (!input) {
        console.warn(`MetadataFormGenerator: Input not found for definition ${definition.id}`)
        return
      }

      // Clear previous error
      const errorElement = formElement.querySelector(`.metadata-error[data-definition-id="${definition.id}"]`)
      if (errorElement) {
        errorElement.textContent = ''
      }

      // Validate required fields
      if (definition.required) {
        let isEmpty = false

        if (definition.fieldType === 'boolean') {
          // Boolean fields can't be empty, they're always true/false
          // Only validate if required and unchecked (but this is rare)
          // For now, we'll skip required validation for boolean
        } else if (definition.fieldType === 'select') {
          isEmpty = !input.value || input.value === ''
        } else {
          isEmpty = !input.value || input.value.trim() === ''
        }

        if (isEmpty) {
          errors.push({
            definitionId: definition.id,
            message: `${definition.name} is required.`
          })
        }
      }

      // Validate number fields
      if (definition.fieldType === 'number' && input.value) {
        const numValue = parseFloat(input.value)
        if (isNaN(numValue)) {
          errors.push({
            definitionId: definition.id,
            message: `${definition.name} must be a valid number.`
          })
        }
      }

      // Validate date fields (HTML5 date input handles this natively, but double-check)
      if (definition.fieldType === 'date' && input.value) {
        const dateValue = new Date(input.value)
        if (isNaN(dateValue.getTime())) {
          errors.push({
            definitionId: definition.id,
            message: `${definition.name} must be a valid date.`
          })
        }
      }
    })

    // Display errors inline
    errors.forEach(error => {
      const errorElement = formElement.querySelector(`.metadata-error[data-definition-id="${error.definitionId}"]`)
      if (errorElement) {
        errorElement.textContent = error.message
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Extract metadata values from form
   * @param {HTMLElement} formElement - Form container element
   * @param {Array<Object>} definitions - Metadata definitions
   * @param {string} entityType - Type of entity ('map', 'marker', 'photo')
   * @param {string} entityId - ID of the entity
   * @returns {Array<Object>} - Array of MetadataValue objects ready to save
   */
  static extractValues (formElement, definitions, entityType, entityId) {
    const metadataValues = []

    definitions.forEach(definition => {
      const input = formElement.querySelector(`[data-definition-id="${definition.id}"]`)
      if (!input) {
        console.warn(`MetadataFormGenerator: Input not found for definition ${definition.id}`)
        return
      }

      let value = null

      switch (definition.fieldType) {
        case 'text':
          value = input.value.trim()
          break

        case 'number':
          value = input.value ? parseFloat(input.value) : null
          break

        case 'date':
          value = input.value || null
          break

        case 'boolean':
          value = input.checked
          break

        case 'select':
          value = input.value || null
          break

        default:
          console.warn(`MetadataFormGenerator: Unknown field type "${definition.fieldType}"`)
      }

      // Only include non-empty values (or boolean values)
      if (value !== null && value !== '' && value !== undefined) {
        metadataValues.push({
          id: crypto.randomUUID(),
          definitionId: definition.id,
          entityType,
          entityId,
          value,
          createdDate: new Date().toISOString(),
          lastModified: new Date().toISOString()
        })
      }
    })

    return metadataValues
  }

  /**
   * Render metadata values in read-only mode
   * @param {Array<Object>} definitions - Metadata definitions
   * @param {Array<Object>} values - Metadata values
   * @returns {string} - HTML string for read-only display
   */
  static renderReadOnly (definitions, values) {
    if (!values || values.length === 0) {
      return '' // Don't show anything if no values
    }

    // Create a map of definitions by ID
    const definitionsMap = new Map()
    definitions.forEach(def => {
      definitionsMap.set(def.id, def)
    })

    const rows = values
      .map(value => {
        const definition = definitionsMap.get(value.definitionId)
        if (!definition) {
          // Definition was deleted, skip this value
          return ''
        }

        let displayValue = value.value

        // Format value based on type
        if (definition.fieldType === 'boolean') {
          displayValue = value.value === true || value.value === 'true' ? 'Yes' : 'No'
        } else if (definition.fieldType === 'date' && value.value) {
          // Format date as human-readable
          const date = new Date(value.value)
          displayValue = date.toLocaleDateString()
        }

        return `
          <div class="metadata-readonly-row">
            <strong class="metadata-readonly-label">${definition.name}:</strong>
            <span class="metadata-readonly-value">${displayValue}</span>
          </div>
        `
      })
      .filter(row => row !== '')
      .join('')

    if (rows === '') {
      return '' // All values were for deleted definitions
    }

    return `
      <div class="metadata-readonly-container">
        <h4 class="metadata-readonly-heading">Additional Information</h4>
        ${rows}
      </div>
    `
  }
}
