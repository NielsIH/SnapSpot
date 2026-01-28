/**
 * File Loader Utility
 *
 * Provides reusable file loading and validation utilities.
 * Handles loading files as text, data URLs, blobs, and images.
 */

/**
 * File loading and validation utilities
 */
export class FileLoader {
  /**
   * Load a file as text
   * @param {File} file - File to load
   * @returns {Promise<string>} File contents as text
   */
  static loadAsText (file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        resolve(e.target.result)
      }

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`))
      }

      reader.readAsText(file)
    })
  }

  /**
   * Load a file as data URL
   * @param {File} file - File to load
   * @returns {Promise<string>} File contents as data URL
   */
  static loadAsDataURL (file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'))
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        resolve(e.target.result)
      }

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`))
      }

      reader.readAsDataURL(file)
    })
  }

  /**
   * Load a file as blob
   * @param {File} file - File to load
   * @returns {Promise<Blob>} File as blob
   */
  static loadAsBlob (file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'))
        return
      }

      // File already is a Blob
      resolve(file)
    })
  }

  /**
   * Load a file as an image
   * @param {File} file - Image file to load
   * @returns {Promise<{image: HTMLImageElement, width: number, height: number}>}
   */
  static async loadAsImage (file) {
    if (!file) {
      throw new Error('No file provided')
    }

    // Validate image type
    if (!file.type.startsWith('image/')) {
      throw new Error(`File is not an image: ${file.type}`)
    }

    // Load as data URL
    const dataURL = await this.loadAsDataURL(file)

    // Create image
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        resolve({
          image: img,
          width: img.width,
          height: img.height
        })
      }

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${file.name}`))
      }

      img.src = dataURL
    })
  }

  /**
   * Validate file type
   * @param {File} file - File to validate
   * @param {string[]} allowedTypes - Allowed MIME types (e.g., ['image/png', 'image/jpeg'])
   * @returns {boolean} True if file type is allowed
   */
  static validateFileType (file, allowedTypes) {
    if (!file) {
      return false
    }

    if (!allowedTypes || allowedTypes.length === 0) {
      return true
    }

    return allowedTypes.some(type => {
      // Support wildcards (e.g., 'image/*')
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2)
        return file.type.startsWith(prefix)
      }
      return file.type === type
    })
  }

  /**
   * Validate file size
   * @param {File} file - File to validate
   * @param {number} maxSizeBytes - Maximum file size in bytes
   * @returns {boolean} True if file size is within limit
   */
  static validateFileSize (file, maxSizeBytes) {
    if (!file) {
      return false
    }

    if (!maxSizeBytes || maxSizeBytes <= 0) {
      return true
    }

    return file.size <= maxSizeBytes
  }

  /**
   * Validate a file
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @param {string[]} options.allowedTypes - Allowed MIME types
   * @param {number} options.maxSizeBytes - Maximum file size in bytes
   * @returns {{valid: boolean, error: string|null}}
   */
  static validate (file, options = {}) {
    const { allowedTypes = null, maxSizeBytes = null } = options

    if (!file) {
      return { valid: false, error: 'No file provided' }
    }

    // Check file type
    if (allowedTypes && !this.validateFileType(file, allowedTypes)) {
      const typesStr = allowedTypes.join(', ')
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Allowed types: ${typesStr}`
      }
    }

    // Check file size
    if (maxSizeBytes && !this.validateFileSize(file, maxSizeBytes)) {
      const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(2)
      const fileMB = (file.size / (1024 * 1024)).toFixed(2)
      return {
        valid: false,
        error: `File too large: ${fileMB} MB. Maximum size: ${maxMB} MB`
      }
    }

    return { valid: true, error: null }
  }

  /**
   * Create a drag-drop zone
   * @param {HTMLElement} element - Element to make a drop zone
   * @param {Function} onFileDrop - Callback when files are dropped: (files) => void
   * @param {Object} options - Options
   * @param {string[]} options.allowedTypes - Allowed MIME types
   * @param {number} options.maxSizeBytes - Maximum file size
   * @param {boolean} options.multiple - Allow multiple files
   * @returns {Function} Cleanup function to remove event listeners
   */
  static createDropZone (element, onFileDrop, options = {}) {
    const {
      allowedTypes = null,
      maxSizeBytes = null,
      multiple = false
    } = options

    // Prevent default drag behaviors
    const preventDefaults = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }

    // Highlight drop zone when dragging over
    const highlight = (e) => {
      preventDefaults(e)
      element.classList.add('dragover')
    }

    // Unhighlight drop zone when dragging away
    const unhighlight = (e) => {
      preventDefaults(e)
      element.classList.remove('dragover')
    }

    // Handle file drop
    const handleDrop = (e) => {
      preventDefaults(e)
      unhighlight(e)

      const dt = e.dataTransfer
      const files = Array.from(dt.files)

      // Filter to single file if not multiple
      const filesToProcess = multiple ? files : files.slice(0, 1)

      // Validate files
      const validFiles = []
      const errors = []

      for (const file of filesToProcess) {
        const validation = FileLoader.validate(file, { allowedTypes, maxSizeBytes })
        if (validation.valid) {
          validFiles.push(file)
        } else {
          errors.push(`${file.name}: ${validation.error}`)
        }
      }

      // Show errors if any
      if (errors.length > 0) {
        console.error('File validation errors:', errors)
        // Could call an error callback here if provided
      }

      // Call callback with valid files
      if (validFiles.length > 0) {
        onFileDrop(validFiles)
      }
    };

    // Add event listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      element.addEventListener(eventName, preventDefaults, false)
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      element.addEventListener(eventName, highlight, false)
    });

    ['dragleave', 'drop'].forEach(eventName => {
      element.addEventListener(eventName, unhighlight, false)
    })

    element.addEventListener('drop', handleDrop, false)

    // Return cleanup function
    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        element.removeEventListener(eventName, preventDefaults, false)
      });
      ['dragenter', 'dragover'].forEach(eventName => {
        element.removeEventListener(eventName, highlight, false)
      });
      ['dragleave', 'drop'].forEach(eventName => {
        element.removeEventListener(eventName, unhighlight, false)
      })
      element.removeEventListener('drop', handleDrop, false)
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size (e.g., "1.5 MB")
   */
  static formatFileSize (bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
