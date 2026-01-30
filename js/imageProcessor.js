/**
 * Image Processing Utilities
 */

/* global Image, document, FileReader, createImageBitmap, Blob */

import { blobToBase64 as libBlobToBase64, base64ToBlob as libBase64ToBlob } from '../lib/snapspot-image/converter.js'

export class ImageProcessor {
  /**
   * Converts an image Blob directly to a Base64 Data URL.
   * Useful for images that don't need resizing or specific processing.
   * Now uses shared library function.
   * @param {Blob} imageBlob - The image Blob to convert.
   * @returns {Promise<string>} A promise that resolves with the Base64 Data URL.
   */
  async blobToBase64 (imageBlob) {
    return libBlobToBase64(imageBlob)
  }

  /**
   * Converts a Base64 Data URL string to a Blob object.
   * Now uses shared library function.
   * @param {string} base64String The Base64 Data URL (e.g., "data:image/png;base64,...").
   * @param {string} [mimeType] Optional MIME type. If not provided, it's extracted from the Base64 string.
   * @returns {Blob} The Blob object.
   */
  static base64ToBlob (base64String, mimeType = null) {
    return libBase64ToBlob(base64String, mimeType)
  }

  /**
   * Resizes and compresses an image file.
   * @param {File} imageFile - The original image file from user input.
   * @param {Object} options - Resizing and compression options.
   * @param {number} [options.maxWidth=1920] - Maximum width for the resized image.
   * @param {number} [options.maxHeight=1920] - Maximum height for the resized image.
   * @param {number} [options.quality=0.8] - JPEG/WebP compression quality (0 to 1).
   * @param {string} [options.outputFormat='image/jpeg'] - Output MIME type for the image.
   * @returns {Promise<Blob>} A promise that resolves with the resized and compressed image as a Blob.
   */
  async processImage (imageFile, options = {}) {
    return new Promise((resolve, reject) => {
      const settings = {
        maxWidth: options.maxWidth || 1920,
        maxHeight: options.maxHeight || 1920,
        quality: options.quality || 0.8, // 80% quality for JPEG
        outputFormat: options.outputFormat || 'image/jpeg'
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          let width = img.width
          let height = img.height

          // Calculate new dimensions to fit within maxWidth/maxHeight while maintaining aspect ratio
          if (width > height) {
            if (width > settings.maxWidth) {
              height *= settings.maxWidth / width
              width = settings.maxWidth
            }
          } else {
            if (height > settings.maxHeight) {
              width *= settings.maxHeight / height
              height = settings.maxHeight
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')

          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0, width, height)

          // Get the image as a Blob with desired format and quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Canvas toBlob failed.'))
              }
            },
            settings.outputFormat,
            settings.quality
          )
        }
        img.onerror = (err) => reject(new Error('Failed to load image for processing: ' + err.message))
        img.src = event.target.result
      }
      reader.onerror = (err) => reject(new Error('Failed to read image file: ' + err.message))
      reader.readAsDataURL(imageFile)
    })
  }

  /**
   * Generates a small thumbnail Data URL from an image Blob for display in lists.
   * This method uses createImageBitmap for efficient scaling on the main thread
   * and minimizes memory overhead compared to full Image element loading.
   * For SVG files, it uses an Image element to preserve vector quality.
   * @param {Blob} imageBlob - The original image Blob from storage.
   * @param {number} maxSize - The maximum dimension (width or height) for the thumbnail.
   * @param {string} outputFormat - The output MIME type (e.g., 'image/jpeg', 'image/webp').
   * @param {number} quality - JPEG/WebP quality from 0 to 1.
   * @returns {Promise<string>} - A Promise that resolves with the Data URL of the thumbnail.
   */
  async generateThumbnailDataUrl (imageBlob, maxSize = 100, outputFormat = 'image/jpeg', quality = 0.7) {
    if (!(imageBlob instanceof Blob)) {
      console.error('DEBUG(imageProcessor): Invalid input for generateThumbnailDataUrl - not a Blob.', imageBlob)
      throw new Error('generateThumbnailDataUrl: Invalid input, imageBlob must be a Blob.')
    }

    // Special handling for SVG files
    if (imageBlob.type === 'image/svg+xml') {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(imageBlob)

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            let width = img.naturalWidth || img.width
            let height = img.naturalHeight || img.height

            // Calculate new dimensions to fit within maxSize while maintaining aspect ratio
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width
                width = maxSize
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height
                height = maxSize
              }
            }

            canvas.width = width
            canvas.height = height

            console.log(`DEBUG(imageProcessor): Drawing SVG to canvas for thumbnail. Canvas dimensions: ${canvas.width}x${canvas.height}`)
            ctx.drawImage(img, 0, 0, width, height)

            const dataUrl = canvas.toDataURL(outputFormat, quality)
            console.log(`DEBUG(imageProcessor): SVG thumbnail Data URL generated. Length: ${dataUrl.length}`)

            URL.revokeObjectURL(url)
            resolve(dataUrl)
          } catch (error) {
            console.error('DEBUG(imageProcessor): Error generating SVG thumbnail:', error)
            URL.revokeObjectURL(url)
            reject(error)
          }
        }

        img.onerror = (error) => {
          console.error('DEBUG(imageProcessor): Error loading SVG for thumbnail:', error)
          URL.revokeObjectURL(url)
          reject(new Error('Failed to load SVG image for thumbnail'))
        }

        img.src = url
      })
    }

    // Standard handling for raster images
    try {
      console.log('DEBUG(imageProcessor): Calling createImageBitmap with Blob:', imageBlob)
      const bitmap = await createImageBitmap(imageBlob)
      console.log('DEBUG(imageProcessor): createImageBitmap successful. Bitmap dimensions:', bitmap.width, 'x', bitmap.height)

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      let { width, height } = bitmap

      // Calculate new dimensions to fit within maxSize while maintaining aspect ratio
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height

      console.log(`DEBUG(imageProcessor): Drawing bitmap to canvas. Canvas dimensions: ${canvas.width}x${canvas.height}`)
      ctx.drawImage(bitmap, 0, 0, width, height)

      // --- FIX STARTS HERE ---
      console.log(`DEBUG(imageProcessor): Synchronously converting canvas to Data URL. Format: ${outputFormat}, Quality: ${quality}`)
      const dataUrl = canvas.toDataURL(outputFormat, quality) // Directly assigned
      console.log(`DEBUG(imageProcessor): Data URL generated. Length: ${dataUrl.length}`)
      return dataUrl // Directly returned
      // --- FIX ENDS HERE ---
    } catch (error) {
      console.error('DEBUG(imageProcessor): Error generating thumbnail Data URL IN CATCH BLOCK:', error)
      return null
    }
  }

  /**
   * Prepares an array of raw map objects for UI display.
   * Generates thumbnails using cache and settings.
   * @param {Array&lt;Object&gt;} rawMaps - Raw maps from storage.
   * @param {Map} thumbnailCache - App thumbnail cache.
   * @param {Object} imageCompressionSettings - App image compression settings.
   * @returns {Promise&lt;Array&lt;Object&gt;&gt;} Prepared maps with thumbnailDataUrl.
   */
  async prepareMapsForDisplay (rawMaps, thumbnailCache, imageCompressionSettings) {
    return Promise.all(rawMaps.map(async (map) => {
      let thumbnailDataUrl = thumbnailCache.get(map.id)
      // If no thumbnail in cache and map data is a Blob (from storage)
      if (!thumbnailDataUrl && map.imageData instanceof Blob) {
        try {
          // Use settings for thumbnails
          const mapThumbnailSettings = imageCompressionSettings.thumbnail
          thumbnailDataUrl = await this.generateThumbnailDataUrl(
            map.imageData,
            mapThumbnailSettings.maxSize,
            'image/jpeg',
            mapThumbnailSettings.quality || 0.7
          )
          if (thumbnailDataUrl) {
            thumbnailCache.set(map.id, thumbnailDataUrl)
          }
        } catch (thumbError) {
          console.warn(`App: Failed to generate thumbnail for map ${map.id}:`, thumbError)
          thumbnailDataUrl = null
        }
      } else if (!map.imageData || !(map.imageData instanceof Blob)) {
        // If map.imageData is null/undefined or not a Blob, explicitly set thumbnail to null
        thumbnailDataUrl = null
      }
      // Return map object with the generated/cached thumbnailDataUrl
      return { ...map, thumbnailDataUrl }
    }))
  }
}
