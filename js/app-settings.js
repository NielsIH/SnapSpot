/**
 * SnapSpot App Settings Module
 * Moved from app.js: showSettings orchestration, data prep, settings getters/setters.
 * All functions take `app` instance as first param.
 */

/* global localStorage confirm crypto Blob URL document FileReader */

import { handleViewImageInViewer } from './app-marker-photo-manager.js'

/**
  * Returns the current photo quality setting.
  */
export function getPhotoQuality (app) {
  return app.imageCompressionSettings.photo.quality
}

/**
 * Sets photo quality and persists.
 */
export function setPhotoQuality (app, qualityPercentage) {
  // Convert percentage (10-100) to decimal (0.1-1.0)
  const decimalQuality = qualityPercentage / 100
  // Ensure quality is within valid range (0.1 to 1.0)
  const clampedQuality = Math.max(0.1, Math.min(1.0, decimalQuality))
  app.imageCompressionSettings.photo.quality = clampedQuality
  localStorage.setItem('defaultPhotoQuality', clampedQuality) // Persist the decimal value
  app.showNotification(`Image quality for markers set to ${qualityPercentage}%.`, 'info')
  console.log('Image quality for markers set to:', clampedQuality)
}

/**
 * Returns auto-close marker details setting.
 */
export function getAutoCloseMarkerDetails (app) {
  return app.autoCloseMarkerDetails
}

/**
 * Sets auto-close marker details and persists.
 */
export function setAutoCloseMarkerDetails (app, value) {
  app.autoCloseMarkerDetails = value
  localStorage.setItem('autoCloseMarkerDetails', value)
  app.showNotification(`Auto-close marker details: ${app.autoCloseMarkerDetails ? 'Enabled' : 'Disabled'}.`, 'info')
  console.log('Auto-close marker details:', app.autoCloseMarkerDetails)
}

/**
 * Returns allow duplicate photos setting.
 */
export function getAllowDuplicatePhotos (app) {
  return app.allowDuplicatePhotos
}

/**
 * Sets allow duplicate photos and persists.
 */
export function setAllowDuplicatePhotos (app, value) {
  app.allowDuplicatePhotos = value
  localStorage.setItem('allowDuplicatePhotos', value)
  app.showNotification(`Allow duplicate photos: ${app.allowDuplicatePhotos ? 'Enabled' : 'Disabled'}.`, 'info')
  console.log('Allow duplicate photos:', app.allowDuplicatePhotos)
}

/**
 * Returns max markers to show.
 */
export function getMaxMarkersToShow (app) {
  return app.maxMarkersToShow
}

/**
 * Sets max markers to show and persists, refreshes display if map active.
 */
export function setMaxMarkersToShow (app, maxMarkers) {
  app.maxMarkersToShow = maxMarkers
  localStorage.setItem('maxMarkersToShow', maxMarkers.toString())
  console.log(`App: Max markers to show set to: ${maxMarkers === 0 ? 'unlimited' : maxMarkers}`)
  // If we have a current map loaded, refresh the marker display
  if (app.currentMap) {
    app.refreshMarkersDisplay()
  }
}

/**
 * Returns notifications enabled.
 */
export function getNotificationsEnabled (app) {
  return app.notificationsEnabled
}

/**
 * Sets notifications enabled and persists.
 */
export function setNotificationsEnabled (app, value) {
  app.notificationsEnabled = value
  localStorage.setItem('notificationsEnabled', value)
  app.showNotification(`Notifications: ${app.notificationsEnabled ? 'Enabled' : 'Disabled'}.`, 'info')
  console.log('Notifications enabled:', app.notificationsEnabled)
}

/**
 * Retrieves custom marker coloring rules from localStorage.
 */
export function getCustomMarkerColorRules (app) {
  try {
    const rulesJson = localStorage.getItem(app.customMarkerRulesKey)
    return rulesJson ? JSON.parse(rulesJson) : []
  } catch (error) {
    console.error('App: Error parsing custom marker rules from localStorage', error)
    return []
  }
}

/**
 * Saves custom marker coloring rules to localStorage.
 */
