/**
 * Image Hashing Utilities
 *
 * Provides SHA-256 hashing for image data integrity verification.
 * Used to detect changes in map images and verify export file integrity.
 *
 * @module snapspot-image/hasher
 */

/**
 * Generate a SHA-256 hash of image data
 *
 * @param {Blob} blob - The image blob to hash
 * @returns {Promise<string>} Lowercase hexadecimal hash string (64 characters)
 * @throws {Error} If blob is not a valid Blob object
 * @throws {Error} If crypto.subtle is not available (requires HTTPS or localhost)
 *
 * @example
 * const blob = new Blob([imageData], { type: 'image/png' })
 * const hash = await generateImageHash(blob)
 * // => "a1b2c3d4e5f6789..." (64 chars)
 */
export async function generateImageHash (blob) {
  if (!(blob instanceof Blob)) {
    throw new Error('Invalid input: expected Blob object')
  }

  if (!crypto || !crypto.subtle) {
    throw new Error('crypto.subtle not available - requires HTTPS or localhost')
  }

  try {
    // Convert blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer()

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)

    // Convert to hex string
    const hashHex = arrayBufferToHex(hashBuffer)

    return hashHex
  } catch (error) {
    throw new Error('Failed to generate hash: ' + error.message)
  }
}

/**
 * Convert ArrayBuffer to lowercase hexadecimal string
 *
 * @private
 * @param {ArrayBuffer} buffer - Buffer to convert
 * @returns {string} Hexadecimal string
 */
function arrayBufferToHex (buffer) {
  const byteArray = new Uint8Array(buffer)
  const hexParts = []

  for (let i = 0; i < byteArray.length; i++) {
    const hex = byteArray[i].toString(16).padStart(2, '0')
    hexParts.push(hex)
  }

  return hexParts.join('')
}
