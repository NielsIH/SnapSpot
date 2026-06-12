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
export const SUPPORTED_VERSIONS = ['1.1', '1.2', '1.3']

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
  metadataValue: ['id', 'definitionId', 'entityType', 'entityId', 'value', 'createdDate'],
  markerTypeDefinition: ['id', 'name', 'shape', 'color', 'scope', 'createdDate']
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

  if ('type' in marker && marker.type !== undefined && marker.type !== 'line') {
    errors.push(`markers[${index}].type must be 'line' when provided`)
  }

  if ('lineGroupId' in marker && marker.lineGroupId !== undefined && typeof marker.lineGroupId !== 'string') {
    errors.push(`markers[${index}].lineGroupId must be a string when provided`)
  }

  if ('lineColor' in marker && marker.lineColor !== undefined && typeof marker.lineColor !== 'string') {
    errors.push(`markers[${index}].lineColor must be a string when provided`)
  }

  if ('lineCaption' in marker && marker.lineCaption !== undefined && typeof marker.lineCaption !== 'string') {
    errors.push(`markers[${index}].lineCaption must be a string when provided`)
  }

  if ('markerTypeId' in marker && marker.markerTypeId !== undefined && marker.markerTypeId !== null && typeof marker.markerTypeId !== 'string') {
    errors.push(`markers[${index}].markerTypeId must be a string when provided`)
  }

  if ('direction' in marker && marker.direction !== undefined && marker.direction !== null) {
    if (typeof marker.direction !== 'number' || marker.direction < 0 || marker.direction > 360) {
      errors.push(`markers[${index}].direction must be a number between 0 and 360`)
    }
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
 * Validate marker type definition object structure
 * @private
 * @param {Object} definition - Marker type definition object to validate
 * @param {number} index - Definition index for error messages
 * @returns {string[]} Array of error messages
 */
function validateMarkerTypeDefinition (definition, index) {
  const errors = validateRequiredFields(definition, SCHEMA.markerTypeDefinition, `markerTypeDefinitions[${index}]`)

  if (errors.length > 0) return errors

  // Validate shape
  const validShapes = ['circle', 'square', 'diamond', 'arrow']
  if (!validShapes.includes(definition.shape)) {
    errors.push(`markerTypeDefinitions[${index}].shape must be one of: ${validShapes.join(', ')}`)
  }

  // Validate color hex format
  if (typeof definition.color !== 'string' || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(definition.color)) {
    errors.push(`markerTypeDefinitions[${index}].color must be a valid hex color (#RRGGBB or #RGB)`)
  }

  // Validate scope
  if (definition.scope !== 'global') {
    errors.push(`markerTypeDefinitions[${index}].scope must be 'global'`)
  }

  // Validate behavior (optional field)
  if ('behavior' in definition) {
    const validBehaviors = ['point', 'line-pair']
    if (!validBehaviors.includes(definition.behavior)) {
      errors.push(`markerTypeDefinitions[${index}].behavior must be one of: ${validBehaviors.join(', ')}`)
    }
  }

  // Validate supportsPhotos (optional field)
  if ('supportsPhotos' in definition && typeof definition.supportsPhotos !== 'boolean') {
    errors.push(`markerTypeDefinitions[${index}].supportsPhotos must be a boolean`)
  }

  // Validate size (optional field)
  if ('size' in definition) {
    const validSizes = ['small', 'normal', 'large']
    if (!validSizes.includes(definition.size)) {
      errors.push(`markerTypeDefinitions[${index}].size must be one of: ${validSizes.join(', ')}`)
    }
  }

  // Validate isBuiltIn (optional field)
  if ('isBuiltIn' in definition && typeof definition.isBuiltIn !== 'boolean') {
    errors.push(`markerTypeDefinitions[${index}].isBuiltIn must be a boolean`)
  }

  // Validate isPreset (optional field)
  if ('isPreset' in definition && typeof definition.isPreset !== 'boolean') {
    errors.push(`markerTypeDefinitions[${index}].isPreset must be a boolean`)
  }

  // Validate label (optional field)
  if ('label' in definition && definition.label !== null && definition.label !== undefined) {
    if (typeof definition.label !== 'string') {
      errors.push(`markerTypeDefinitions[${index}].label must be a string`)
    } else if (definition.label.length > 4) {
      errors.push(`markerTypeDefinitions[${index}].label must be 4 characters or less`)
    }
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

  // Validate marker type definitions array (optional field, v1.3+)
  if ('markerTypeDefinitions' in exportData) {
    if (!Array.isArray(exportData.markerTypeDefinitions)) {
      errors.push('markerTypeDefinitions must be an array')
    } else {
      for (let i = 0; i < exportData.markerTypeDefinitions.length; i++) {
        const defErrors = validateMarkerTypeDefinition(exportData.markerTypeDefinitions[i], i)
        errors.push(...defErrors)
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
