/**
 * SnapSpot PWA - Marker Details Metadata
 * Handles metadata functionality for marker details modal
 */

/* global console */

import { MetadataFormGenerator } from './metadata-form-generator.js'

/**
 * Load metadata for a marker and render in view or edit mode
 * @param {Object} storage - MapStorage instance
 * @param {string} markerId - Marker ID
 * @param {string} mode - 'view' or 'edit'
 * @returns {Promise<{html: string, definitions: Array, values: Array}>}
 */
export async function loadMetadataSection (storage, markerId, mode = 'view') {
  if (!storage) {
    console.warn('marker-details-metadata: Storage not available')
    return { html: '', definitions: [], values: [] }
  }

  try {
    // Load metadata definitions for markers
    const allDefinitions = await storage.getAllMetadataDefinitions()
    const markerDefinitions = allDefinitions.filter(def => def.appliesTo.includes('marker'))

    // Load existing metadata values
    const metadataValues = await storage.getMetadataValuesForEntity('marker', markerId)

    // Generate HTML based on mode
    let html = ''
    if (mode === 'view') {
      html = generateViewModeHtml(markerDefinitions, metadataValues)
    } else if (mode === 'edit') {
      html = generateEditModeHtml(markerDefinitions, metadataValues)
    }

    return {
      html,
      definitions: markerDefinitions,
      values: metadataValues
    }
  } catch (error) {
    console.error('Error loading metadata section:', error)
    return { html: '', definitions: [], values: [] }
  }
}

/**
 * Generate HTML for view mode (read-only)
 * @param {Array<Object>} definitions - Metadata definitions
 * @param {Array<Object>} values - Metadata values
 * @returns {string} HTML for view mode
 */
function generateViewModeHtml (definitions, values) {
  // If no values, don't show anything
  if (!values || values.length === 0) {
    return ''
  }

  // Use the form generator's read-only renderer
  const readOnlyHtml = MetadataFormGenerator.renderReadOnly(definitions, values)

  if (!readOnlyHtml) {
    return '' // No valid metadata to display
  }

  return `
    <div class="marker-metadata-section" id="marker-metadata-section">
      ${readOnlyHtml}
      <button class="btn btn-secondary btn-sm" id="btn-edit-metadata" type="button">✏️ Edit Metadata</button>
    </div>
  `
}

/**
 * Generate HTML for edit mode (editable form)
 * @param {Array<Object>} definitions - Metadata definitions
 * @param {Array<Object>} values - Metadata values
 * @returns {string} HTML for edit mode
 */
function generateEditModeHtml (definitions, values) {
  if (!definitions || definitions.length === 0) {
    return `
      <div class="marker-metadata-section" id="marker-metadata-section">
        <div class="metadata-empty-state">
          <p class="text-secondary">No custom fields defined for markers.</p>
          <small class="text-muted">Add fields in Settings → Metadata.</small>
        </div>
      </div>
    `
  }

  const formHtml = MetadataFormGenerator.generateForm(definitions, values, 'marker')

  return `
    <div class="marker-metadata-section" id="marker-metadata-section">
      <h4>Additional Information</h4>
      ${formHtml}
    </div>
  `
}

/**
 * Setup metadata edit button handler
 * @param {HTMLElement} modal - Modal element
 * @param {Function} onEditMetadata - Callback when edit metadata is clicked
 */
export function setupMetadataEditHandler (modal, onEditMetadata) {
  const editMetadataBtn = modal.querySelector('#btn-edit-metadata')
  if (editMetadataBtn) {
    editMetadataBtn.addEventListener('click', () => {
      if (onEditMetadata) onEditMetadata()
    })
  }
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

  const metadataSection = modal.querySelector('#marker-metadata-section')
  if (!metadataSection) {
    console.warn('marker-details-metadata: Metadata section not found')
    return true
  }

  // Validate form
  const validation = MetadataFormGenerator.validateForm(metadataSection, definitions)
  if (!validation.valid) {
    console.warn('marker-details-metadata: Validation failed', validation.errors)
    return false
  }

  try {
    // Extract values
    const metadataValues = MetadataFormGenerator.extractValues(
      metadataSection,
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
      await storage.saveMetadataValue(value)
    }

    console.log(`marker-details-metadata: Saved ${metadataValues.length} metadata values for marker ${markerId}`)
    return true
  } catch (error) {
    console.error('Error saving metadata values:', error)
    return false
  }
}

/**
 * Toggle between view and edit modes for metadata
 * @param {HTMLElement} modal - Modal element
 * @param {Object} storage - MapStorage instance
 * @param {string} markerId - Marker ID
 * @param {string} mode - 'view' or 'edit'
 */
export async function toggleMetadataMode (modal, storage, markerId, mode) {
  const metadataSection = modal.querySelector('#marker-metadata-section')
  if (!metadataSection) {
    console.warn('marker-details-metadata: Metadata section not found')
    return
  }

  const metadataData = await loadMetadataSection(storage, markerId, mode)
  metadataSection.outerHTML = metadataData.html

  // If switching to view mode, setup edit button
  if (mode === 'view') {
    setupMetadataEditHandler(modal, () => {
      toggleMetadataMode(modal, storage, markerId, 'edit')
    })
  }
}