export function setCustomMarkerColorRules (app, rules) {
  try {
    localStorage.setItem(app.customMarkerRulesKey, JSON.stringify(rules))
    app.customMarkerRules = rules // Update internal state
    console.log('App: Custom marker rules saved to localStorage.', rules)
    // Re-render map to apply new rules if a map is active
    if (app.currentMap) {
      app.refreshMarkersDisplay()
    }
  } catch (error) {
    console.error('App: Error saving custom marker rules to localStorage', error)
    app.showErrorMessage('Save Error', 'Failed to save custom marker coloring rules.')
  }
}

/**
 * Returns predefined custom marker colors.
 */
export function getCustomMarkerColors (app) {
  return app.customMarkerColors
}

/**
 * Returns predefined custom marker operators.
 */
export function getCustomMarkerOperators (app) {
  return app.customMarkerOperators
}

/**
 * Returns current custom marker rules.
 */
export function getCurrentCustomMarkerRules (app) {
  return app.customMarkerRules
}

/**
 * Sets custom marker rules and persists.
 */
export function setAndPersistCustomMarkerRules (app, rules) {
  setCustomMarkerColorRules(app, rules)
}

// ========================================
// Marker Type Helpers
// ========================================

/**
 * Get the set of disabled marker type IDs from localStorage.
 * Types without a key (or with key='true') are considered enabled.
 */
export function getDisabledMarkerTypeIds () {
  const disabledIds = new Set()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('markerType_enabled_')) {
      const typeId = key.slice('markerType_enabled_'.length)
      if (localStorage.getItem(key) === 'false') {
        disabledIds.add(typeId)
      }
    }
  }
  return disabledIds
}

/**
 * Get the default marker type ID from localStorage.
 */
export function getDefaultMarkerTypeId () {
  return localStorage.getItem('defaultMarkerTypeId') || 'builtin-photo-marker'
}

/**
 * Set the default marker type ID and persist.
 */
export function setDefaultMarkerTypeId (typeId) {
  localStorage.setItem('defaultMarkerTypeId', typeId)
  console.log('Default marker type set to:', typeId)
}

/**
 * Toggle a marker type enabled/disabled in localStorage.
 */
export function setMarkerTypeEnabled (typeId, enabled) {
  localStorage.setItem(`markerType_enabled_${typeId}`, enabled ? 'true' : 'false')
  console.log(`Marker type ${typeId} ${enabled ? 'enabled' : 'disabled'}`)
}

/**
 * Displays the App Settings modal.
 * @param {Object} app - SnapSpotApp instance.
 * @param {string} [initialTab='general-settings'] - Initial tab.
 */
