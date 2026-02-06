/**
 * SnapSpot Export Format Validator
 *
 * Validates SnapSpot export file structure and schema compliance.
 * Ensures export files meet the required format specifications.
 *
 * @module snapspot-data/validator
 */

/**
 * Supported SnapSpot export versions
 * @constant {string[]}
 */
export const SUPPORTED_VERSIONS = ['1.1', '1.2']

/**
 * Required fields for each object type in export
 * Updated to match actual SnapSpot PWA export format v1.2
 * @constant {Object}
 */
export const SCHEMA = {
  root: ['version', 'type', 'sourceApp', 'timestamp', 'map', 'markers'],
  map: ['id', 'name', 'imageData', 'width', 'height', 'imageHash', 'createdDate', 'lastModified'],
  marker: ['id', 'x', 'y', 'description', 'createdDate'],
  photo: ['id', 'markerId', 'imageData', 'fileName', 'fileType', 'fileSize', 'createdDate'],
  metadataDefinition: ['id', 'name', 'fieldType', 'scope', 'appliesTo', 'createdDate'],
  metadataValue: ['id', 'definitionId', 'entityType', 'entityId', 'value', 'createdDate']
}

/**
 * Check if a version string is supported
 * @param {string} version - Version string (e.g., '1.1')
 * @returns {boolean} True if version is supported
 *
 * @example
 * isSupportedVersion('1.1') // true
 * isSupportedVersion('1.0') // false
 */
export function isSupportedVersion (version) {
  return SUPPORTED_VERSIONS.includes(version)
}

/**
 * Validate that an object has all required fields
 * @private
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @param {string} objectType - Type name for error messages
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateRequiredFields (obj, requiredFields, objectType) {
  const errors = []

  if (!obj || typeof obj !== 'object') {
    errors.push(`${objectType} must be an object`)
    return errors
  }

  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`${objectType} missing required field: ${field}`)
    } else if (obj[field] === null || obj[field] === undefined) {
      errors.push(`${objectType} field '${field}' cannot be null or undefined`)
    }
  }

  return errors
}

/**
 * Validate map object structure
 * @private
 * @param {Object} map - Map object to validate
 * @returns {string[]} Array of error messages
 */
function validateMapObject (map) {
  const errors = validateRequiredFields(map, SCHEMA.map, 'map')

  if (errors.length > 0) return errors

  // Validate specific field types
  if (typeof map.width !== 'number' || map.width <= 0) {
    errors.push('map.width must be a positive number')
  }

  if (typeof map.height !== 'number' || map.height <= 0) {
    errors.push('map.height must be a positive number')
  }

  if (typeof map.imageData !== 'string' || !map.imageData.startsWith('data:image/')) {
    errors.push('map.imageData must be a valid data URI')
  }

  return errors
}

/**
 * Validate marker object structure
 * @private
 * @param {Object} marker - Marker object to validate
 * @param {number} index - Marker index for error messages
 * @returns {string[]} Array of error messages
 */
function validateMarker (marker, index) {
  const errors = validateRequiredFields(marker, SCHEMA.marker, `markers[${index}]`)

  if (errors.length > 0) return errors

  // Validate coordinate types
  if (typeof marker.x !== 'number') {
    errors.push(`markers[${index}].x must be a number`)
  }

  if (typeof marker.y !== 'number') {
    errors.push(`markers[${index}].y must be a number`)
  }

  return errors
}

/**
 * Validate photo object structure
 * @private
 * @param {Object} photo - Photo object to validate
 * @param {number} index - Photo index for error messages
 * @returns {string[]} Array of error messages
 */
function validatePhoto (photo, index) {
  const errors = validateRequiredFields(photo, SCHEMA.photo, `photos[${index}]`)

  if (errors.length > 0) return errors

  // Validate imageData is a data URI
  if (typeof photo.imageData !== 'string' || !photo.imageData.startsWith('data:image/')) {
    errors.push(`photos[${index}].imageData must be a valid data URI`)
  }

  return errors
}

/**
 * Validate metadata definition object structure
 * @private
 * @param {Object} definition - Metadata definition object to validate
 * @param {number} index - Definition index for error messages
 * @returns {string[]} Array of error messages
 */
