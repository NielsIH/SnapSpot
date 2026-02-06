/* eslint-disable no-console */
/* global indexedDB */

/**
 * SnapSpot PWA - Storage System
 * Phase 1C: IndexedDB wrapper for map metadata, markers, and photos
 */

import { ImageProcessor } from './imageProcessor.js'

/**
 * IndexedDB wrapper for managing map storage
 * Stores map metadata, marker data, and photo data (Base64 strings for Safari compatibility)
 */
export class MapStorage {
  constructor (imageProcessor = null) {
    this.dbName = 'SnapSpotDB'
    this.version = 5 // Increment the database version for schema changes!
    this.db = null
    this.mapStoreName = 'maps'
    this.markerStoreName = 'markers'
    this.photoStoreName = 'photos'
    this.metadataDefinitionsStoreName = 'metadataDefinitions'
    this.metadataValuesStoreName = 'metadataValues'
    this.keyPath = 'id'
    this.imageProcessor = imageProcessor
  }

  /**
   * Initialize IndexedDB connection and create object stores
   */
  async init () {
    return new Promise((resolve, reject) => {
      console.log('MapStorage: Initializing IndexedDB...')

      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('MapStorage: Failed to open IndexedDB', request.error)
        reject(new Error(`Failed to initialize storage: ${request.error}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('MapStorage: IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        console.log('MapStorage: Creating/upgrading database schema... Current version:', event.oldVersion, 'New version:', event.newVersion)
        const db = event.target.result
        const transaction = event.target.transaction // Get the transaction for this upgrade

        // Add event listeners to the upgrade transaction for better debugging
        transaction.oncomplete = () => {
          console.log('MapStorage: Upgrade transaction completed successfully.')
        }
        transaction.onerror = (e) => {
          console.error('MapStorage: Upgrade transaction ERROR:', e.target.error)
        }
        transaction.onabort = (e) => {
          console.error('MapStorage: Upgrade transaction ABORTED:', e.target.error)
        }

        // Create or upgrade maps object store
        let mapStore
        if (!db.objectStoreNames.contains(this.mapStoreName)) {
          mapStore = db.createObjectStore(this.mapStoreName, {
            keyPath: this.keyPath
          })
          mapStore.createIndex('name', 'name', { unique: false })
          mapStore.createIndex('createdDate', 'createdDate', { unique: false })
          mapStore.createIndex('lastModified', 'lastModified', { unique: false })
          mapStore.createIndex('isActive', 'isActive', { unique: false })
          mapStore.createIndex('imageHash', 'imageHash', { unique: false })
          console.log('MapStorage: Maps object store created/upgraded with indexes')
        } else {
          mapStore = transaction.objectStore(this.mapStoreName)
          // Check if index already exists. Add if not.
          if (!mapStore.indexNames.contains('imageHash')) {
            mapStore.createIndex('imageHash', 'imageHash', { unique: false })
            console.log('MapStorage: Added "imageHash" index to maps object store')
          }
        }

        if (!db.objectStoreNames.contains(this.markerStoreName)) {
          const markerStore = db.createObjectStore(this.markerStoreName, {
            keyPath: this.keyPath
          })
          markerStore.createIndex('mapId', 'mapId', { unique: false }) // Index to quickly find markers for a map
          markerStore.createIndex('createdDate', 'createdDate', { unique: false })
          console.log('MapStorage: Markers object store created/upgraded with indexes')
        }

        if (!db.objectStoreNames.contains(this.photoStoreName)) {
          const photoStore = db.createObjectStore(this.photoStoreName, {
            keyPath: this.keyPath
          })
          photoStore.createIndex('markerId', 'markerId', { unique: false }) // Index to quickly find photos for a marker
          photoStore.createIndex('createdDate', 'createdDate', { unique: false })
          console.log('MapStorage: Photos object store created/upgraded with indexes')
        }

        // Create metadata definitions object store
        if (!db.objectStoreNames.contains(this.metadataDefinitionsStoreName)) {
          const metadataDefStore = db.createObjectStore(this.metadataDefinitionsStoreName, {
            keyPath: this.keyPath
          })
          metadataDefStore.createIndex('scope', 'scope', { unique: false }) // Filter global vs map-specific
          metadataDefStore.createIndex('appliesTo', 'appliesTo', { unique: false, multiEntry: true }) // Multi-entry for array
          metadataDefStore.createIndex('name', 'name', { unique: false }) // Search by field name
          console.log('MapStorage: Metadata definitions object store created with indexes')
        }

        // Create metadata values object store
        if (!db.objectStoreNames.contains(this.metadataValuesStoreName)) {
          const metadataValStore = db.createObjectStore(this.metadataValuesStoreName, {
            keyPath: this.keyPath
          })
          metadataValStore.createIndex('definitionId', 'definitionId', { unique: false }) // Find all values for a definition
          metadataValStore.createIndex('entityType', 'entityType', { unique: false }) // Find all values for a type
          metadataValStore.createIndex('entityId', 'entityId', { unique: false }) // Find all values for an entity
          metadataValStore.createIndex('entityTypeAndId', ['entityType', 'entityId'], { unique: false }) // Compound index
          console.log('MapStorage: Metadata values object store created with indexes')
        }
      }
    })
  }

  /**
   * Generate a unique ID for new items
   * @param {string} prefix - Prefix for the ID (e.g., 'map', 'marker', 'photo')
   * @returns {string} - Unique ID
   */
  generateId (prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add a new map to storage
   * @param {Object} mapData - Map metadata object
   * @param {string} mapData.id - (Optional) Pre-defined ID for the map. If not provided, a new one is generated.
   * @param {string} mapData.imageHash - The SHA256 hash of the map image content.
   * @param {Blob} mapData.imageData - The actual image Blob for the map.
   * @returns {Promise<Object>} - The saved map object with generated ID
   */
  async addMap (mapData) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    // Ensure imageData is a Blob if provided. This is crucial.
    if (mapData.imageData !== null && mapData.imageData !== undefined && !(mapData.imageData instanceof Blob)) {
      throw new Error('MapStorage: imageData must be a Blob object if provided (or null/undefined).')
    }

    // Convert Blob to Base64 for Safari compatibility
    let imageDataBase64 = null
    if (mapData.imageData && !this.imageProcessor) {
      throw new Error('MapStorage: ImageProcessor is required to store image data')
    }
    if (mapData.imageData && this.imageProcessor) {
      try {
        imageDataBase64 = await this.imageProcessor.blobToBase64(mapData.imageData)
        console.log('MapStorage: Converted map image Blob to Base64 for Safari compatibility')
      } catch (error) {
        console.error('MapStorage: Failed to convert map image Blob to Base64:', error)
        throw new Error(`Failed to convert map image to Base64: ${error.message}`)
      }
    }

    const map = {
      id: mapData.id || this.generateId('map'),
      name: mapData.name || 'Untitled Map',
      description: mapData.description || '',
      fileName: mapData.fileName || '',
      filePath: mapData.filePath || '',
      width: mapData.width || 0,
      height: mapData.height || 0,
      fileSize: mapData.fileSize || 0,
      fileType: mapData.fileType || '',
      createdDate: new Date(),
      lastModified: new Date(),
      isActive: mapData.isActive || false,
      imageHash: mapData.imageHash || null,
      imageData: imageDataBase64, // Store Base64 string instead of Blob for Safari compatibility
      settings: {
        defaultZoom: 1,
        allowMarkers: true,
        ...mapData.settings
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.mapStoreName], 'readwrite')
      const store = transaction.objectStore(this.mapStoreName)

      const request = store.put(map)

      request.onsuccess = () => {
        console.log('MapStorage: Map added/updated successfully', map.id)
        resolve(map)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to add/update map', request.error)
        reject(new Error(`Failed to save map: ${request.error}`))
      }
    })
  }

  /**
   * Get all maps from storage, enriched with marker count.\n   * This method fetches raw map data and calculates marker counts.\n   * Thumbnail Data URL generation is left to the application logic (e.g., App.js).\n   * @returns {Promise<Array<Object>>} - Array of all map objects, each including a 'markerCount' property.\n   */
  async getAllMaps () { // Modified to include markerCount and full map object
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    const transaction = this.db.transaction([this.mapStoreName, this.markerStoreName], 'readonly')
    const mapStore = transaction.objectStore(this.mapStoreName)
    const markerStore = transaction.objectStore(this.markerStoreName) // Need marker store for count

    // Fetch all raw map objects
    const allMapsRaw = await new Promise((resolve, reject) => {
      const request = mapStore.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    // Enrich each map with its marker count
    const mapsWithDetails = await Promise.all(allMapsRaw.map(async (map) => {
      const markers = await new Promise((resolve, reject) => {
        const request = markerStore.index('mapId').getAll(map.id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const markerCount = markers.length

      // Convert Base64 imageData back to Blob for compatibility
      if (map.imageData && this.imageProcessor) {
        try {
          if (typeof map.imageData === 'string') {
            // Convert Base64 string to Blob
            map.imageData = ImageProcessor.base64ToBlob(map.imageData, map.fileType)
          }
          console.log('MapStorage: Converted map image Base64 to Blob in getAllMaps')
        } catch (error) {
          console.error('MapStorage: Failed to convert map image Base64 to Blob in getAllMaps:', error)
          // Continue with original data if conversion fails
        }
      }

      return {
        ...map, // Spread the entire raw map object
        markerCount // Add or overwrite markerCount property
      }
    }))

    console.log(`MapStorage: Retrieved ${mapsWithDetails.length} maps with marker counts.`)
    return mapsWithDetails
  }

  /**
   * Get a specific map by ID
   * @param {string} id - Map ID
   * @returns {Promise<Object|null>} - Map object (including imageData as Blob) or null if not found
   */
  async getMap (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.mapStoreName], 'readonly')
      const store = transaction.objectStore(this.mapStoreName)
      const request = store.get(id)

      request.onsuccess = async () => {
        const map = request.result
        if (map && map.imageData && this.imageProcessor) {
          try {
            if (typeof map.imageData === 'string') {
              // Convert Base64 string to Blob
              map.imageData = ImageProcessor.base64ToBlob(map.imageData, map.fileType)
            }
            console.log('MapStorage: Converted map image Base64 to Blob for application use')
          } catch (error) {
            console.error('MapStorage: Failed to convert map image Base64 to Blob:', error)
            // Continue with original data if conversion fails
          }
        }
        console.log('MapStorage: Retrieved map', id, map ? 'found' : 'not found')
        resolve(map || null)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get map', request.error)
        reject(new Error(`Failed to load map: ${request.error}`))
      }
    })
  }

  /**
   * Get maps by imageHash
   * @param {string} imageHash - The SHA256 hash of the map image content.
   * @returns {Promise<Array<Object>>} - Array of map objects matching the hash.
   */
  async getMapsByImageHash (imageHash) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    if (!imageHash) {
      return [] // No hash provided, no maps to find
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.mapStoreName], 'readonly')
      const store = transaction.objectStore(this.mapStoreName)
      const index = store.index('imageHash') // Use the new index
      const request = index.getAll(imageHash)

      request.onsuccess = async () => {
        let maps = request.result || []
        console.log(`MapStorage: Retrieved ${maps.length} maps for image hash ${imageHash}`)

        // Convert Base64 imageData back to Blobs for application compatibility
        if (this.imageProcessor) {
          maps = await Promise.all(maps.map(async (map) => {
            try {
              if (typeof map.imageData === 'string') {
                // Convert Base64 string to Blob
                map.imageData = ImageProcessor.base64ToBlob(map.imageData, map.fileType)
              }
              return map
            } catch (error) {
              console.error('MapStorage: Failed to convert map image Base64 to Blob in getMapsByImageHash:', error)
              return map // Return map with original data if conversion fails
            }
          }))
          console.log('MapStorage: Converted map image Base64 to Blobs in getMapsByImageHash')
        }

        resolve(maps)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get maps by image hash', request.error)
        reject(new Error(`Failed to load maps by image hash: ${request.error}`))
      }
    })
  }

  /**
   * Update an existing map
   * @param {string} id - Map ID
   * @param {Object} updates - Object with properties to update
   * @returns {Promise<Object>} - Updated map object
   */
  async updateMap (id, updates) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const update = async () => {
        try {
          const existingMap = await this.getMap(id)
          if (!existingMap) {
            reject(new Error(`Map not found: ${id}`))
            return
          }

          // Handle imageData conversion for Safari compatibility
          let imageDataToStore = updates.imageData
          if (imageDataToStore === undefined) {
            // If no imageData provided in updates, keep existing
            imageDataToStore = existingMap.imageData
          } else if (imageDataToStore && imageDataToStore instanceof Blob && this.imageProcessor) {
            // Convert Blob to Base64
            try {
              imageDataToStore = await this.imageProcessor.blobToBase64(imageDataToStore)
              console.log('MapStorage: Converted map image Blob to Base64 in updateMap')
            } catch (error) {
              console.error('MapStorage: Failed to convert map image Blob to Base64 in updateMap:', error)
              throw new Error(`Failed to convert map image to Base64: ${error.message}`)
            }
          }

          const updatedMap = {
            ...existingMap,
            ...updates,
            imageData: imageDataToStore,
            id,
            lastModified: new Date()
          }

          const transaction = this.db.transaction([this.mapStoreName], 'readwrite')
          const store = transaction.objectStore(this.mapStoreName)
          const request = store.put(updatedMap)

          request.onsuccess = () => {
            console.log('MapStorage: Map updated successfully', id)
            resolve(updatedMap)
          }

          request.onerror = () => {
            console.error('MapStorage: Failed to update map', request.error)
            reject(new Error(`Failed to update map: ${request.error}`))
          }
        } catch (error) {
          reject(error)
        }
      }
      update()
    })
  }

  /**
   * Delete a map from storage (and all associated markers, photos, and metadata)
   * @param {string} id - Map ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMap (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.mapStoreName, this.markerStoreName, this.photoStoreName, this.metadataDefinitionsStoreName, this.metadataValuesStoreName],
        'readwrite'
      )
      const mapStore = transaction.objectStore(this.mapStoreName)
      const metadataDefStore = transaction.objectStore(this.metadataDefinitionsStoreName)
      const metadataValStore = transaction.objectStore(this.metadataValuesStoreName)

      const deleteMarkersAndMap = async () => {
        try {
          // Delete associated markers and their photos (also deletes marker/photo metadata internally)
          const markers = await this.getMarkersForMap(id, transaction) // Pass transaction
          const markerDeletePromises = markers.map(marker => this._deleteMarkerInternal(marker.id, transaction))
          await Promise.all(markerDeletePromises)

          // Delete metadata values for the map itself
          const mapMetadataValues = await this.getMetadataValuesForEntity('map', id, transaction)
          const mapMetadataDeletePromises = mapMetadataValues.map(value => {
            return new Promise((resolve, reject) => {
              const req = metadataValStore.delete(value.id)
              req.onsuccess = () => resolve()
              req.onerror = (e) => reject(e)
            })
          })
          await Promise.all(mapMetadataDeletePromises)
          console.log(`MapStorage: Deleted ${mapMetadataValues.length} metadata values for map ${id}`)

          // Delete map-specific metadata definitions (scope === mapId)
          const mapSpecificDefinitions = await this.getMetadataDefinitionsByScope(id, transaction)
          const defDeletePromises = mapSpecificDefinitions.map(def => {
            return new Promise((resolve, reject) => {
              const req = metadataDefStore.delete(def.id)
              req.onsuccess = () => resolve()
              req.onerror = (e) => reject(e)
            })
          })
          await Promise.all(defDeletePromises)
          console.log(`MapStorage: Deleted ${mapSpecificDefinitions.length} map-specific metadata definitions for map ${id}`)

          // Delete the map itself
          const deleteMapRequest = mapStore.delete(id)
          deleteMapRequest.onsuccess = () => {
            console.log('MapStorage: Map deleted successfully', id)
          }
          deleteMapRequest.onerror = (event) => {
            console.error('MapStorage: Failed to delete map', event.target.error)
            reject(new Error(`Failed to delete map: ${event.target.error}`))
          }

          transaction.oncomplete = () => resolve(true)
          transaction.onerror = (event) => reject(new Error(`Transaction failed: ${event.target.error}`))
          transaction.onabort = (event) => reject(new Error(`Transaction aborted: ${event.target.error}`))
        } catch (error) {
          reject(error)
        }
      }
      deleteMarkersAndMap()
    })
  }

  /**
   * Internal helper to delete a marker and its associated photos and metadata within an existing transaction.
   * @param {string} markerId
   * @param {IDBTransaction} [transaction] - Optional existing transaction
   * @private
   */
  async _deleteMarkerInternal (markerId, transaction = null) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    let t
    if (transaction) {
      t = transaction
    } else {
      t = this.db.transaction([this.markerStoreName, this.photoStoreName, this.metadataValuesStoreName], 'readwrite')
    }

    const markerStore = t.objectStore(this.markerStoreName)
    const photoStore = t.objectStore(this.photoStoreName)
    const metadataValStore = t.objectStore(this.metadataValuesStoreName)

    // Delete associated photos and their metadata
    const photos = await this.getPhotosForMarker(markerId, t) // Pass transaction
    const photoDeletePromises = photos.map(async (photo) => {
      // Delete photo metadata first
      const photoMetadataValues = await this.getMetadataValuesForEntity('photo', photo.id, t)
      const photoMetaDeletePromises = photoMetadataValues.map(value => {
        return new Promise((resolve, reject) => {
          const req = metadataValStore.delete(value.id)
          req.onsuccess = () => resolve()
          req.onerror = (e) => reject(e)
        })
      })
      await Promise.all(photoMetaDeletePromises)

      // Delete the photo itself
      return new Promise((resolve, reject) => {
        const req = photoStore.delete(photo.id)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e)
      })
    })
    await Promise.all(photoDeletePromises)

    // Delete metadata values for the marker
    const markerMetadataValues = await this.getMetadataValuesForEntity('marker', markerId, t)
    const markerMetaDeletePromises = markerMetadataValues.map(value => {
      return new Promise((resolve, reject) => {
        const req = metadataValStore.delete(value.id)
        req.onsuccess = () => resolve()
        req.onerror = (e) => reject(e)
      })
    })
    await Promise.all(markerMetaDeletePromises)
    console.log(`MapStorage: Deleted ${markerMetadataValues.length} metadata values for marker ${markerId}`)

    // Delete the marker itself
    await new Promise((resolve, reject) => {
      const req = markerStore.delete(markerId)
      req.onsuccess = () => resolve()
      req.onerror = (e) => reject(e)
    })

    if (!transaction) { // Only complete if transaction was created here
      return new Promise((resolve, reject) => {
        t.oncomplete = () => resolve()
        t.onerror = (e) => reject(e)
        t.onabort = (e) => reject(e)
      })
    }
  }

  /**
   * Set a map as active (and deactivate all others)
   * @param {string} id - Map ID to set as active
   * @returns {Promise<Object>} - Updated active map object
   */
  async setActiveMap (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    try {
      const allMaps = await this.getAllMaps()
      const updatePromises = allMaps.map(map => {
        if (map.isActive && map.id !== id) {
          return this.updateMap(map.id, { isActive: false })
        }
        return Promise.resolve()
      })

      await Promise.all(updatePromises)

      const activeMap = await this.updateMap(id, { isActive: true })
      console.log('MapStorage: Active map set to', id)
      return activeMap
    } catch (error) {
      console.error('MapStorage: Failed to set active map', error)
      throw error
    }
  }

  /**
   * Get the currently active map
   * @returns {Promise<Object|null>} - Active map object or null
   */
  async getActiveMap () {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    try {
      const allMaps = await this.getAllMaps()
      const activeMap = allMaps.find(map => map.isActive === true)

      console.log('MapStorage: Active map retrieved', activeMap ? activeMap.id : 'none')
      return activeMap || null
    } catch (error) {
      console.error('MapStorage: Failed to get active map', error)
      throw new Error(`Failed to get active map: ${error.message}`)
    }
  }

  /**
   * Get maps sorted by creation date (newest first)
   * @returns {Promise<Array>} - Sorted array of map objects
   */
  async getMapsSortedByDate () {
    const maps = await this.getAllMaps()
    return maps.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
  }

  /**
   * Search maps by name (case-insensitive)
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Array of matching map objects
   */
  async searchMaps (searchTerm) {
    const maps = await this.getAllMaps()
    const term = searchTerm.toLowerCase()
    return maps.filter(map =>
      map.name.toLowerCase().includes(term) ||
      map.description.toLowerCase().includes(term)
    )
  }

  /**
   * Add a new marker to storage
   * @param {Object} markerData - Marker data object (x, y, mapId, etc.)
   * @returns {Promise<Object>} - The saved marker object
   */
  async addMarker (markerData) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    const marker = {
      id: this.generateId('marker'),
      mapId: markerData.mapId,
      x: markerData.x, // Map X coordinate (image pixel)
      y: markerData.y, // Map Y coordinate (image pixel)
      createdDate: new Date(),
      lastModified: new Date(),
      description: markerData.description || '',
      photoIds: [] // Array of photo IDs linked to this marker
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.markerStoreName], 'readwrite')
      const store = transaction.objectStore(this.markerStoreName)
      const request = store.add(marker)

      request.onsuccess = () => {
        console.log('MapStorage: Marker added successfully', marker.id)
        resolve(marker)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to add marker', request.error)
        reject(new Error(`Failed to save marker: ${request.error}`))
      }
    })
  }

  /**
   * Get all markers for a specific map, sorted by createdDate.
   * @param {string} mapId - The ID of the map
   * @param {IDBTransaction} [transaction] - Optional existing transaction
   * @returns {Promise<Array>} - Array of marker objects, sorted by createdDate ascending
   */
  async getMarkersForMap (mapId, transaction = null) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      let t = transaction
      if (!t) {
        t = this.db.transaction([this.markerStoreName], 'readonly')
      }
      const store = t.objectStore(this.markerStoreName)
      // Use the 'createdDate' index and open a cursor to iterate in order
      const index = store.index('createdDate')
      const markers = []

      // To filter by mapId AND sort by createdDate:
      // We can't directly use index.getAll(mapId) if we want to sort by createdDate index.
      // We need to iterate over the createdDate index and filter by mapId.
      const request = index.openCursor(null, 'next') // Iterate all by createdDate

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          if (cursor.value.mapId === mapId) {
            markers.push(cursor.value)
          }
          cursor.continue()
        } else {
          // Cursor finished, and markers are already in createdDate order
          console.log(`MapStorage: Retrieved ${markers.length} markers for map ${mapId}, sorted by creation date.`)
          resolve(markers)
        }
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get and sort markers for map', request.error)
        reject(new Error(`Failed to load and sort markers: ${request.error}`))
      }
    })
  }

  /**
   * Get a specific marker by ID
   * @param {string} markerId - The ID of the marker
   * @returns {Promise<Object|null>} - Marker object or null if not found
   */
  async getMarker (markerId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.markerStoreName], 'readonly')
      const store = transaction.objectStore(this.markerStoreName)
      const request = store.get(markerId)

      request.onsuccess = () => {
        const marker = request.result
        console.log('MapStorage: Retrieved marker', markerId, marker ? 'found' : 'not found')
        resolve(marker || null)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get marker', request.error)
        reject(new Error(`Failed to load marker: ${request.error}`))
      }
    })
  }

  /**
   * NEW: Get the number of photos associated with a specific marker diluted.
   * @param {string} markerId - The ID of the marker.
   * @param {IDBTransaction} [transaction] - Optional existing transaction.
   * @returns {Promise<number>} - The count of photos for the marker.
   */
  async getMarkerPhotoCount (markerId, transaction = null) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      let t = transaction
      if (!t) {
        t = this.db.transaction([this.photoStoreName], 'readonly')
      }
      const store = t.objectStore(this.photoStoreName)
      const index = store.index('markerId')
      // Use count() for efficiency, instead of getAll()
      const request = index.count(markerId)

      request.onsuccess = () => {
        resolve(request.result) // result is the count
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get photo count for marker', request.error)
        reject(new Error(`Failed to load photo count: ${request.error}`))
      }
    })
  }

  /**
   * Update an existing marker
   * @param {string} markerId - Marker ID
   * @param {Object} updates - Object with properties to update
   * @returns {Promise<Object>} - Updated marker object
   */
  async updateMarker (markerId, updates) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const update = async () => {
        try {
          const existingMarker = await this.getMarker(markerId)
          if (!existingMarker) {
            reject(new Error(`Marker not found: ${markerId}`))
            return
          }

          const updatedMarker = {
            ...existingMarker,
            ...updates,
            id: markerId,
            lastModified: new Date()
          }

          const transaction = this.db.transaction([this.markerStoreName], 'readwrite')
          const store = transaction.objectStore(this.markerStoreName)
          const request = store.put(updatedMarker)

          request.onsuccess = () => {
            console.log('MapStorage: Marker updated successfully', markerId)
            resolve(updatedMarker)
          }

          request.onerror = () => {
            console.error('MapStorage: Failed to update marker', request.error)
            reject(new Error(`Failed to update marker: ${request.error}`))
          }
        } catch (error) {
          reject(error)
        }
      }
      update()
    })
  }

  /**
   * Delete a marker (and its associated photos)
   * @param {string} markerId - The ID of the marker to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMarker (markerId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    return this._deleteMarkerInternal(markerId) // Use the internal helper
  }

  /**
   * Get all markers across all maps
   * @returns {Promise<Array>} - Array of all marker objects
   */
  async getAllMarkers () {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.markerStoreName], 'readonly')
      const store = transaction.objectStore(this.markerStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        const markers = request.result || []
        console.log(`MapStorage: Retrieved ${markers.length} total markers`)
        resolve(markers)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get all markers', request.error)
        reject(new Error(`Failed to load all markers: ${request.error}`))
      }
    })
  }

  /**
   * Add a new photo to storage
   * @param {Object} photoData - Photo data object (imageData, markerId, etc.)
   * @returns {Promise<Object>} - The saved photo object
   */
  async addPhoto (photoData) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    if (!(photoData.imageData instanceof Blob)) {
      throw new Error('PhotoStorage: imageData must be a Blob object.')
    }

    // Convert Blob to Base64 for Safari compatibility
    let imageDataBase64
    let thumbnailDataBase64 = null
    try {
      imageDataBase64 = await this.imageProcessor.blobToBase64(photoData.imageData)
      console.log('MapStorage: Converted photo image Blob to Base64 for Safari compatibility')

      // Also convert thumbnail if it's a Blob
      if (photoData.thumbnailData && photoData.thumbnailData instanceof Blob) {
        thumbnailDataBase64 = await this.imageProcessor.blobToBase64(photoData.thumbnailData)
        console.log('MapStorage: Converted photo thumbnail Blob to Base64 for Safari compatibility')
      } else {
        thumbnailDataBase64 = photoData.thumbnailData // Keep as-is if already Base64 or null
      }
    } catch (error) {
      console.error('MapStorage: Failed to convert photo Blob to Base64:', error)
      throw new Error(`Failed to convert photo to Base64: ${error.message}`)
    }

    const photo = {
      id: this.generateId('photo'),
      markerId: photoData.markerId,
      imageData: imageDataBase64, // Store Base64 string instead of Blob
      thumbnailData: thumbnailDataBase64, // Store Base64 string instead of Blob
      fileName: photoData.fileName || 'Untitled Photo',
      fileType: photoData.fileType || 'image/jpeg',
      fileSize: photoData.fileSize || 0,
      createdDate: new Date(),
      description: photoData.description || ''
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.photoStoreName], 'readwrite')
      const store = transaction.objectStore(this.photoStoreName)
      const request = store.add(photo)

      request.onsuccess = () => {
        console.log('MapStorage: Photo added successfully', photo.id)
        resolve(photo)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to add photo', request.error)
        reject(new Error(`Failed to save photo: ${request.error}`))
      }
    })
  }

  /**
   * Get all photos for a specific marker
   * @param {string} markerId - The ID of the marker
   * @param {IDBTransaction} [transaction] - Optional existing transaction
   * @returns {Promise<Array>} - Array of photo objects
   */
  async getPhotosForMarker (markerId, transaction = null) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      let t = transaction
      if (!t) {
        t = this.db.transaction([this.photoStoreName], 'readonly')
      }
      const store = t.objectStore(this.photoStoreName)
      const index = store.index('markerId')
      const request = index.getAll(markerId)

      request.onsuccess = async () => {
        let photos = request.result || []
        console.log(`MapStorage: Retrieved ${photos.length} photos for marker ${markerId}`)

        // Convert Base64 data back to Blobs for application compatibility
        if (this.imageProcessor) {
          photos = await Promise.all(photos.map(async (photo) => {
            try {
              if (typeof photo.imageData === 'string') {
                // Convert Base64 string to Blob
                photo.imageData = ImageProcessor.base64ToBlob(photo.imageData, photo.fileType)
              }

              if (typeof photo.thumbnailData === 'string') {
                // Convert Base64 string to Blob
                photo.thumbnailData = ImageProcessor.base64ToBlob(photo.thumbnailData, photo.fileType)
              }
              return photo
            } catch (error) {
              console.error('MapStorage: Failed to convert photo Base64 to Blob in getPhotosForMarker:', error)
              return photo // Return photo with original data if conversion fails
            }
          }))
          console.log('MapStorage: Converted photo Base64 data to Blobs in getPhotosForMarker')
        }

        resolve(photos)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get photos for marker', request.error)
        reject(new Error(`Failed to load photos: ${request.error}`))
      }
    })
  }

  /**
   * Get a specific photo by ID
   * @param {string} photoId - The ID of the photo
   * @returns {Promise<Object|null>} - Photo object (with imageData as Blob) or null if not found
   */
  async getPhoto (photoId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.photoStoreName], 'readonly')
      const store = transaction.objectStore(this.photoStoreName)
      const request = store.get(photoId)

      request.onsuccess = async () => {
        const photo = request.result
        if (photo && this.imageProcessor) {
          try {
            if (typeof photo.imageData === 'string') {
              // Convert Base64 string to Blob
              photo.imageData = ImageProcessor.base64ToBlob(photo.imageData, photo.fileType)
            }

            if (typeof photo.thumbnailData === 'string') {
              // Convert Base64 string to Blob
              photo.thumbnailData = ImageProcessor.base64ToBlob(photo.thumbnailData, photo.fileType)
            }
            console.log('MapStorage: Converted photo Base64 data to Blobs for application use')
          } catch (error) {
            console.error('MapStorage: Failed to convert photo Base64 to Blob:', error)
            // Continue with original data if conversion fails
          }
        }
        console.log('MapStorage: Retrieved photo', photoId, photo ? 'found' : 'not found')
        resolve(photo || null)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get photo', request.error)
        reject(new Error(`Failed to load photo: ${request.error}`))
      }
    })
  }

  /**
   * Delete a photo by ID and its metadata
   * @param {string} photoId - The ID of the photo to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deletePhoto (photoId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      // Need to also update the marker that references this photo
      // For now, simple delete. Later, we'll implement this more robustly
      // to remove photoId from marker.photoIds array.

      const transaction = this.db.transaction([this.photoStoreName, this.markerStoreName, this.metadataValuesStoreName], 'readwrite')
      const photoStore = transaction.objectStore(this.photoStoreName)
      const markerStore = transaction.objectStore(this.markerStoreName)
      const metadataValStore = transaction.objectStore(this.metadataValuesStoreName)

      const deletePhotoAndMetadata = async () => {
        try {
          // Delete metadata values for the photo
          const photoMetadataValues = await this.getMetadataValuesForEntity('photo', photoId, transaction)
          const metaDeletePromises = photoMetadataValues.map(value => {
            return new Promise((resolve, reject) => {
              const req = metadataValStore.delete(value.id)
              req.onsuccess = () => resolve()
              req.onerror = (e) => reject(e)
            })
          })
          await Promise.all(metaDeletePromises)
          console.log(`MapStorage: Deleted ${photoMetadataValues.length} metadata values for photo ${photoId}`)

          // Update marker reference
          photoStore.get(photoId).onsuccess = (event) => {
            const photoToDelete = event.target.result
            if (photoToDelete && photoToDelete.markerId) {
              markerStore.get(photoToDelete.markerId).onsuccess = (e) => {
                const marker = e.target.result
                if (marker) {
                  marker.photoIds = marker.photoIds.filter(id => id !== photoId)
                  markerStore.put(marker) // Update marker
                }
              }
            }
          }

          const request = photoStore.delete(photoId)

          request.onsuccess = () => {
            console.log('MapStorage: Photo deleted successfully', photoId)
          }

          request.onerror = () => {
            console.error('MapStorage: Failed to delete photo', request.error)
            reject(new Error(`Failed to delete photo: ${request.error}`))
          }

          transaction.oncomplete = () => resolve(true)
          transaction.onerror = (event) => reject(new Error(`Transaction failed: ${event.target.error}`))
        } catch (error) {
          reject(error)
        }
      }
      deletePhotoAndMetadata()
    })
  }

  /**
   * Get all photos across all maps and markers
   * @returns {Promise<Array>} - Array of all photo objects
   */
  async getAllPhotos () {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.photoStoreName], 'readonly')
      const store = transaction.objectStore(this.photoStoreName)
      const request = store.getAll()

      request.onsuccess = async () => {
        let photos = request.result || []
        console.log(`MapStorage: Retrieved ${photos.length} total photos`)

        // Convert Base64 data back to Blobs for application compatibility
        if (this.imageProcessor) {
          photos = await Promise.all(photos.map(async (photo) => {
            try {
              if (typeof photo.imageData === 'string') {
                // Convert Base64 string to Blob
                photo.imageData = ImageProcessor.base64ToBlob(photo.imageData, photo.fileType)
              }

              if (typeof photo.thumbnailData === 'string') {
                // Convert Base64 string to Blob
                photo.thumbnailData = ImageProcessor.base64ToBlob(photo.thumbnailData, photo.fileType)
              }
              return photo
            } catch (error) {
              console.error('MapStorage: Failed to convert photo Base64 to Blob in getAllPhotos:', error)
              return photo // Return photo with original data if conversion fails
            }
          }))
          console.log('MapStorage: Converted photo Base64 data to Blobs in getAllPhotos')
        }

        resolve(photos)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get all photos', request.error)
        reject(new Error(`Failed to load all photos: ${request.error}`))
      }
    })
  }

  /**
   * Get all photos across all maps and markers, each enriched with its associated marker and map context.\n   *\n   * @returns {Promise<Array<Object>>} - Array of enriched photo objects. Each object\n   *   represents a unique photo record and includes:\n   *   {\n   *     id: photo.id,                  // The unique ID of the photo record\n   *     markerId: photo.markerId,      // The ID of the marker this photo record is attached to\n   *     mapId: map.id,                 // The ID of the map the marker belongs to\n   *     mapName: map.name,             // The name of the map\n   *     markerDescription: marker.description, // Description of the associated marker\n   *     fileName: photo.fileName,\n   *     thumbnailData: photo.thumbnailData,\n   *     imageData: photo.imageData,    // The full image blob (use with caution due to size)\n   *     // ... other original photo properties\n   *   }\n   */
  async getAllPhotosWithContext () {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      ;(async () => {
        try {
          const transaction = this.db.transaction([this.photoStoreName, this.markerStoreName, this.mapStoreName], 'readonly')
          const photoStore = transaction.objectStore(this.photoStoreName)
          const markerStore = transaction.objectStore(this.markerStoreName)
          const mapStore = transaction.objectStore(this.mapStoreName)

          // Fetch all photos
          const allPhotos = await new Promise((resolve, reject) => {
            const req = photoStore.getAll()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = (e) => {
              console.error('MapStorage: Error fetching all photos:', e)
              reject(e)
            }
          })

          const enrichedPhotos = []
          for (const photo of allPhotos) {
            // Convert Base64 data back to Blobs for application compatibility
            const processedPhoto = { ...photo }
            if (this.imageProcessor) {
              try {
                if (typeof processedPhoto.imageData === 'string') {
                  // Convert Base64 string to Blob
                  processedPhoto.imageData = ImageProcessor.base64ToBlob(processedPhoto.imageData, processedPhoto.fileType)
                }
                if (typeof processedPhoto.thumbnailData === 'string') {
                  // Convert Base64 string to Blob
                  processedPhoto.thumbnailData = ImageProcessor.base64ToBlob(processedPhoto.thumbnailData, processedPhoto.fileType)
                }
                console.log('MapStorage: Converted photo Base64 data to Blobs in getAllPhotosWithContext')
              } catch (error) {
                console.error('MapStorage: Failed to convert photo Base64 to Blob in getAllPhotosWithContext:', error)
                // Continue with original data if conversion fails
              }
            }

            // Each photo record has a single markerId
            if (!processedPhoto.markerId) {
              console.warn(`MapStorage: Photo record ${processedPhoto.id} does not have a markerId. Skipping enrichment.`)
              continue
            }

            // Fetch the marker for this photo
            const marker = await new Promise((resolve, reject) => {
              const req = markerStore.get(processedPhoto.markerId)
              req.onsuccess = () => resolve(req.result)
              req.onerror = (e) => {
                console.error(`MapStorage: Error fetching marker ${processedPhoto.markerId} for photo ${processedPhoto.id}:`, e)
                reject(e)
              }
            })

            if (!marker) {
              console.warn(`MapStorage: Marker ${processedPhoto.markerId} not found for photo record ${processedPhoto.id}. Skipping enrichment.`)
              continue
            }
            if (!marker.mapId) {
              console.warn(`MapStorage: Marker ${marker.id} does not have a mapId. Skipping enrichment for photo record ${processedPhoto.id}.`)
              continue
            }

            // Fetch the map for this marker
            const map = await new Promise((resolve, reject) => {
              const req = mapStore.get(marker.mapId)
              req.onsuccess = () => resolve(req.result)
              req.onerror = (e) => {
                console.error(`MapStorage: Error fetching map ${marker.mapId} for marker ${marker.id}:`, e)
                reject(e)
              }
            })

            if (!map) {
              console.warn(`MapStorage: Map ${marker.mapId} not found for marker ${marker.id} and photo record ${processedPhoto.id}. Skipping enrichment.`)
              continue
            }

            enrichedPhotos.push({
              // Spread all original photo properties
              ...processedPhoto,
              // Add context properties for easy access
              mapId: map.id,
              mapName: map.name,
              markerDescription: marker.description || 'No marker description'
              // Note: photo.markerId is already part of the original photo object
            })
          }

          console.log(`MapStorage: Retrieved ${enrichedPhotos.length} enriched photo entries with context.`)
          resolve(enrichedPhotos)
        } catch (error) {
          console.error('MapStorage: Failed to get all photos with context', error)
          reject(new Error(`Failed to load enriched photo entries: ${error.message}`))
        }
      })()
    })
  }

  /**
   * Get all photos for a specific map across all its markers.
   * @param {string} mapId - The ID of the map.
   * @returns {Promise<Array>} - Array of photo objects for the given map.
   */
  async getPhotosForMap (mapId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      ;(async () => {
        try {
          const transaction = this.db.transaction([this.markerStoreName, this.photoStoreName], 'readonly')
          const markerStore = transaction.objectStore(this.markerStoreName)
          const photoStore = transaction.objectStore(this.photoStoreName)

          // 1. Get all markers for the given mapId
          const markers = await new Promise((resolve, reject) => {
            const markersRequest = markerStore.index('mapId').getAll(mapId)

            markersRequest.onsuccess = () => resolve(markersRequest.result || [])
            markersRequest.onerror = (e) => reject(e)
          })
          const allPhotoIds = new Set()
          markers.forEach(marker => {
            if (marker.photoIds) {
              marker.photoIds.forEach(photoId => allPhotoIds.add(photoId))
            }
          })

          // 2. Fetch all unique photo objects based on collected photoIds

          const photoPromises = Array.from(allPhotoIds).map(photoId => {
            return new Promise((resolve, reject) => {
              const photoRequest = photoStore.get(photoId)

              photoRequest.onsuccess = () => resolve(photoRequest.result)
              photoRequest.onerror = (e) => reject(e)
            })
          })

          const photos = (await Promise.all(photoPromises)).filter(photo => photo != null)

          // Convert Base64 data back to Blobs for application compatibility
          let processedPhotos = photos
          if (this.imageProcessor) {
            processedPhotos = await Promise.all(photos.map(async (photo) => {
              if (!photo) return null
              try {
                const processedPhoto = { ...photo }
                if (typeof processedPhoto.imageData === 'string') {
                  // Convert Base64 string to Blob
                  processedPhoto.imageData = ImageProcessor.base64ToBlob(processedPhoto.imageData, processedPhoto.fileType)
                }
                if (typeof processedPhoto.thumbnailData === 'string') {
                  // Convert Base64 string to Blob
                  processedPhoto.thumbnailData = ImageProcessor.base64ToBlob(processedPhoto.thumbnailData, processedPhoto.fileType)
                }
                return processedPhoto
              } catch (error) {
                console.error('MapStorage: Failed to convert photo Base64 to Blob in getPhotosForMap:', error)
                return photo // Return photo with original data if conversion fails
              }
            }))
            console.log('MapStorage: Converted photo Base64 data to Blobs in getPhotosForMap')
          }

          console.log(`MapStorage: Retrieved ${processedPhotos.length} photos for map ${mapId}`)
          resolve(processedPhotos)
        } catch (error) {
          console.error('MapStorage: Failed to get photos for map', error)
          reject(new Error(`Failed to load photos for map: ${error.message}`))
        }
      })()
    })
  }

  // ========================================
  // Metadata Definition CRUD Methods
  // ========================================

  /**
   * Add a new metadata definition
   * @param {Object} definition - Metadata definition object
   * @returns {Promise<Object>} - The saved metadata definition
   */
  async addMetadataDefinition (definition) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    // Validation
    if (!definition.name || typeof definition.name !== 'string' || definition.name.trim() === '') {
      throw new Error('Metadata definition name is required and must be a non-empty string')
    }
    if (definition.name.length > 100) {
      throw new Error('Metadata definition name must be 100 characters or less')
    }

    const validFieldTypes = ['text', 'number', 'date', 'boolean', 'select']
    if (!definition.fieldType || !validFieldTypes.includes(definition.fieldType)) {
      throw new Error(`Invalid fieldType. Must be one of: ${validFieldTypes.join(', ')}`)
    }

    if (!definition.scope || typeof definition.scope !== 'string') {
      throw new Error('Metadata definition scope is required (either "global" or a mapId)')
    }

    if (!Array.isArray(definition.appliesTo) || definition.appliesTo.length === 0) {
      throw new Error('Metadata definition appliesTo must be a non-empty array')
    }

    const validAppliesTo = ['map', 'marker', 'photo']
    for (const entity of definition.appliesTo) {
      if (!validAppliesTo.includes(entity)) {
        throw new Error(`Invalid appliesTo value: ${entity}. Must be one of: ${validAppliesTo.join(', ')}`)
      }
    }

    if (definition.fieldType === 'select') {
      if (!Array.isArray(definition.options) || definition.options.length === 0) {
        throw new Error('Metadata definition with fieldType "select" must have a non-empty options array')
      }
    }

    if (definition.description && definition.description.length > 500) {
      throw new Error('Metadata definition description must be 500 characters or less')
    }

    const metadataDefinition = {
      id: definition.id || crypto.randomUUID(),
      name: definition.name.trim(),
      fieldType: definition.fieldType,
      scope: definition.scope,
      appliesTo: definition.appliesTo,
      required: definition.required || false,
      options: definition.options || [],
      defaultValue: definition.defaultValue || null,
      description: definition.description || '',
      order: definition.order || 0,
      createdDate: definition.createdDate || new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataDefinitionsStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataDefinitionsStoreName)
      const request = store.add(metadataDefinition)

      request.onsuccess = () => {
        console.log('MapStorage: Metadata definition added successfully', metadataDefinition.id)
        resolve(metadataDefinition)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to add metadata definition', request.error)
        reject(new Error(`Failed to save metadata definition: ${request.error}`))
      }
    })
  }

  /**
   * Get a specific metadata definition by ID
   * @param {string} id - Metadata definition ID
   * @returns {Promise<Object|null>} - Metadata definition or null if not found
   */
  async getMetadataDefinition (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataDefinitionsStoreName], 'readonly')
      const store = transaction.objectStore(this.metadataDefinitionsStoreName)
      const request = store.get(id)

      request.onsuccess = () => {
        const definition = request.result
        console.log('MapStorage: Retrieved metadata definition', id, definition ? 'found' : 'not found')
        resolve(definition || null)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get metadata definition', request.error)
        reject(new Error(`Failed to load metadata definition: ${request.error}`))
      }
    })
  }

  /**
   * Get all metadata definitions
   * @returns {Promise<Array>} - Array of all metadata definitions
   */
  async getAllMetadataDefinitions () {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataDefinitionsStoreName], 'readonly')
      const store = transaction.objectStore(this.metadataDefinitionsStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        const definitions = request.result || []
        console.log(`MapStorage: Retrieved ${definitions.length} metadata definitions`)
        resolve(definitions)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get all metadata definitions', request.error)
        reject(new Error(`Failed to load metadata definitions: ${request.error}`))
      }
    })
  }

  /**
   * Get metadata definitions by scope (global or specific mapId)
   * @param {string} scope - 'global' or a mapId
   * @param {IDBTransaction} [transaction] - Optional existing transaction
   * @returns {Promise<Array>} - Array of metadata definitions matching the scope
   */
  async getMetadataDefinitionsByScope (scope, transaction = null) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      let t = transaction
      if (!t) {
        t = this.db.transaction([this.metadataDefinitionsStoreName], 'readonly')
      }
      const store = t.objectStore(this.metadataDefinitionsStoreName)
      const index = store.index('scope')
      const request = index.getAll(scope)

      request.onsuccess = () => {
        const definitions = request.result || []
        console.log(`MapStorage: Retrieved ${definitions.length} metadata definitions for scope ${scope}`)
        resolve(definitions)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get metadata definitions by scope', request.error)
        reject(new Error(`Failed to load metadata definitions by scope: ${request.error}`))
      }
    })
  }

  /**
   * Get metadata definitions applicable to a specific entity type and scope
   * Returns both global and map-specific definitions if scope is a mapId
   * @param {string} entityType - 'map', 'marker', or 'photo'
   * @param {string} scope - 'global' or a mapId
   * @returns {Promise<Array>} - Array of applicable metadata definitions
   */
  async getMetadataDefinitionsForEntity (entityType, scope) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    const validEntityTypes = ['map', 'marker', 'photo']
    if (!validEntityTypes.includes(entityType)) {
      throw new Error(`Invalid entityType: ${entityType}. Must be one of: ${validEntityTypes.join(', ')}`)
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataDefinitionsStoreName], 'readonly')
      const store = transaction.objectStore(this.metadataDefinitionsStoreName)
      const index = store.index('appliesTo')
      const request = index.getAll(entityType)

      request.onsuccess = () => {
        let definitions = request.result || []

        // Filter by scope: include global and map-specific (if scope is a mapId)
        if (scope === 'global') {
          definitions = definitions.filter(def => def.scope === 'global')
        } else {
          // Include both global and map-specific definitions
          definitions = definitions.filter(def => def.scope === 'global' || def.scope === scope)
        }

        console.log(`MapStorage: Retrieved ${definitions.length} metadata definitions for ${entityType} with scope ${scope}`)
        resolve(definitions)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get metadata definitions for entity', request.error)
        reject(new Error(`Failed to load metadata definitions for entity: ${request.error}`))
      }
    })
  }

  /**
   * Update an existing metadata definition
   * @param {Object} definition - Updated metadata definition object (must include id)
   * @returns {Promise<Object>} - Updated metadata definition
   */
  async updateMetadataDefinition (definition) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    if (!definition.id) {
      throw new Error('Metadata definition ID is required for update')
    }

    // Get existing definition to ensure it exists
    const existing = await this.getMetadataDefinition(definition.id)
    if (!existing) {
      throw new Error(`Metadata definition not found: ${definition.id}`)
    }

    // Perform same validations as add
    if (!definition.name || typeof definition.name !== 'string' || definition.name.trim() === '') {
      throw new Error('Metadata definition name is required and must be a non-empty string')
    }
    if (definition.name.length > 100) {
      throw new Error('Metadata definition name must be 100 characters or less')
    }

    const validFieldTypes = ['text', 'number', 'date', 'boolean', 'select']
    if (!definition.fieldType || !validFieldTypes.includes(definition.fieldType)) {
      throw new Error(`Invalid fieldType. Must be one of: ${validFieldTypes.join(', ')}`)
    }

    if (!definition.scope || typeof definition.scope !== 'string') {
      throw new Error('Metadata definition scope is required (either "global" or a mapId)')
    }

    if (!Array.isArray(definition.appliesTo) || definition.appliesTo.length === 0) {
      throw new Error('Metadata definition appliesTo must be a non-empty array')
    }

    const validAppliesTo = ['map', 'marker', 'photo']
    for (const entity of definition.appliesTo) {
      if (!validAppliesTo.includes(entity)) {
        throw new Error(`Invalid appliesTo value: ${entity}. Must be one of: ${validAppliesTo.join(', ')}`)
      }
    }

    if (definition.fieldType === 'select') {
      if (!Array.isArray(definition.options) || definition.options.length === 0) {
        throw new Error('Metadata definition with fieldType "select" must have a non-empty options array')
      }
    }

    if (definition.description && definition.description.length > 500) {
      throw new Error('Metadata definition description must be 500 characters or less')
    }

    const updatedDefinition = {
      ...existing,
      ...definition,
      lastModified: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataDefinitionsStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataDefinitionsStoreName)
      const request = store.put(updatedDefinition)

      request.onsuccess = () => {
        console.log('MapStorage: Metadata definition updated successfully', updatedDefinition.id)
        resolve(updatedDefinition)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to update metadata definition', request.error)
        reject(new Error(`Failed to update metadata definition: ${request.error}`))
      }
    })
  }

  /**
   * Delete a metadata definition and all associated values
   * @param {string} id - Metadata definition ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMetadataDefinition (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    // First, get all values that need to be deleted (before creating delete transaction)
    const values = await this.getMetadataValuesByDefinition(id)
    console.log(`MapStorage: Found ${values.length} metadata values to delete for definition ${id}`)

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataDefinitionsStoreName, this.metadataValuesStoreName], 'readwrite')
      const defStore = transaction.objectStore(this.metadataDefinitionsStoreName)
      const valStore = transaction.objectStore(this.metadataValuesStoreName)

      // Delete all associated values
      values.forEach(value => {
        valStore.delete(value.id)
      })

      // Delete the definition itself
      defStore.delete(id)

      transaction.oncomplete = () => {
        console.log(`MapStorage: Deleted metadata definition and ${values.length} associated values`)
        resolve(true)
      }

      transaction.onerror = (event) => {
        console.error('MapStorage: Failed to delete metadata definition', event.target.error)
        reject(new Error(`Failed to delete metadata definition: ${event.target.error}`))
      }

      transaction.onabort = (event) => {
        console.error('MapStorage: Transaction aborted while deleting metadata definition', event.target.error)
        reject(new Error(`Transaction aborted: ${event.target.error}`))
      }
    })
  }

  // ========================================
  // Metadata Value CRUD Methods
  // ========================================

  /**
   * Validate a metadata value against its definition
   * @param {Object} value - Metadata value object
   * @param {Object} definition - Metadata definition object
   * @returns {Object} - { valid: boolean, error: string|null }
   * @private
   */
  _validateMetadataValue (value, definition) {
    if (!definition) {
      return { valid: false, error: 'Metadata definition not found' }
    }

    // Check if value is provided for required fields
    if (definition.required && (value.value === null || value.value === undefined || value.value === '')) {
      return { valid: false, error: `Field "${definition.name}" is required` }
    }

    // Skip further validation if value is empty and not required
    if (!definition.required && (value.value === null || value.value === undefined || value.value === '')) {
      return { valid: true, error: null }
    }

    // Type-specific validation
    switch (definition.fieldType) {
      case 'text':
        if (typeof value.value !== 'string') {
          return { valid: false, error: `Field "${definition.name}" must be a string` }
        }
        break

      case 'number':
        if (typeof value.value !== 'number' || isNaN(value.value)) {
          return { valid: false, error: `Field "${definition.name}" must be a valid number` }
        }
        break

      case 'date':
        if (typeof value.value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.value)) {
          return { valid: false, error: `Field "${definition.name}" must be a valid date in YYYY-MM-DD format` }
        }
        break

      case 'boolean':
        if (typeof value.value !== 'boolean') {
          return { valid: false, error: `Field "${definition.name}" must be a boolean` }
        }
        break

      case 'select':
        if (typeof value.value !== 'string') {
          return { valid: false, error: `Field "${definition.name}" must be a string` }
        }
        if (!definition.options || !definition.options.includes(value.value)) {
          return { valid: false, error: `Field "${definition.name}" value must be one of: ${definition.options.join(', ')}` }
        }
        break

      default:
        return { valid: false, error: `Unknown field type: ${definition.fieldType}` }
    }

    return { valid: true, error: null }
  }

  /**
   * Add a new metadata value
   * @param {Object} value - Metadata value object
   * @returns {Promise<Object>} - The saved metadata value
   */
  async addMetadataValue (value) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    // Validation
    if (!value.definitionId) {
      throw new Error('Metadata value must have a definitionId')
    }

    // Verify definition exists and get it for validation
    const definition = await this.getMetadataDefinition(value.definitionId)
    if (!definition) {
      throw new Error(`Metadata definition not found: ${value.definitionId}`)
    }

    const validEntityTypes = ['map', 'marker', 'photo']
    if (!value.entityType || !validEntityTypes.includes(value.entityType)) {
      throw new Error(`Invalid entityType: ${value.entityType}. Must be one of: ${validEntityTypes.join(', ')}`)
    }

    if (!value.entityId) {
      throw new Error('Metadata value must have an entityId')
    }

    // Validate value against definition
    const validation = this._validateMetadataValue(value, definition)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const metadataValue = {
      id: value.id || crypto.randomUUID(),
      definitionId: value.definitionId,
      entityType: value.entityType,
      entityId: value.entityId,
      value: value.value,
      createdDate: value.createdDate || new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataValuesStoreName)
      const request = store.add(metadataValue)

      request.onsuccess = () => {
        console.log('MapStorage: Metadata value added successfully', metadataValue.id)
        resolve(metadataValue)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to add metadata value', request.error)
        reject(new Error(`Failed to save metadata value: ${request.error}`))
      }
    })
  }

  /**
   * Get a specific metadata value by ID
   * @param {string} id - Metadata value ID
   * @returns {Promise<Object|null>} - Metadata value or null if not found
   */
  async getMetadataValue (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readonly')
      const store = transaction.objectStore(this.metadataValuesStoreName)
      const request = store.get(id)

      request.onsuccess = () => {
        const value = request.result
        console.log('MapStorage: Retrieved metadata value', id, value ? 'found' : 'not found')
        resolve(value || null)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get metadata value', request.error)
        reject(new Error(`Failed to load metadata value: ${request.error}`))
      }
    })
  }

  /**
   * Get all metadata values for a specific entity
   * @param {string} entityType - 'map', 'marker', or 'photo'
   * @param {string} entityId - The ID of the entity
   * @param {IDBTransaction} [transaction] - Optional existing transaction
   * @returns {Promise<Array>} - Array of metadata values for the entity
   */
  async getMetadataValuesForEntity (entityType, entityId, transaction = null) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      let t = transaction
      if (!t) {
        t = this.db.transaction([this.metadataValuesStoreName], 'readonly')
      }
      const store = t.objectStore(this.metadataValuesStoreName)
      const index = store.index('entityTypeAndId')
      const request = index.getAll([entityType, entityId])

      request.onsuccess = () => {
        const values = request.result || []
        console.log(`MapStorage: Retrieved ${values.length} metadata values for ${entityType} ${entityId}`)
        resolve(values)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get metadata values for entity', request.error)
        reject(new Error(`Failed to load metadata values for entity: ${request.error}`))
      }
    })
  }

  /**
   * Get all metadata values for a specific definition
   * @param {string} definitionId - The ID of the metadata definition
   * @returns {Promise<Array>} - Array of metadata values using this definition
   */
  async getMetadataValuesByDefinition (definitionId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readonly')
      const store = transaction.objectStore(this.metadataValuesStoreName)
      const index = store.index('definitionId')
      const request = index.getAll(definitionId)

      request.onsuccess = () => {
        const values = request.result || []
        console.log(`MapStorage: Retrieved ${values.length} metadata values for definition ${definitionId}`)
        resolve(values)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to get metadata values by definition', request.error)
        reject(new Error(`Failed to load metadata values by definition: ${request.error}`))
      }
    })
  }

  /**
   * Update an existing metadata value
   * @param {Object} value - Updated metadata value object (must include id)
   * @returns {Promise<Object>} - Updated metadata value
   */
  async updateMetadataValue (value) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    if (!value.id) {
      throw new Error('Metadata value ID is required for update')
    }

    // Get existing value to ensure it exists
    const existing = await this.getMetadataValue(value.id)
    if (!existing) {
      throw new Error(`Metadata value not found: ${value.id}`)
    }

    // Get definition for validation
    const definition = await this.getMetadataDefinition(value.definitionId || existing.definitionId)
    if (!definition) {
      throw new Error(`Metadata definition not found: ${value.definitionId || existing.definitionId}`)
    }

    // Validate value against definition
    const validation = this._validateMetadataValue({ ...existing, ...value }, definition)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const updatedValue = {
      ...existing,
      ...value,
      lastModified: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataValuesStoreName)
      const request = store.put(updatedValue)

      request.onsuccess = () => {
        console.log('MapStorage: Metadata value updated successfully', updatedValue.id)
        resolve(updatedValue)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to update metadata value', request.error)
        reject(new Error(`Failed to update metadata value: ${request.error}`))
      }
    })
  }

  /**
   * Delete a single metadata value
   * @param {string} id - Metadata value ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMetadataValue (id) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataValuesStoreName)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('MapStorage: Metadata value deleted successfully', id)
        resolve(true)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to delete metadata value', request.error)
        reject(new Error(`Failed to delete metadata value: ${request.error}`))
      }
    })
  }

  /**
   * Delete all metadata values for a specific entity
   * @param {string} entityType - 'map', 'marker', or 'photo'
   * @param {string} entityId - The ID of the entity
   * @returns {Promise<number>} - Number of values deleted
   */
  async deleteMetadataValuesForEntity (entityType, entityId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    const values = await this.getMetadataValuesForEntity(entityType, entityId)

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataValuesStoreName)

      const deletePromises = values.map(value => {
        return new Promise((resolve, reject) => {
          const req = store.delete(value.id)
          req.onsuccess = () => resolve()
          req.onerror = (e) => reject(e)
        })
      })

      Promise.all(deletePromises)
        .then(() => {
          console.log(`MapStorage: Deleted ${values.length} metadata values for ${entityType} ${entityId}`)
          resolve(values.length)
        })
        .catch(error => {
          console.error('MapStorage: Failed to delete metadata values for entity', error)
          reject(new Error(`Failed to delete metadata values for entity: ${error}`))
        })

      transaction.onerror = (event) => {
        console.error('MapStorage: Transaction failed while deleting metadata values for entity', event.target.error)
        reject(new Error(`Transaction failed: ${event.target.error}`))
      }
    })
  }

  /**
   * Delete all metadata values for a specific definition
   * (Called when a definition is deleted)
   * @param {string} definitionId - The ID of the metadata definition
   * @returns {Promise<number>} - Number of values deleted
   */
  async deleteMetadataValuesByDefinition (definitionId) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    const values = await this.getMetadataValuesByDefinition(definitionId)

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.metadataValuesStoreName], 'readwrite')
      const store = transaction.objectStore(this.metadataValuesStoreName)

      const deletePromises = values.map(value => {
        return new Promise((resolve, reject) => {
          const req = store.delete(value.id)
          req.onsuccess = () => resolve()
          req.onerror = (e) => reject(e)
        })
      })

      Promise.all(deletePromises)
        .then(() => {
          console.log(`MapStorage: Deleted ${values.length} metadata values for definition ${definitionId}`)
          resolve(values.length)
        })
        .catch(error => {
          console.error('MapStorage: Failed to delete metadata values by definition', error)
          reject(new Error(`Failed to delete metadata values by definition: ${error}`))
        })

      transaction.onerror = (event) => {
        console.error('MapStorage: Transaction failed while deleting metadata values by definition', event.target.error)
        reject(new Error(`Transaction failed: ${event.target.error}`))
      }
    })
  }

  // ========================================
  // Remaining Utility Methods
  // ========================================

  /**
   * Get storage statistics
   * @returns {Promise<Object>} - Storage usage statistics
   */
  async getStorageStats () {
    try {
      const maps = await this.getAllMaps() // Changed to this.mapStoreName
      const totalMaps = maps.length
      const totalFileSize = maps.reduce((sum, map) => sum + (map.fileSize || 0), 0)
      const activeMap = maps.find(map => map.isActive)

      const markers = await this.getAllMarkers() // Uses new marker functions
      const photos = await this.getAllPhotos() // Uses new photo functions
      const totalMarkers = markers.length
      const totalPhotos = photos.length
      // Be careful about photo.imageData being very large, ensure file size is stored
      const totalPhotoSize = photos.reduce((sum, photo) => sum + (photo.fileSize || 0), 0)

      return {
        totalMaps,
        totalFileSize,
        averageFileSize: totalMaps > 0 ? Math.round(totalFileSize / totalMaps) : 0,
        activeMapId: activeMap ? activeMap.id : null,
        oldestMap: totalMaps > 0
          ? maps.reduce((oldest, map) =>
            new Date(map.createdDate) < new Date(oldest.createdDate) ? map : oldest
          )
          : null,
        newestMap: totalMaps > 0
          ? maps.reduce((newest, map) =>
            new Date(map.createdDate) > new Date(newest.createdDate) ? map : newest
          )
          : null,
        totalMarkers,
        totalPhotos,
        totalPhotoSize
      }
    } catch (error) {
      console.error('MapStorage: Failed to get storage stats', error)
      return {
        totalMaps: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        activeMapId: null,
        oldestMap: null,
        newestMap: null,
        totalMarkers: 0,
        totalPhotos: 0,
        totalPhotoSize: 0
      }
    }
  }

  /**
   * Clear all maps from storage (with confirmation) - NOW CLEARS ALL OBJECT STORES
   * @returns {Promise<boolean>} - Success status
   */
  async clearAllMaps () {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }

    return new Promise((resolve, reject) => {
      // Clear all three object stores
      const transaction = this.db.transaction([this.mapStoreName, this.markerStoreName, this.photoStoreName], 'readwrite')
      const mapStore = transaction.objectStore(this.mapStoreName)
      const markerStore = transaction.objectStore(this.markerStoreName)
      const photoStore = transaction.objectStore(this.photoStoreName)

      const reqMapClear = mapStore.clear()
      const reqMarkerClear = markerStore.clear()
      const reqPhotoClear = photoStore.clear()

      let clearedCount = 0
      const totalStores = 3

      const checkCompletion = () => {
        clearedCount++
        if (clearedCount === totalStores) {
          console.log('MapStorage: All object stores cleared successfully')
          resolve(true)
        }
      }

      reqMapClear.onsuccess = checkCompletion
      reqMarkerClear.onsuccess = checkCompletion
      reqPhotoClear.onsuccess = checkCompletion

      reqMapClear.onerror = (e) => reject(new Error(`Failed to clear maps: ${e.target.error}`))
      reqMarkerClear.onerror = (e) => reject(new Error(`Failed to clear markers: ${e.target.error}`))
      reqPhotoClear.onerror = (e) => reject(new Error(`Failed to clear photos: ${e.target.error}`))

      transaction.onerror = (event) => {
        console.error('MapStorage: Transaction failed to clear all stores', event.target.error)
        reject(new Error(`Failed to clear all stores: ${event.target.error}`))
      }
    })
  }

  /**
   * Saves or updates a map in storage. Respects the ID provided in mapData.
   * If mapData does not contain an 'id', it will be treated as a new map and
   * the ID will be generated (by delegating to addMap).
   * @param {Object} mapData - The map object to save, must contain 'id' for updates.
   * @param {string} mapData.imageHash - The SHA256 hash of the map image content.
   * @param {Blob} mapData.imageData - The actual image Blob for the map.
   * @returns {Promise<Object>} - The saved/updated map object.
   */
  async saveMap (mapData) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    // If no ID is provided in mapData, delegate to addMap which generates a new ID.
    if (!mapData.id) {
      console.warn('MapStorage: mapData provided without ID to saveMap, delegating to addMap.')
      return this.addMap(mapData)
    }

    // Ensure imageData is a Blob if provided (or null/undefined)
    if (mapData.imageData !== null && mapData.imageData !== undefined && !(mapData.imageData instanceof Blob)) {
      throw new Error('MapStorage: imageData must be a Blob object if provided (or null/undefined).')
    }

    // Get existing map synchronously first
    const existingMap = await new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.mapStoreName], 'readonly')
      const store = transaction.objectStore(this.mapStoreName)
      const getRequest = store.get(mapData.id)
      getRequest.onsuccess = (event) => {
        resolve(event.target.result)
      }
      getRequest.onerror = (error) => {
        console.error('MapStorage: Failed to retrieve existing map during saveMap', error)
        reject(new Error(`Failed to retrieve existing map for saving: ${error.message}`))
      }
    })

    // Prepare imageData for storage (convert Blob to Base64 if needed)
    let imageDataToStore = mapData.imageData || (existingMap ? existingMap.imageData : null)
    if (imageDataToStore && imageDataToStore instanceof Blob && this.imageProcessor) {
      try {
        imageDataToStore = await this.imageProcessor.blobToBase64(imageDataToStore)
        console.log('MapStorage: Converted map image Blob to Base64 for Safari compatibility')
      } catch (error) {
        console.error('MapStorage: Failed to convert map image Blob to Base64:', error)
        throw new Error(`Failed to convert map image to Base64: ${error.message}`)
      }
    }

    // Now start the transaction and put the map
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.mapStoreName], 'readwrite')
      const store = transaction.objectStore(this.mapStoreName)
      const mapToSave = {
        id: mapData.id,
        name: mapData.name || (existingMap ? existingMap.name : 'Untitled Map'),
        description: mapData.description || (existingMap ? existingMap.description : ''),
        fileName: mapData.fileName || (existingMap ? existingMap.fileName : ''),
        filePath: mapData.filePath || (existingMap ? existingMap.filePath : ''),
        width: mapData.width || (existingMap ? existingMap.width : 0),
        height: mapData.height || (existingMap ? existingMap.height : 0),
        fileSize: mapData.fileSize || (existingMap ? existingMap.fileSize : 0),
        fileType: mapData.fileType || (existingMap ? existingMap.fileType : ''),
        createdDate: mapData.createdDate ? new Date(mapData.createdDate) : (existingMap ? existingMap.createdDate : new Date()),
        lastModified: new Date(),
        isActive: mapData.isActive !== undefined ? mapData.isActive : (existingMap ? existingMap.isActive : false),
        imageHash: mapData.imageHash || (existingMap ? existingMap.imageHash : null),
        imageData: imageDataToStore, // Store Base64 string instead of Blob
        settings: {
          defaultZoom: 1,
          allowMarkers: true,
          ...(existingMap ? existingMap.settings : {}), // Merge existing settings
          ...mapData.settings
        }
      }
      const request = store.put(mapToSave)
      request.onsuccess = () => {
        console.log('MapStorage: Map saved/updated successfully', mapToSave.id)
        transaction.commit?.() // Commit if available
        resolve(mapToSave)
      }
      request.onerror = () => {
        console.error('MapStorage: Failed to save/update map', request.error)
        transaction.abort?.() // Abort if available
        reject(new Error(`Failed to save map: ${request.error}`))
      }
    })
  }

  /**
   * Saves or updates a marker in storage. Respects the ID provided in markerData.
   * If markerData does not contain an 'id', it will be treated as a new marker and
   * the ID will be generated (by delegating to addMarker).\n   * @param {Object} markerData - The marker object to save, must contain 'id' for updates.\n   * @returns {Promise<Object>} - The saved/updated marker object.\n   */
  async saveMarker (markerData) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    // If no ID is provided in markerData, delegate to addMarker.
    if (!markerData.id) {
      console.warn('MapStorage: markerData provided without ID to saveMarker, delegating to addMarker.')
      return this.addMarker(markerData)
    }
    const markerToSave = {
      id: markerData.id, // Use the provided ID
      mapId: markerData.mapId,
      x: markerData.x,
      y: markerData.y,
      createdDate: markerData.createdDate ? new Date(markerData.createdDate) : new Date(),
      lastModified: new Date(), // Always update lastModified on save
      description: markerData.description || '',
      photoIds: markerData.photoIds || [] // Ensure it's an array
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.markerStoreName], 'readwrite')
      const store = transaction.objectStore(this.markerStoreName)
      const request = store.put(markerToSave) // Use put()

      request.onsuccess = () => {
        console.log('MapStorage: Marker saved/updated successfully', markerToSave.id)
        resolve(markerToSave)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to save/update marker', request.error)
        reject(new Error(`Failed to save marker: ${request.error}`))
      }
    })
  }

  /**
   * Saves or updates a photo in storage. Respects the ID provided in photoData.
   * If photoData does not contain an 'id', it will be treated as a new photo and
   * the ID will be generated (by delegating to addPhoto).\n   * @param {Object} photoData - The photo object to save, must contain 'id' for updates.\n   * @returns {Promise<Object>} - The saved/updated photo object.\n   */
  async savePhoto (photoData) {
    if (!this.db) {
      throw new Error('Storage not initialized')
    }
    // If no ID is provided in photoData, delegate to addPhoto.
    if (!photoData.id) {
      console.warn('MapStorage: photoData provided without ID to savePhoto, delegating to addPhoto.')
      return this.addPhoto(photoData)
    }
    if (!(photoData.imageData instanceof Blob)) { // imageData MUST be a Blob for storage
      throw new Error('PhotoStorage: imageData must be a Blob object for saving (or null/undefined).')
    }

    // Convert Blob to Base64 for Safari compatibility
    let imageDataBase64
    let thumbnailDataBase64 = photoData.thumbnailData || null
    try {
      imageDataBase64 = await this.imageProcessor.blobToBase64(photoData.imageData)
      console.log('MapStorage: Converted photo image Blob to Base64 for Safari compatibility')

      // Also convert thumbnail if it's a Blob
      if (thumbnailDataBase64 && thumbnailDataBase64 instanceof Blob) {
        thumbnailDataBase64 = await this.imageProcessor.blobToBase64(thumbnailDataBase64)
        console.log('MapStorage: Converted photo thumbnail Blob to Base64 for Safari compatibility')
      }
    } catch (error) {
      console.error('MapStorage: Failed to convert photo Blob to Base64:', error)
      throw new Error(`Failed to convert photo to Base64: ${error.message}`)
    }

    const photoToSave = {
      id: photoData.id, // Use the provided ID
      markerId: photoData.markerId,
      imageData: imageDataBase64, // Store Base64 string instead of Blob
      thumbnailData: thumbnailDataBase64, // Store Base64 string instead of Blob
      fileName: photoData.fileName || 'Untitled Photo',
      fileType: photoData.fileType || 'image/jpeg',
      fileSize: photoData.fileSize || 0,
      createdDate: photoData.createdDate ? new Date(photoData.createdDate) : new Date(),
      description: photoData.description || ''
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.photoStoreName], 'readwrite')
      const store = transaction.objectStore(this.photoStoreName)
      const request = store.put(photoToSave) // Use put()

      request.onsuccess = () => {
        console.log('MapStorage: Photo saved/updated successfully', photoToSave.id)
        resolve(photoToSave)
      }

      request.onerror = () => {
        console.error('MapStorage: Failed to save/update photo', request.error)
        reject(new Error(`Failed to save photo: ${request.error}`))
      }
    })
  }

  /**
   * Close the database connection
   */
  close () {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('MapStorage: Database connection closed')
    }
  }

  /**
   * Migrate existing Blob data to Base64 for Safari compatibility
   * This should be called once during app initialization
   * @returns {Promise<void>}
   */
  async migrateBlobDataToBase64 () {
    if (!this.db || !this.imageProcessor) {
      console.warn('MapStorage: Cannot migrate data - storage not initialized or no image processor')
      return
    }

    // Check persistent migration flag
    if (window.localStorage.getItem('snapspot_blob_migration_done') === 'true') {
      console.log('MapStorage: Blob-to-Base64 migration already completed, skipping.')
      return
    }

    console.log('MapStorage: Starting Blob to Base64 migration for Safari compatibility...')

    try {
      // Get raw maps data without conversion
      const rawMaps = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.mapStoreName], 'readonly')
        const store = transaction.objectStore(this.mapStoreName)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      // Migrate maps
      let migratedMaps = 0
      for (const map of rawMaps) {
        if (map.imageData instanceof Blob) {
          console.log(`MapStorage: Migrating map ${map.id} from Blob to Base64`)
          const base64Data = await this.imageProcessor.blobToBase64(map.imageData)

          // Direct database update to store Base64
          await new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.mapStoreName], 'readwrite')
            const store = transaction.objectStore(this.mapStoreName)
            const updatedMap = { ...map, imageData: base64Data, lastModified: new Date() }
            const request = store.put(updatedMap)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          })

          migratedMaps++
        }
      }

      // Get raw photos data without conversion
      const rawPhotos = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.photoStoreName], 'readonly')
        const store = transaction.objectStore(this.photoStoreName)
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      // Migrate photos
      let migratedPhotos = 0
      for (const photo of rawPhotos) {
        let needsMigration = false
        const updateData = { ...photo }

        if (photo.imageData instanceof Blob) {
          console.log(`MapStorage: Migrating photo ${photo.id} imageData from Blob to Base64`)
          updateData.imageData = await this.imageProcessor.blobToBase64(photo.imageData)
          needsMigration = true
        }

        if (photo.thumbnailData instanceof Blob) {
          console.log(`MapStorage: Migrating photo ${photo.id} thumbnailData from Blob to Base64`)
          updateData.thumbnailData = await this.imageProcessor.blobToBase64(photo.thumbnailData)
          needsMigration = true
        }

        if (needsMigration) {
          // Direct database update to store Base64
          await new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.photoStoreName], 'readwrite')
            const store = transaction.objectStore(this.photoStoreName)
            updateData.lastModified = new Date()
            const request = store.put(updateData)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          })

          migratedPhotos++
        }
      }

      // Set migration flag after successful migration
      window.localStorage.setItem('snapspot_blob_migration_done', 'true')
      console.log(`MapStorage: Migration complete - migrated ${migratedMaps} maps and ${migratedPhotos} photos`)
    } catch (error) {
      console.error('MapStorage: Migration failed:', error)
      // Don't throw - migration failure shouldn't break the app
      // Optionally, set a flag to avoid repeated attempts if desired
    }
  }
}