export async function showSettings (app, initialTab = 'general-settings') {
  app.showLoading('Loading settings...', false)
  try {
    // Load maps from storage
    app.mapsList = await app.storage.getAllMaps()
    // Prepare maps with thumbnails using shared util
    const mapsWithDetails = await app.imageProcessor.prepareMapsForDisplay(
      app.mapsList,
      app.thumbnailCache,
      app.imageCompressionSettings
    )
    // Separate active map for sorting
    let activeMap = null
    const currentActiveMapId = app.currentMap ? app.currentMap.id : null
    if (currentActiveMapId) {
      const activeMapIndex = mapsWithDetails.findIndex(map => map.id === currentActiveMapId)
      if (activeMapIndex !== -1) {
        activeMap = mapsWithDetails.splice(activeMapIndex, 1)[0]
      }
    }
    // Sort remaining maps by name alphabetically
    mapsWithDetails.sort((a, b) => a.name.localeCompare(b.name))
    // Prepend active map if it exists
    if (activeMap) {
      mapsWithDetails.unshift(activeMap)
    }

    const settingsCallbacks = {
      onClearAllAppData: () => app.clearAllAppData(),
      // Maps Management Callbacks
      onMapSelected: async (mapId) => {
        await app.switchToMap(mapId)
        app.updateAppStatus(`Switched to map: ${app.currentMap.name}`)
        if (app.modalManager.getTopModalId() === 'settings-modal') {
          app.modalManager.closeTopModal()
        }
      },
      onMapDelete: async (mapId) => {
        await app.deleteMap(mapId)
        // showSettings will be called again by onSettingsModalRefresh after deletion
      },
      onAddNewMap: () => {
        app.showUploadModal()
      },
      onEditMap: (mapId) => {
        app.showEditMapModal(mapId)
      },
      onExportHtmlMap: async (mapId) => {
        await app.exportHtmlReport(mapId)
      },
      onExportJsonMap: async (mapId) => {
        await app.exportJsonMap(mapId)
      },
      onSettingsModalRefresh: (tabToReopen) => {
        // Close current and re-open to refresh maps list
        if (app.modalManager.getTopModalId() === 'settings-modal') {
          app.modalManager.closeTopModal()
        }
        showSettings(app, tabToReopen)
      },
      // Image viewer callback
      onViewImageInViewer: (id, type) => handleViewImageInViewer(app, id, type),
      // Data Management Callbacks
      onImportData: async (file) => {
        await app.handleImportFile(file)
        app.updateAppStatus('Data import complete.', 'success')
        // Trigger refresh
        settingsCallbacks.onSettingsModalRefresh('maps-management-settings')
      },
      // Map Display Callbacks
      isCrosshairEnabled: () => app.isCrosshairEnabled(),
      onToggleCrosshair: (enabled) => app.toggleCrosshair(enabled),
      // Image Processing Callbacks
      getPhotoQuality: () => getPhotoQuality(app),
      setPhotoQuality: (qualityPercentage) => setPhotoQuality(app, qualityPercentage),
      // App Behavior Callbacks
      getAutoCloseMarkerDetails: () => getAutoCloseMarkerDetails(app),
      setAutoCloseMarkerDetails: (value) => setAutoCloseMarkerDetails(app, value),
      getAllowDuplicatePhotos: () => getAllowDuplicatePhotos(app),
      setAllowDuplicatePhotos: (value) => setAllowDuplicatePhotos(app, value),
      // Max Markers Display Callbacks
      getMaxMarkersToShow: () => getMaxMarkersToShow(app),
      setMaxMarkersToShow: (maxMarkers) => setMaxMarkersToShow(app, maxMarkers),
      // Notifications
      getNotificationsEnabled: () => getNotificationsEnabled(app),
      setNotificationsEnabled: (value) => setNotificationsEnabled(app, value),
      // Custom Marker Coloring Callbacks
      getCustomMarkerColors: () => getCustomMarkerColors(app),
      getCustomMarkerOperators: () => getCustomMarkerOperators(app),
      getCurrentCustomMarkerRules: () => getCurrentCustomMarkerRules(app),
      setAndPersistCustomMarkerRules: (rules) => setAndPersistCustomMarkerRules(app, rules),
      // Metadata Callbacks
      getMetadataDefinitions: async () => {
        return await app.storage.getAllMetadataDefinitions()
      },
      onAddMetadataDefinition: async (scope, onComplete) => {
        const { createMetadataDefinitionModal } = await import('./ui/metadata-definition-modal.js')
        createMetadataDefinitionModal(app.modalManager, {
          definition: null,
          scope,
          activeMapId: currentActiveMapId,
          onSave: async (definitionData) => {
            try {
              await app.storage.addMetadataDefinition(definitionData)
              app.showNotification(`Metadata field "${definitionData.name}" created.`, 'success')
              if (onComplete) onComplete()
            } catch (error) {
              console.error('Error saving metadata definition:', error)
              app.showNotification('Failed to create metadata field.', 'error')
            }
          }
        })
      },
      onEditMetadataDefinition: async (defId, onComplete) => {
        const definition = await app.storage.getMetadataDefinition(defId)
        if (!definition) {
          app.showNotification('Metadata field not found.', 'error')
          return
        }
        const { createMetadataDefinitionModal } = await import('./ui/metadata-definition-modal.js')
        createMetadataDefinitionModal(app.modalManager, {
          definition,
          scope: definition.scope,
          activeMapId: currentActiveMapId,
          onSave: async (definitionData) => {
            try {
              await app.storage.updateMetadataDefinition(definitionData)
              app.showNotification(`Metadata field "${definitionData.name}" updated.`, 'success')
              if (onComplete) onComplete()
            } catch (error) {
              console.error('Error updating metadata definition:', error)
              app.showNotification('Failed to update metadata field.', 'error')
            }
          }
        })
      },
      onDeleteMetadataDefinition: async (defId) => {
        const definition = await app.storage.getMetadataDefinition(defId)
        if (!definition) {
          app.showNotification('Metadata field not found.', 'error')
          return
        }
        const values = await app.storage.getMetadataValuesByDefinition(defId)
        const valueCount = values.length
        const message = valueCount > 0
          ? `Delete "${definition.name}"?\n\nThis field has ${valueCount} value${valueCount === 1 ? '' : 's'} that will also be deleted. This cannot be undone.`
          : `Delete "${definition.name}"?\n\nThis cannot be undone.`
        if (!confirm(message)) {
          return
        }
        try {
          await app.storage.deleteMetadataDefinition(defId)
          app.showNotification(`Metadata field "${definition.name}" deleted.`, 'success')
        } catch (error) {
          console.error('Error deleting metadata definition:', error)
          app.showNotification('Failed to delete metadata field.', 'error')
        }
      },
      onExportMetadataDefinitions: async () => {
        try {
          const allDefinitions = await app.storage.getAllMetadataDefinitions()
          const globalDefinitions = allDefinitions.filter(def => def.scope === 'global')
          if (globalDefinitions.length === 0) {
            app.showNotification('No global metadata definitions to export.', 'info')
            return
          }
          const exportData = {
            version: '1.2',
            type: 'snapspot-metadata-definitions',
            sourceApp: 'SnapSpot',
            timestamp: new Date().toISOString(),
            definitions: globalDefinitions
          }
          const json = JSON.stringify(exportData, null, 2)
          const blob = new Blob([json], { type: 'application/json' })
          const filename = `snapspot-metadata-definitions-${new Date().toISOString().split('T')[0]}.json`
          // Trigger download
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          app.showNotification(`Exported ${globalDefinitions.length} metadata definition${globalDefinitions.length === 1 ? '' : 's'}.`, 'success')
        } catch (error) {
          console.error('Error exporting metadata definitions:', error)
          app.showNotification('Failed to export metadata definitions.', 'error')
        }
      },
      onImportMetadataDefinitions: async (file) => {
        try {
          const text = await file.text()
          const importData = JSON.parse(text)
          if (importData.type !== 'snapspot-metadata-definitions') {
            app.showNotification('Invalid metadata definitions file.', 'error')
            return
          }
          if (!importData.definitions || !Array.isArray(importData.definitions)) {
            app.showNotification('Invalid metadata definitions format.', 'error')
            return
          }
          const existingDefinitions = await app.storage.getAllMetadataDefinitions()
          const existingNames = new Set(existingDefinitions.map(def => def.name.toLowerCase()))
          let imported = 0
          let skipped = 0
          for (const def of importData.definitions) {
            if (existingNames.has(def.name.toLowerCase())) {
              const overwrite = confirm(`A field named "${def.name}" already exists. Overwrite it?`)
              if (!overwrite) {
                skipped++
                continue
              }
              const existingDef = existingDefinitions.find(d => d.name.toLowerCase() === def.name.toLowerCase())
              def.id = existingDef.id
              await app.storage.updateMetadataDefinition(def)
            } else {
              def.id = crypto.randomUUID()
              await app.storage.addMetadataDefinition(def)
            }
            imported++
          }
          app.showNotification(`Imported ${imported} metadata definition${imported === 1 ? '' : 's'}${skipped > 0 ? `, skipped ${skipped}` : ''}.`, 'success')
        } catch (error) {
          console.error('Error importing metadata definitions:', error)
          app.showNotification('Failed to import metadata definitions.', 'error')
        }
      },
      // Marker Types Callbacks
      getMarkerTypeDefinitions: async () => {
        return await app.storage.getAllMarkerTypeDefinitions()
      },
      getEnabledMarkerTypeIds: () => {
        return getDisabledMarkerTypeIds()
      },
      getDefaultMarkerTypeId: () => getDefaultMarkerTypeId(),
      onChangeDefaultMarkerType: (typeId) => {
        setDefaultMarkerTypeId(typeId)
        if (app.defaultMarkerTypeId !== undefined) {
          app.defaultMarkerTypeId = typeId
        }
        app.showNotification('Default marker type updated.', 'info')
      },
      onToggleMarkerType: (typeId, enabled) => {
        setMarkerTypeEnabled(typeId, enabled)
        // Refresh renderer with updated type definitions
        if (app.refreshMarkerTypeDefinitions) {
          app.refreshMarkerTypeDefinitions()
        }
      },
      onUpdateMarkerTypeColor: async (typeId, newColor) => {
        try {
          const def = await app.storage.getMarkerTypeDefinition(typeId)
          if (!def) {
            app.showNotification('Marker type not found.', 'error')
            return
          }
          def.color = newColor
          await app.storage.updateMarkerTypeDefinition(def)
          app.showNotification(`Color updated for "${def.name}".`, 'success')
          // Refresh renderer with updated type definitions
          if (app.refreshMarkerTypeDefinitions) {
            app.refreshMarkerTypeDefinitions()
          }
        } catch (error) {
          console.error('Error updating marker type color:', error)
          app.showNotification('Failed to update marker type color.', 'error')
        }
      },
      onAddMarkerType: async (onComplete) => {
        const { createMarkerTypeDefinitionModal } = await import('./ui/marker-type-definition-modal.js')
        createMarkerTypeDefinitionModal(app.modalManager, {
          definition: null,
          onSave: async (definitionData) => {
            try {
              await app.storage.addMarkerTypeDefinition(definitionData)
              app.showNotification(`Marker type "${definitionData.name}" created.`, 'success')
              // Refresh renderer with updated type definitions
              if (app.refreshMarkerTypeDefinitions) {
                app.refreshMarkerTypeDefinitions()
              }
              if (onComplete) onComplete()
            } catch (error) {
              console.error('Error saving marker type definition:', error)
              app.showNotification('Failed to create marker type.', 'error')
            }
          }
        })
      },
      onEditMarkerType: async (typeId, onComplete) => {
        const definition = await app.storage.getMarkerTypeDefinition(typeId)
        if (!definition) {
          app.showNotification('Marker type not found.', 'error')
          return
        }
        const { createMarkerTypeDefinitionModal } = await import('./ui/marker-type-definition-modal.js')
        createMarkerTypeDefinitionModal(app.modalManager, {
          definition,
          onSave: async (definitionData) => {
            try {
              await app.storage.updateMarkerTypeDefinition(definitionData)
              app.showNotification(`Marker type "${definitionData.name}" updated.`, 'success')
              // Refresh renderer with updated type definitions
              if (app.refreshMarkerTypeDefinitions) {
                app.refreshMarkerTypeDefinitions()
              }
              if (onComplete) onComplete()
            } catch (error) {
              console.error('Error updating marker type definition:', error)
              app.showNotification('Failed to update marker type.', 'error')
            }
          }
        })
      },
      onDeleteMarkerType: async (typeId) => {
        try {
          const definition = await app.storage.getMarkerTypeDefinition(typeId)
          if (!definition) {
            app.showNotification('Marker type not found.', 'error')
            return
          }
          // Check reference count
          const count = await app.storage.getMarkerCountByType(typeId)
          if (count > 0) {
            app.showNotification(
              `Cannot delete "${definition.name}": ${count} marker${count === 1 ? '' : 's'} use${count === 1 ? 's' : ''} this type.`,
              'error'
            )
            return
          }
          if (!confirm(`Delete "${definition.name}"?\n\nThis cannot be undone.`)) {
            return
          }
          await app.storage.deleteMarkerTypeDefinition(typeId)
          app.showNotification(`Marker type "${definition.name}" deleted.`, 'success')
          // Refresh renderer with updated type definitions
          if (app.refreshMarkerTypeDefinitions) {
            app.refreshMarkerTypeDefinitions()
          }
        } catch (error) {
          console.error('Error deleting marker type definition:', error)
          app.showNotification(error.message || 'Failed to delete marker type.', 'error')
        }
      },
      onExportMarkerTypes: async () => {
        try {
          app.updateAppStatus('Exporting marker types...', 'info', true)

          // Get all marker type definitions
          const typeDefs = await app.storage.getAllMarkerTypeDefinitions()
          const customDefs = typeDefs.filter(def => !def.isBuiltIn)

          if (customDefs.length === 0) {
            app.showNotification('No custom marker types to export.', 'info')
            return
          }

          // Build definitions-only export
          const { buildMarkerTypeDefinitionsExport } = await import('../lib/snapspot-data/writer.js')
          const exportObj = buildMarkerTypeDefinitionsExport(typeDefs, 'SnapSpot PWA')
          const jsonString = JSON.stringify(exportObj, null, 2)

          // Trigger download
          const blob = new Blob([jsonString], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          const dateStr = new Date().toISOString().slice(0, 10)
          a.download = `snapspot-marker-type-definitions-${dateStr}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          app.showNotification(`Exported ${customDefs.length} marker type(s) successfully.`, 'success')
          app.updateAppStatus('Marker types exported')
        } catch (error) {
          console.error('Error exporting marker types:', error)
          app.showNotification('Failed to export marker types: ' + error.message, 'error')
        }
      },
      onImportMarkerTypes: async (file) => {
        try {
          app.updateAppStatus(`Importing marker types from "${file.name}"...`, 'info', true)

          // Read file
          const jsonString = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = (e) => reject(new Error('Failed to read file'))
            reader.readAsText(file)
          })

          // Parse JSON
          let exportData
          try {
            exportData = JSON.parse(jsonString)
          } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`)
          }

          // Validate as marker type definitions export
          const { validateMarkerTypeDefinitionsExport } = await import('../lib/snapspot-data/validator.js')
          const validation = validateMarkerTypeDefinitionsExport(exportData)
          if (!validation.isValid) {
            throw new Error(`Invalid marker type export:\n  - ${validation.errors.join('\n  - ')}`)
          }

          // Import definitions
          let importedCount = 0
          const existingDefs = await app.storage.getAllMarkerTypeDefinitions()
          const existingByName = new Map()
          for (const def of existingDefs) {
            existingByName.set(def.name.toLowerCase(), def)
          }

          for (const typeDef of exportData.definitions) {
            // Skip built-in
            if (typeDef.isBuiltIn) {
              console.log(`Settings: Skipping built-in marker type "${typeDef.name}"`)
              continue
            }

            // Check for duplicate by name
            if (existingByName.has(typeDef.name.toLowerCase())) {
              console.log(`Settings: Skipping duplicate marker type "${typeDef.name}"`)
              continue
            }

            try {
              await app.storage.addMarkerTypeDefinition(typeDef)
              existingByName.set(typeDef.name.toLowerCase(), typeDef)
              importedCount++
              console.log(`Settings: Imported marker type "${typeDef.name}"`)
            } catch (error) {
              console.warn(`Settings: Failed to import marker type "${typeDef.name}":`, error)
            }
          }

          // Refresh renderer
          await app.refreshMarkerTypeDefinitions()

          app.showNotification(`Imported ${importedCount} marker type(s) successfully.`, 'success')
          app.updateAppStatus('Marker types imported')
        } catch (error) {
          console.error('Error importing marker types:', error)
          app.showNotification('Failed to import marker types: ' + error.message, 'error')
        }
      }
    }
    // Create and display the settings modal
    app.modalManager.createSettingsModal(
      settingsCallbacks,
      mapsWithDetails,
      currentActiveMapId,
      () => { // onClose
        app.updateAppStatus('Settings closed')
      },
      initialTab
    )
    app.updateAppStatus('Settings displayed')
  } catch (error) {
    console.error('App: Error showing settings modal:', error)
    app.showErrorMessage('Failed to open settings', error.message)
  } finally {
    app.hideLoading()
  }
}
