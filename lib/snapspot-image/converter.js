/**
 * Blob ↔ Base64 Data URI Conversion Utilities
 *
 * Provides functions to convert between Blob objects and base64-encoded data URIs.
 * Used for image serialization in SnapSpot export files.
 *
 * @module snapspot-image/converter
 */

/* global FileReader, Blob */

/**
 * Convert a Blob to a base64-encoded data URI
 *
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} Base64 data URI (e.g., "data:image/png;base64,iVBORw0KG...")
 * @throws {Error} If blob is not a valid Blob object
 *
 * @example
 * const blob = new Blob([imageData], { type: 'image/png' })
 * const dataUri = await blobToBase64(blob)
 * // => "data:image/png;base64,iVBORw0KG..."
 */
export async function blobToBase64 (blob) {
  if (!(blob instanceof Blob)) {
    throw new Error('Invalid input: expected Blob object')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }

    reader.onerror = () => {
      reject(new Error('FileReader error: ' + reader.error?.message || 'Unknown error'))
    }

    reader.readAsDataURL(blob)
  })
}

/**
 * Convert a base64 data URI to a Blob
 *
 * @param {string} dataUri - Base64 data URI string
 * @param {string|null} mimeType - Optional MIME type override (auto-detected if not provided)
 * @returns {Blob} Blob object
 * @throws {Error} If dataUri is invalid or empty
 *
 * @example
 * const dataUri = "data:image/png;base64,iVBORw0KG..."
 * const blob = base64ToBlob(dataUri)
 * // => Blob { size: 1234, type: "image/png" }
 */
export function base64ToBlob (dataUri, mimeType = null) {
  if (!dataUri || typeof dataUri !== 'string') {
    throw new Error('Invalid data URI: expected non-empty string')
  }

  // Extract MIME type and base64 data
  const dataUriPattern = /^data:([^;]+);base64,(.+)$/
  const matches = dataUri.match(dataUriPattern)

  if (!matches) {
    throw new Error('Invalid data URI format: expected "data:<mime>;base64,<data>"')
  }

  const detectedMimeType = matches[1]
  const base64Data = matches[2]

  if (!base64Data) {
    throw new Error('Invalid data URI: no base64 data found')
  }

  // Use provided MIME type or detected one
  const finalMimeType = mimeType || detectedMimeType

  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new Blob([bytes], { type: finalMimeType })
  } catch (error) {
    throw new Error('Failed to decode base64 data: ' + error.message)
  }
}