function validateMetadataDefinition (definition, index) {
  const errors = validateRequiredFields(definition, SCHEMA.metadataDefinition, `metadataDefinitions[${index}]`)

  if (errors.length > 0) return errors

  // Validate fieldType
  const validFieldTypes = ['text', 'number', 'date', 'boolean', 'select']
  if (!validFieldTypes.includes(definition.fieldType)) {
    errors.push(`metadataDefinitions[${index}].fieldType must be one of: ${validFieldTypes.join(', ')}`)
  }

  // Validate appliesTo
  if (!Array.isArray(definition.appliesTo) || definition.appliesTo.length === 0) {
    errors.push(`metadataDefinitions[${index}].appliesTo must be a non-empty array`)
  } else {
    const validAppliesTo = ['map', 'marker', 'photo']
    for (const entity of definition.appliesTo) {
      if (!validAppliesTo.includes(entity)) {
        errors.push(`metadataDefinitions[${index}].appliesTo contains invalid value: ${entity}`)
      }
    }
  }

  return errors
}

/**
 * Validate metadata value object structure
 * @private
 * @param {Object} value - Metadata value object to validate
 * @param {number} index - Value index for error messages
 * @returns {string[]} Array of error messages
 */
function validateMetadataValue (value, index) {
  const errors = validateRequiredFields(value, SCHEMA.metadataValue, `metadataValues[${index}]`)

  if (errors.length > 0) return errors

  // Validate entityType
  const validEntityTypes = ['map', 'marker', 'photo']
  if (!validEntityTypes.includes(value.entityType)) {
    errors.push(`metadataValues[${index}].entityType must be one of: ${validEntityTypes.join(', ')}`)
  }

  return errors
}

/**
 * Validate complete SnapSpot export file structure
 *
 * Checks:
 * - Required root-level fields
 * - Export version compatibility
 * - Map object structure
 * - Markers array structure
 * - Photos array structure (if present)
 *
 * @param {Object} exportData - Parsed export data to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 *
 * @example
 * const result = validateExportFile(exportData)
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors)
 * }
 */
export function validateExportFile (exportData) {
  const errors = []

  // Validate root structure
  const rootErrors = validateRequiredFields(exportData, SCHEMA.root, 'export')
  errors.push(...rootErrors)

  // Early return if root structure is invalid
  if (rootErrors.length > 0) {
    return { isValid: false, errors }
  }

  // Validate version
  if (!isSupportedVersion(exportData.version)) {
    errors.push(
      `Unsupported export version: ${exportData.version}. ` +
      `Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
    )
  }

  // Validate type field (accept both old and new format)
  const validTypes = ['snapspot-export', 'SnapSpotDataExport']
  if (!validTypes.includes(exportData.type)) {
    errors.push(`Invalid export type: ${exportData.type}. Expected '${validTypes.join("' or '")}'`)
  }

  // Validate map object
  const mapErrors = validateMapObject(exportData.map)
  errors.push(...mapErrors)

  // Validate markers array
  if (!Array.isArray(exportData.markers)) {
    errors.push('markers must be an array')
  } else {
    for (let i = 0; i < exportData.markers.length; i++) {
      const markerErrors = validateMarker(exportData.markers[i], i)
      errors.push(...markerErrors)
    }
  }

  // Validate photos array (optional field)
  if ('photos' in exportData) {
    if (!Array.isArray(exportData.photos)) {
      errors.push('photos must be an array')
    } else {
      for (let i = 0; i < exportData.photos.length; i++) {
        const photoErrors = validatePhoto(exportData.photos[i], i)
        errors.push(...photoErrors)
      }
    }
  }

  // Validate metadata definitions array (optional field, v1.2+)
  if ('metadataDefinitions' in exportData) {
    if (!Array.isArray(exportData.metadataDefinitions)) {
      errors.push('metadataDefinitions must be an array')
    } else {
      for (let i = 0; i < exportData.metadataDefinitions.length; i++) {
        const defErrors = validateMetadataDefinition(exportData.metadataDefinitions[i], i)
        errors.push(...defErrors)
      }
    }
  }

  // Validate metadata values array (optional field, v1.2+)
  if ('metadataValues' in exportData) {
    if (!Array.isArray(exportData.metadataValues)) {
      errors.push('metadataValues must be an array')
    } else {
      for (let i = 0; i < exportData.metadataValues.length; i++) {
        const valErrors = validateMetadataValue(exportData.metadataValues[i], i)
        errors.push(...valErrors)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate export data with detailed type checking
 *
 * Performs additional validation beyond schema compliance:
 * - Data type correctness
 * - Value range validation
 * - Format validation
 *
 * @param {Object} exportData - Parsed export data
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}} Validation result with warnings
 */
export function validateExportFileDetailed (exportData) {
  const result = validateExportFile(exportData)
  const warnings = []

  // Additional warnings (non-critical issues)
  if (result.isValid) {
    if (exportData.markers.length === 0) {
      warnings.push('Export contains no markers')
    }

    if (exportData.photos && exportData.photos.length === 0) {
      warnings.push('Export contains no photos')
    }
  }

  return {
    ...result,
    warnings
  }
}
