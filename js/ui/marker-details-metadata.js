/**
 * SnapSpot PWA - Marker Details Metadata
 * Handles metadata functionality for marker details modal
 */

/* global console */

import { MetadataFormGenerator } from './metadata-form-generator.js'

/**
 * Load metadata definitions and values for a marker
 * @param {Object} storage - MapStorage instance
 * @param {string} markerId - Marker ID
 * @returns {Promise<{definitions: Array, values: Array}>}
 */
export async function loadMetadata (storage, markerId) {
  if (!storage) {
    return { definitions: [], values: [] }
  }

  try {
    const allDefinitions = await storage.getAllMetadataDefinitions()
    const markerDefinitions = allDefinitions.filter(def => def.appliesTo.includes('marker'))
    const metadataValues = await storage.getMetadataValuesForEntity('marker', markerId)

    return {
      definitions: markerDefinitions,
      values: metadataValues
    }
  } catch (error) {
    console.error('Error loading metadata:', error)
    return { definitions: [], values: [] }
  }
}

/**
 * Generate inline HTML for view mode (read-only, no headers or buttons)
 * @param {Array<Object>} definitions - Metadata definitions
 * @param {Array<Object>} values - Metadata values
 * @returns {string} HTML for inline display
 */
export function generateInlineViewHtml (definitions, values) {
  if (!definitions || definitions.length === 0 || !values || values.length === 0) {
    return '<div id="marker-metadata-view"></div>'
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

  return `<div id="marker-metadata-view">${rows}</div>`
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

  const formHtml = MetadataFormGenerator.generateForm(definitions, values, 'marker')
  return `<div id="marker-metadata-form">${formHtml}</div>`
}

/**
 * Save metadata values for a marker
 * @param {HTMLElement} modal - Modal element
 * @param {Object} storage - MapStorage instance
 * @param {string} markerId - Marker ID
 * @param {Array<Object>} definitions - Metadata definitions
 * @returns {Promise<boolean>} Success status
 */
export async function saveMetadataValues (modal, storage, markerId, definitions) {
  if (!storage || !definitions || definitions.length === 0) {
    return true // Nothing to save
  }

  // First try to find the metadata edit container
  const metadataEditContainer = modal.querySelector('#marker-metadata-edit')
  if (!metadataEditContainer) {
    console.warn('marker-details-metadata: #marker-metadata-edit container not found')
    return true
  }

  // Then find the form container within it
  const metadataFormContainer = metadataEditContainer.querySelector('.metadata-form-container')
  if (!metadataFormContainer) {
    console.warn('marker-details-metadata: .metadata-form-container not found within #marker-metadata-edit')
    return true // No form means no metadata to save
  }

  // Validate form
  const validation = MetadataFormGenerator.validateForm(metadataFormContainer, definitions)
  if (!validation.valid) {
    console.warn('marker-details-metadata: Validation failed', validation.errors)
    return false
  }

  try {
    // Extract values from the form container
    const metadataValues = MetadataFormGenerator.extractValues(
      metadataFormContainer,
      definitions,
      'marker',
      markerId
    )

    // Delete existing metadata values for this marker
    const existingValues = await storage.getMetadataValuesForEntity('marker', markerId)
    for (const value of existingValues) {
      await storage.deleteMetadataValue(value.id)
    }

    // Save new values
    for (const value of metadataValues) {
      await storage.addMetadataValue(value)
    }

    return true
  } catch (error) {
    console.error('Error saving metadata values:', error)
    return false
  }
}
