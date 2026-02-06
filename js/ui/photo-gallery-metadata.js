/**
 * SnapSpot PWA - Photo Gallery Metadata
 * Handles metadata functionality for photo gallery modal
 */

/* global console */

import { MetadataFormGenerator } from './metadata-form-generator.js'

/**
 * Load metadata definitions and values for a photo
 * @param {Object} storage - MapStorage instance
 * @param {string} photoId - Photo ID
 * @returns {Promise<{definitions: Array, values: Array}>}
 */
export async function loadMetadata (storage, photoId) {
  if (!storage) {
    return { definitions: [], values: [] }
  }

  try {
    const allDefinitions = await storage.getAllMetadataDefinitions()
    const photoDefinitions = allDefinitions.filter(def => def.appliesTo.includes('photo'))
    const metadataValues = await storage.getMetadataValuesForEntity('photo', photoId)

    return {
      definitions: photoDefinitions,
      values: metadataValues
    }
  } catch (error) {
    console.error('Error loading photo metadata:', error)
    return { definitions: [], values: [] }
  }
}

/**
 * Generate inline HTML for view mode (read-only display in overlay)
 * @param {Array<Object>} definitions - Metadata definitions
 * @param {Array<Object>} values - Metadata values
 * @returns {string} HTML for inline display
 */
export function generateInlineViewHtml (definitions, values) {
  if (!definitions || definitions.length === 0 || !values || values.length === 0) {
    return '<div id="photo-metadata-view"></div>'
  }

  // Create a map of definitions by ID
  const definitionsMap = new Map()
  definitions.forEach(def => {
    definitionsMap.set(def.id, def)
  })

  const rows = values
    .map(value => {
      const definition = definitionsMap.get(value.definitionId)
      if (!definition) return ''

      let displayValue = value.value

      // Format value based on type
      if (definition.fieldType === 'boolean') {
        displayValue = value.value === true || value.value === 'true' ? 'Yes' : 'No'
      } else if (definition.fieldType === 'date' && value.value) {
        const date = new Date(value.value)
        displayValue = date.toLocaleDateString()
      }

      return `<p><strong>${definition.name}:</strong> ${displayValue}</p>`
    })
    .filter(row => row !== '')
    .join('')

  return `<div id="photo-metadata-view">${rows}</div>`
}

/**
 * Generate inline HTML for edit mode (form fields only, no headers or buttons)
 * @param {Array<Object>} definitions - Metadata definitions
 * @param {Array<Object>} values - Metadata values
 * @returns {string} HTML for inline form
 */
export function generateInlineEditHtml (definitions, values) {
  if (!definitions || definitions.length === 0) {
    return ''
  }

  const formHtml = MetadataFormGenerator.generateForm(definitions, values, 'photo')
  return `<div id="photo-metadata-form">${formHtml}</div>`
}

/**
 * Save metadata values for a photo
 * @param {HTMLElement} modal - Modal element
 * @param {Object} storage - MapStorage instance
 * @param {string} photoId - Photo ID
 * @param {Array<Object>} definitions - Metadata definitions
 * @returns {Promise<boolean>} Success status
 */
export async function saveMetadataValues (modal, storage, photoId, definitions) {
  if (!storage || !definitions || definitions.length === 0) {
    return true // Nothing to save
  }

  // Find the metadata edit container
  const metadataEditContainer = modal.querySelector('#photo-metadata-edit')
  if (!metadataEditContainer) {
    console.warn('photo-gallery-metadata: #photo-metadata-edit container not found')
    return true
  }

  // Find the form container within it
  const metadataFormContainer = metadataEditContainer.querySelector('.metadata-form-container')
  if (!metadataFormContainer) {
    console.warn('photo-gallery-metadata: .metadata-form-container not found within #photo-metadata-edit')
    return true // No form means no metadata to save
  }

  // Validate form
  const validation = MetadataFormGenerator.validateForm(metadataFormContainer, definitions)
  if (!validation.valid) {
    console.warn('photo-gallery-metadata: Validation failed', validation.errors)
    return false
  }

  try {
    // Extract values from the form container
    const metadataValues = MetadataFormGenerator.extractValues(
      metadataFormContainer,
      definitions,
      'photo',
      photoId
    )

    // Delete existing metadata values for this photo
    const existingValues = await storage.getMetadataValuesForEntity('photo', photoId)
    for (const value of existingValues) {
      await storage.deleteMetadataValue(value.id)
    }

    // Save new values
    for (const value of metadataValues) {
      await storage.addMetadataValue(value)
    }

    return true
  } catch (error) {
    console.error('Error saving photo metadata values:', error)
    return false
  }
}
