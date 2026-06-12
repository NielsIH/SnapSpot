/* global DOMParser requestAnimationFrame localStorage */

/**
 * SnapSpot PWA - Settings Modal Module
 * Standalone module for creating the App Settings modal.
 * Extracted from modals.js per Phase 4 refactoring plan.
 */

import { UIRenderer } from './uiRenderer.js'

/**
 * Creates and displays the App Settings modal with tabbed sections.
 * @param {Object} modalManager - Instance of ModalManager for closeModal access.
 * @param {Object} callbacks - Object with callbacks for settings actions.
 * @param {Array<Object>} maps - Array of map metadata objects for Maps Management.
 * @param {string|null} activeMapId - ID of the currently active map.
 * @param {Function} [onClose] - Callback when modal closes.
 * @param {string} [initialTab='general-settings'] - Initial tab ID.
 * @returns {HTMLElement} - Created modal element.
 */
export function createSettingsModal (modalManager, callbacks, maps, activeMapId, onClose, initialTab = 'general-settings') {
  console.log('SettingsModal: Creating new Settings Modal.')

  // Generate Maps Management DOM content using UIRenderer
  let mapsListDOMElement
  if (maps.length === 0) {
    const noMapsParagraph = document.createElement('p')
    noMapsParagraph.classList.add('text-center', 'text-secondary')
    noMapsParagraph.textContent = 'No maps available yet. Add your first map!'
    mapsListDOMElement = noMapsParagraph
  } else {
    const mapsListUl = document.createElement('ul')
    mapsListUl.classList.add('maps-list')
    maps.forEach((map) => {
      const card = UIRenderer.createCardElement(
        map,
        'map',
        {
          onMapSelected: callbacks.onMapSelected,
          onMapDelete: callbacks.onMapDelete,
          onEditMap: callbacks.onEditMap,
          onExportHtmlMap: callbacks.onExportHtmlMap,
          onExportJsonMap: callbacks.onExportJsonMap,
          onSettingsModalRefresh: callbacks.onSettingsModalRefresh,
          onViewImageInViewer: (id, type) => callbacks.onViewImageInViewer(id, type)
        },
        map.id === activeMapId
      )
      mapsListUl.appendChild(card)
    })
    mapsListDOMElement = mapsListUl
  }

  const modalHtml = `
    <div class="modal" id="settings-modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3 class="modal-title">App Settings</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-tabs">
            <div class="tab-buttons">
              <button class="tab-button" data-tab="general-settings">General</button>
              <button class="tab-button" data-tab="app-behavior-settings">App Behavior</button>
              <button class="tab-button" data-tab="map-display-settings">Map Display</button>
              <button class="tab-button" data-tab="image-processing-settings">Image Processing</button>
              <button class="tab-button" data-tab="data-management-settings">Data Management</button>
              <button class="tab-button" data-tab="metadata-settings">Metadata</button>
              <button class="tab-button" data-tab="marker-types-settings">Marker Types</button>
              <button class="tab-button" data-tab="maps-management-settings">Maps Management</button>
              <button class="tab-button" data-tab="danger-zone-settings">Danger Zone</button>
            </div>
            <select class="settings-tab-selector" aria-label="Select Settings Category">
              <option value="general-settings">General</option>
              <option value="app-behavior-settings">App Behavior</option>
              <option value="map-display-settings">Map Display</option>
              <option value="image-processing-settings">Image Processing</option>
              <option value="data-management-settings">Data Management</option>
              <option value="metadata-settings">Metadata</option>
              <option value="marker-types-settings">Marker Types</option>
              <option value="maps-management-settings">Maps Management</option>
              <option value="danger-zone-settings">Danger Zone</option>
            </select>
            <div class="tab-content">
              <div id="general-settings" class="tab-pane">
                <h4>General Settings</h4>
                <div class="form-group">
                  <label class="checkbox-label toggle-switch-label">
                    <input type="checkbox" id="toggle-notifications" />
                    <span class="toggle-switch-slider"></span>
                    Enable Notifications
                  </label>
                  <small class="text-secondary mt-xs">Toggle toast notifications for app events.</small>
                </div>
              </div>
              <div id="app-behavior-settings" class="tab-pane">
                <h4>App Behavior Settings</h4>
                <div class="form-group">
                  <label class="checkbox-label toggle-switch-label">
                    <input type="checkbox" id="auto-close-marker-details" />
                    <span class="toggle-switch-slider"></span>
                    Auto-close marker details after adding photo(s)
                  </label>
                  <small class="text-secondary mt-xs">Automatically close the marker details modal after successfully adding photos.</small>
                </div>
                <div class="form-group mt-md">
                  <label class="checkbox-label toggle-switch-label">
                    <input type="checkbox" id="allow-duplicate-photos" />
                    <span class="toggle-switch-slider"></span>
                    Allow adding duplicate photos to markers
                  </label>
                  <small class="text-secondary mt-xs">Enable to allow the same photo file to be associated with multiple markers.</small>
                </div>
              </div>
              <div id="map-display-settings" class="tab-pane">
                <h4>Map Display Settings</h4>
                <div class="form-group">
                  <label class="checkbox-label toggle-switch-label">
                    <input type="checkbox" id="toggle-crosshair-settings" />
                    <span class="toggle-switch-slider"></span>
                    Show Crosshair
                  </label>
                  <small class="text-secondary mt-xs">Enable or disable the crosshair overlay on the map canvas.</small>
                </div>
                <div class="form-group mt-md">
                  <label for="max-markers-slider">Maximum Markers to Display</label>
                  <div class="slider-container">
                    <input type="range" id="max-markers-slider" min="0" max="200" step="5" class="form-control" />
                    <div class="slider-labels">
                      <span>0 (Unlimited)</span>
                      <span id="max-markers-value" class="text-secondary text-right"></span>
                      <span>200</span>
                    </div>
                  </div>
                  <small class="text-secondary mt-xs">Limit the number of most recent markers shown on the map. Set to 0 for unlimited display.</small>
                </div>
                <div class="custom-marker-coloring-section mt-lg">
                  <h4>Custom Marker Coloring Rules</h4>
                  <p class="text-secondary mb-md">Define rules to automatically color markers based on their description. Rules are applied from top to bottom, with the last matching rule taking precedence.</p>
                  <div id="custom-marker-rules-container">
                    <!-- Rule rows injected by JS -->
                  </div>
                </div>
              </div>
              <div id="image-processing-settings" class="tab-pane">
                <h4>Image Processing Settings</h4>
                <div class="form-group">
                  <label for="image-quality-slider">Default Image Quality (%)</label>
                  <input type="range" id="image-quality-slider" min="10" max="100" step="5" class="form-control" />
                  <span id="image-quality-value" class="text-secondary text-right"></span>
                  <small class="text-secondary mt-xs">Adjust the compression quality for images added to markers (10% = lowest, 100% = highest).</small>
                </div>
              </div>
              <div id="data-management-settings" class="tab-pane">
                <h4>Data Management</h4>
                <p class="text-secondary mb-md">Import map data or other application data.</p>
                <div class="form-group">
                  <label for="file-input-import-settings" class="btn btn-secondary btn-large">
                    📥 <span class="btn-text">Import Map Data (JSON)</span>
                  </label>
                  <input type="file" id="file-input-import-settings" accept=".json" style="display: none" />
                  <small class="text-secondary mt-xs">Select a JSON file containing exported map data to import into the application.</small>
                </div>
              </div>
              <div id="metadata-settings" class="tab-pane">
                <h4>Metadata Definitions</h4>
                <p class="text-secondary mb-md">Define custom metadata fields to attach to maps, markers, and photos. These fields can be used to add structured information to your data.</p>
                
                <div class="metadata-scope-toggle mb-md">
                  <button class="btn btn-secondary btn-sm scope-toggle-btn active" data-scope="global">Global Fields</button>
                  <button class="btn btn-secondary btn-sm scope-toggle-btn" data-scope="map-specific">Map-Specific Fields</button>
                </div>

                <div id="metadata-definitions-container">
                  <!-- Metadata definitions list will be injected here -->
                </div>

                <div class="metadata-actions mt-lg">
                  <button class="btn btn-primary" id="add-metadata-definition-btn">
                    ➕ <span class="btn-text">Add Field Definition</span>
                  </button>
                  <button class="btn btn-secondary" id="export-metadata-definitions-btn">
                    📤 <span class="btn-text">Export Definitions</span>
                  </button>
                  <button class="btn btn-secondary" id="import-metadata-definitions-btn">
                    📥 <span class="btn-text">Import Definitions</span>
                  </button>
                  <input type="file" id="import-metadata-definitions-input" accept=".json" style="display: none" />
                </div>
              </div>
              <div id="marker-types-settings" class="tab-pane">
                <h4>Marker Types</h4>
                <p class="text-secondary mb-md">Customize how markers look and behave on your maps.</p>

                <div id="marker-types-builtin-section" class="marker-types-section">
                  <!-- Built-in types injected by JS -->
                </div>

                <div id="marker-types-presets-section" class="marker-types-section">
                  <h5 class="marker-types-section-title">Presets</h5>
                  <div id="marker-types-presets-container">
                    <!-- Preset types injected by JS -->
                  </div>
                </div>

                <div id="marker-types-custom-section" class="marker-types-section">
                  <h5 class="marker-types-section-title">Custom</h5>
                  <div id="marker-types-custom-container">
                    <!-- Custom types injected by JS -->
                  </div>
                </div>

                <div class="marker-types-actions mt-md">
                  <button class="btn btn-primary" id="add-marker-type-btn">
                    ➕ <span class="btn-text">Add Custom Type</span>
                  </button>
                  <button class="btn btn-secondary" id="export-marker-types-btn">
                    📤 <span class="btn-text">Export Types</span>
                  </button>
                  <button class="btn btn-secondary" id="import-marker-types-btn">
                    📥 <span class="btn-text">Import Types</span>
                  </button>
                  <input type="file" id="import-marker-types-input" accept=".json" style="display: none" />
                </div>

                <div class="marker-types-default-selector mt-lg">
                  <label for="default-marker-type-select">Default marker type:</label>
                  <select id="default-marker-type-select" class="form-control">
                    <!-- Options injected by JS -->
                  </select>
                  <small class="text-secondary mt-xs">Used when tapping "Place Marker".</small>
                </div>
              </div>
              <div id="maps-management-settings" class="tab-pane">
                <h4>Maps Management</h4>
                <div class="map-management-content">
                  <div id="maps-list-placeholder"></div>
                  <div class="modal-footer no-border">
                    <div class="modal-actions full-width">
                      <button class="btn btn-primary add-new-map-btn" type="button">➕ Add New Map</button>
                    </div>
                  </div>
                </div>
              </div>
              <div id="danger-zone-settings" class="tab-pane">
                <h4>Danger Zone</h4>
                <p class="text-secondary mb-md">Proceed with caution. These actions are irreversible and will permanently delete data.</p>
                <div class="form-group">
                  <button class="btn btn-danger btn-large" id="btn-clear-all-app-data" type="button">Clear All App Data</button>
                  <small class="text-secondary mt-xs">This will delete all maps, markers, and associated images from this device.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  const parser = new DOMParser()
  const modalDoc = parser.parseFromString(modalHtml, 'text/html')
  const modal = modalDoc.querySelector('.modal')
  if (!modal) {
    console.error('Failed to create settings modal element.')
    if (onClose) onClose()
    return null
  }

  document.body.appendChild(modal)
  modalManager.activeModals.add(modal)

  // Replace maps placeholder
  const mapsListPlaceholder = modal.querySelector('#maps-list-placeholder')
  if (mapsListPlaceholder && mapsListDOMElement) {
    mapsListPlaceholder.replaceWith(mapsListDOMElement)
  }

  // Close handler
  const closeModal = () => {
    modalManager.closeModal(modal)
    if (onClose) onClose()
  }
  modal.querySelector('.modal-close')?.addEventListener('click', closeModal)
  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal)

  // Tab switching
  const tabButtons = modal.querySelectorAll('.tab-button')
  const tabPanes = modal.querySelectorAll('.tab-pane')
  const activateTab = (tabId) => {
    tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId))
    tabPanes.forEach((pane) => pane.classList.toggle('active', pane.id === tabId))
    const mobileTabSelector = modal.querySelector('.settings-tab-selector')
    if (mobileTabSelector) mobileTabSelector.value = tabId
  }

  tabButtons.forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)))

  const mobileTabSelector = modal.querySelector('.settings-tab-selector')
  if (mobileTabSelector) {
    mobileTabSelector.addEventListener('change', (e) => activateTab(e.target.value))
    mobileTabSelector.value = initialTab
  }

  requestAnimationFrame(() => {
    activateTab(initialTab)
    modal.classList.add('show')
  })

  // Clear All Data
  const btnClearAllAppData = modal.querySelector('#btn-clear-all-app-data')
  btnClearAllAppData?.addEventListener('click', () => {
    if (callbacks.onClearAllAppData) {
      callbacks.onClearAllAppData()
      modalManager.closeModal(modal)
    }
  })

  // Quality Slider
  const imageQualitySlider = modal.querySelector('#image-quality-slider')
  const imageQualityValueSpan = modal.querySelector('#image-quality-value')
  if (imageQualitySlider && imageQualityValueSpan && callbacks.getPhotoQuality && callbacks.setPhotoQuality) {
    const currentQualityDecimal = callbacks.getPhotoQuality()
    const currentQualityPercentage = Math.round(currentQualityDecimal * 100)
    imageQualitySlider.value = currentQualityPercentage
    imageQualityValueSpan.textContent = `${currentQualityPercentage}%`
    imageQualitySlider.addEventListener('input', () => {
      imageQualityValueSpan.textContent = `${imageQualitySlider.value}%`
    })
    imageQualitySlider.addEventListener('change', () => callbacks.setPhotoQuality(parseInt(imageQualitySlider.value, 10)))
  }

  // Max Markers Slider
  const maxMarkersSlider = modal.querySelector('#max-markers-slider')
  const maxMarkersValueSpan = modal.querySelector('#max-markers-value')
  if (maxMarkersSlider && maxMarkersValueSpan && callbacks.getMaxMarkersToShow && callbacks.setMaxMarkersToShow) {
    const currentMaxMarkers = callbacks.getMaxMarkersToShow()
    maxMarkersSlider.value = currentMaxMarkers
    maxMarkersValueSpan.textContent = currentMaxMarkers === 0 ? 'Unlimited' : `${currentMaxMarkers} markers`
    maxMarkersSlider.addEventListener('input', () => {
      const value = parseInt(maxMarkersSlider.value)
      maxMarkersValueSpan.textContent = value === 0 ? 'Unlimited' : `${value} markers`
    })
    maxMarkersSlider.addEventListener('change', () => callbacks.setMaxMarkersToShow(parseInt(maxMarkersSlider.value)))
  }

  // Add New Map
  modal.querySelector('.add-new-map-btn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    if (callbacks.onAddNewMap) {
      modalManager.closeModal(modal)
      callbacks.onAddNewMap()
    }
  })

  // Import File
  const fileInputImportSettings = modal.querySelector('#file-input-import-settings')
  if (fileInputImportSettings && callbacks.onImportData) {
    fileInputImportSettings.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (file) {
        await callbacks.onImportData(file)
        e.target.value = ''
      }
    })
  }

  // Custom Rules Helper
  const generateRuleRowHtml = (index, rule, colors, operators) => {
    const selectedOperator = rule ? rule.operator : 'none'
    const selectedColor = rule ? rule.color : colors[0].hex
    const ruleValue = rule ? rule.value || '' : ''
    const isValueInputDisabled = selectedOperator !== 'contains'

    const operatorOptions = ['<option value="none">None</option>', ...operators.map(op => `<option value="${op.value}" ${selectedOperator === op.value ? 'selected' : ''}>${op.label}</option>`).join('')].join('')

    const colorOptions = colors.map(color => `<option value="${color.hex}" ${selectedColor === color.hex ? 'selected' : ''}>${color.name}</option>`).join('')

    return `
      <div class="custom-marker-rule-row" data-rule-index="${index}">
        <div class="form-group rule-operator">
          <label for="rule-operator-${index}" class="sr-only">Condition for Rule ${index + 1}</label>
          <select id="rule-operator-${index}" class="form-control">${operatorOptions}</select>
        </div>
        <div class="form-group rule-value">
          <label for="rule-value-${index}" class="sr-only">Value for Rule ${index + 1}</label>
          <input type="text" id="rule-value-${index}" class="form-control" placeholder="Enter text to match" value="${ruleValue}" ${isValueInputDisabled ? 'disabled' : ''} />
        </div>
        <div class="form-group rule-color">
          <label for="rule-color-${index}" class="sr-only">Color for Rule ${index + 1}</label>
          <select id="rule-color-${index}" class="form-control color-select">${colorOptions}</select>
          <span class="color-swatch" style="background-color: ${selectedColor};"></span>
        </div>
      </div>
    `
  }

  // Custom Marker Rules
  const customMarkerRulesContainer = modal.querySelector('#custom-marker-rules-container')
  if (customMarkerRulesContainer && callbacks.getCustomMarkerColors && callbacks.getCustomMarkerOperators && callbacks.getCurrentCustomMarkerRules && callbacks.setAndPersistCustomMarkerRules) {
    const colors = callbacks.getCustomMarkerColors()
    const operators = callbacks.getCustomMarkerOperators()
    let rules = callbacks.getCurrentCustomMarkerRules() || []

    const MAX_RULES = 5
    while (rules.length < MAX_RULES) rules.push(null)
    rules = rules.slice(0, MAX_RULES)

    customMarkerRulesContainer.innerHTML = rules.map((rule, i) => generateRuleRowHtml(i, rule, colors, operators)).join('')

    const updateRules = () => {
      const newRules = []
      modal.querySelectorAll('.custom-marker-rule-row').forEach((row, idx) => {
        const op = row.querySelector(`#rule-operator-${idx}`)
        const val = row.querySelector(`#rule-value-${idx}`)
        const col = row.querySelector(`#rule-color-${idx}`)
        if (op.value !== 'none') {
          newRules.push({
            id: `rule_${idx + 1}`,
            field: 'description',
            operator: op.value,
            value: op.value === 'contains' ? val.value.trim() : null,
            color: col.value
          })
        }
      })
      callbacks.setAndPersistCustomMarkerRules(newRules)
    }

    modal.querySelectorAll('.custom-marker-rule-row').forEach(row => {
      const idx = parseInt(row.dataset.ruleIndex)
      const opSel = row.querySelector(`#rule-operator-${idx}`)
      const valIn = row.querySelector(`#rule-value-${idx}`)
      const colSel = row.querySelector(`#rule-color-${idx}`)
      const swatch = row.querySelector('.color-swatch')

      opSel?.addEventListener('change', () => {
        const op = opSel.value
        valIn.disabled = op !== 'contains'
        if (op !== 'contains') valIn.value = ''
        updateRules()
      })

      valIn?.addEventListener('input', updateRules)

      colSel?.addEventListener('change', () => {
        swatch.style.backgroundColor = colSel.value
        updateRules()
      })
    })
  }

  // Crosshair
  const crosshairChk = modal.querySelector('#toggle-crosshair-settings')
  if (crosshairChk && callbacks.isCrosshairEnabled && callbacks.onToggleCrosshair) {
    crosshairChk.checked = callbacks.isCrosshairEnabled()
    crosshairChk.addEventListener('change', () => callbacks.onToggleCrosshair(crosshairChk.checked))
  }

  // Auto-close
  const autoCloseChk = modal.querySelector('#auto-close-marker-details')
  if (autoCloseChk && callbacks.getAutoCloseMarkerDetails && callbacks.setAutoCloseMarkerDetails) {
    autoCloseChk.checked = callbacks.getAutoCloseMarkerDetails()
    autoCloseChk.addEventListener('change', () => callbacks.setAutoCloseMarkerDetails(autoCloseChk.checked))
  }

  // Duplicates
  const dupChk = modal.querySelector('#allow-duplicate-photos')
  if (dupChk && callbacks.getAllowDuplicatePhotos && callbacks.setAllowDuplicatePhotos) {
    dupChk.checked = callbacks.getAllowDuplicatePhotos()
    dupChk.addEventListener('change', () => callbacks.setAllowDuplicatePhotos(dupChk.checked))
  }

  // Notifications
  const notifChk = modal.querySelector('#toggle-notifications')
  if (notifChk && callbacks.getNotificationsEnabled && callbacks.setNotificationsEnabled) {
    notifChk.checked = callbacks.getNotificationsEnabled()
    notifChk.addEventListener('change', () => callbacks.setNotificationsEnabled(notifChk.checked))
  }

  // Metadata Tab Functionality
  let currentMetadataScope = 'global'
  const metadataContainer = modal.querySelector('#metadata-definitions-container')
  const scopeToggleButtons = modal.querySelectorAll('.scope-toggle-btn')
  const addMetadataDefBtn = modal.querySelector('#add-metadata-definition-btn')
  const exportMetadataDefBtn = modal.querySelector('#export-metadata-definitions-btn')
  const importMetadataDefBtn = modal.querySelector('#import-metadata-definitions-btn')
  const importMetadataDefInput = modal.querySelector('#import-metadata-definitions-input')

  const renderMetadataDefinitions = async () => {
    if (!metadataContainer) {
      return
    }

    // Get definitions (or empty array if callback not provided)
    const allDefinitions = callbacks.getMetadataDefinitions
      ? await callbacks.getMetadataDefinitions()
      : []

    // Filter by scope
    let definitionsToShow = []
    if (currentMetadataScope === 'global') {
      definitionsToShow = allDefinitions.filter(def => def.scope === 'global')
    } else {
      // Map-specific: only show definitions for active map
      definitionsToShow = activeMapId
        ? allDefinitions.filter(def => def.scope === activeMapId)
        : []
    }

    // Render empty state or definitions list
    if (definitionsToShow.length === 0) {
      const emptyMessage = currentMetadataScope === 'global'
        ? 'No global metadata fields defined yet.'
        : activeMapId
          ? 'No map-specific metadata fields for this map.'
          : 'No map is currently active. Open a map to create map-specific fields.'

      metadataContainer.innerHTML = `
        <div class="metadata-empty-state">
          <h5>No Metadata Fields</h5>
          <p>${emptyMessage}</p>
        </div>
      `
    } else {
      const definitionsHtml = definitionsToShow.map(def => {
        const appliesToText = def.appliesTo.map(type => {
          return type.charAt(0).toUpperCase() + type.slice(1)
        }).join(', ')

        const requiredIndicator = def.required
          ? '<span class="metadata-required-indicator">*</span>'
          : ''

        const descriptionHtml = def.description
          ? `<div class="metadata-definition-details">${def.description}</div>`
          : ''

        const optionsHtml = def.fieldType === 'select' && def.options && def.options.length > 0
          ? `<div class="metadata-definition-details"><strong>Options:</strong> ${def.options.join(', ')}</div>`
          : ''

        return `
          <div class="metadata-definition-item" data-definition-id="${def.id}">
            <div class="metadata-definition-header">
              <div class="metadata-definition-title">
                <span class="metadata-definition-name">${def.name}${requiredIndicator}</span>
                <span class="metadata-type-badge type-${def.fieldType}">${def.fieldType}</span>
              </div>
              <div class="metadata-definition-actions">
                <button class="btn btn-sm btn-secondary edit-metadata-def" data-definition-id="${def.id}">
                  ✏️ <span class="btn-text">Edit</span>
                </button>
                <button class="btn btn-sm btn-danger delete-metadata-def" data-definition-id="${def.id}">
                  🗑️ <span class="btn-text">Delete</span>
                </button>
              </div>
            </div>
            ${descriptionHtml}
            <div class="metadata-applies-to"><strong>Applies to:</strong> ${appliesToText}</div>
            ${optionsHtml}
          </div>
        `
      }).join('')

      const sectionTitle = currentMetadataScope === 'global' ? 'Global Fields' : 'Map-Specific Fields'
      metadataContainer.innerHTML = `
        <div class="metadata-definitions-section">
          <h5>${sectionTitle}</h5>
          ${definitionsHtml}
        </div>
      `

      // Add event listeners to edit and delete buttons
      metadataContainer.querySelectorAll('.edit-metadata-def').forEach(btn => {
        btn.addEventListener('click', () => {
          const defId = btn.dataset.definitionId
          if (callbacks.onEditMetadataDefinition) {
            callbacks.onEditMetadataDefinition(defId, () => renderMetadataDefinitions())
          }
        })
      })

      metadataContainer.querySelectorAll('.delete-metadata-def').forEach(btn => {
        btn.addEventListener('click', async () => {
          const defId = btn.dataset.definitionId
          if (callbacks.onDeleteMetadataDefinition) {
            await callbacks.onDeleteMetadataDefinition(defId)
            await renderMetadataDefinitions()
          }
        })
      })
    }
  }

  // Scope toggle functionality
  scopeToggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      scopeToggleButtons.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentMetadataScope = btn.dataset.scope
      renderMetadataDefinitions()
    })
  })

  // Add definition button
  addMetadataDefBtn?.addEventListener('click', async () => {
    if (callbacks.onAddMetadataDefinition) {
      const scope = currentMetadataScope === 'global' ? 'global' : activeMapId
      await callbacks.onAddMetadataDefinition(scope, () => renderMetadataDefinitions())
    }
  })

  // Export definitions button
  exportMetadataDefBtn?.addEventListener('click', async () => {
    if (callbacks.onExportMetadataDefinitions) {
      await callbacks.onExportMetadataDefinitions()
    }
  })

  // Import definitions button
  importMetadataDefBtn?.addEventListener('click', () => {
    importMetadataDefInput?.click()
  })

  importMetadataDefInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (file && callbacks.onImportMetadataDefinitions) {
      await callbacks.onImportMetadataDefinitions(file)
      await renderMetadataDefinitions()
      e.target.value = '' // Reset input
    }
  })

  // Load metadata when metadata tab is activated
  const metadataTabButton = modal.querySelector('.tab-button[data-tab="metadata-settings"]')
  if (metadataTabButton) {
    metadataTabButton.addEventListener('click', () => {
      renderMetadataDefinitions()
    })
  }

  // If metadata tab is the initial tab, load definitions now
  if (initialTab === 'metadata-settings') {
    requestAnimationFrame(() => {
      renderMetadataDefinitions()
    })
  }

  // ========================================
  // Marker Types Tab Functionality
  // ========================================

  const SHAPE_ICONS = {
    circle: '●',
    square: '■',
    diamond: '◆',
    arrow: '▲'
  }

  /**
   * Render the marker types list (built-in, presets, custom)
   */
  const renderMarkerTypes = async () => {
    if (!callbacks.getMarkerTypeDefinitions) return

    const allDefinitions = await callbacks.getMarkerTypeDefinitions()

    // Build enabled IDs set from localStorage
    const enabledIds = new Set(allDefinitions.map(d => d.id))
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('markerType_enabled_')) {
        const typeId = key.slice('markerType_enabled_'.length)
        if (localStorage.getItem(key) === 'false') {
          enabledIds.delete(typeId)
        }
      }
    }

    const builtIns = allDefinitions.filter(d => d.isBuiltIn)
    const presets = allDefinitions.filter(d => d.isPreset && !d.isBuiltIn)
    const customs = allDefinitions.filter(d => !d.isPreset && !d.isBuiltIn)

    // Render built-in section
    const builtinContainer = modal.querySelector('#marker-types-builtin-section')
    if (builtinContainer) {
      builtinContainer.innerHTML = builtIns.length === 0
        ? ''
        : `
        <h5 class="marker-types-section-title">Built-in</h5>
        ${builtIns.map(def => renderMarkerTypeRow(def, true, enabledIds)).join('')}
      `
    }

    // Render presets section
    const presetsContainer = modal.querySelector('#marker-types-presets-container')
    if (presetsContainer) {
      presetsContainer.innerHTML = presets.length === 0
        ? '<p class="text-secondary text-center">No preset types available.</p>'
        : presets.map(def => renderMarkerTypeRow(def, false, enabledIds)).join('')
    }

    // Render custom section
    const customContainer = modal.querySelector('#marker-types-custom-container')
    if (customContainer) {
      customContainer.innerHTML = customs.length === 0
        ? '<p class="text-secondary text-center marker-types-empty">No custom types yet. Add one below.</p>'
        : customs.map(def => renderMarkerTypeRow(def, false, enabledIds)).join('')
    }

    // Refresh default type dropdown
    renderDefaultTypeDropdown(allDefinitions, enabledIds)

    // Wire up event listeners
    wireMarkerTypeEvents()
  }

  /**
   * Render a single marker type row
   */
  const renderMarkerTypeRow = (def, isBuiltIn, enabledIds) => {
    const enabled = enabledIds.has(def.id)
    const shapeIcon = SHAPE_ICONS[def.shape] || '●'
    const displayColor = def.color || '#ef4444'
    const badgeHtml = isBuiltIn
      ? '<span class="marker-type-badge builtin">built-in</span>'
      : (def.isPreset ? '<span class="marker-type-badge preset">preset</span>' : '')

    const toggleDisabled = isBuiltIn ? 'disabled' : ''
    const toggleChecked = enabled ? 'checked' : ''
    // showNumber defaults: undefined → fall back to supportsPhotos (true for photo-capable, false for line-pair)
    const effectiveShowNumber = def.showNumber !== undefined ? def.showNumber : (def.supportsPhotos !== false)
    const showNumberIndicator = effectiveShowNumber
      ? '<span class="marker-type-number-indicator" title="Shows number on map">🔢</span>'
      : ''

    // Built-in colors are contextual (locked/unlocked, has photos), so show "varies" instead of a swatch
    const colorDisplayHtml = isBuiltIn
      ? '<span class="marker-type-color-label" title="Color varies by marker state">varies</span>'
      : `<span class="marker-type-color-swatch" style="background-color: ${displayColor};" title="${displayColor}"></span>`

    const editBtnHtml = isBuiltIn
      ? ''
      : (def.isPreset
          ? ''
          : `<button class="btn btn-sm btn-secondary edit-marker-type" data-type-id="${def.id}">✏️ <span class="btn-text">Edit</span></button>
           <button class="btn btn-sm btn-danger delete-marker-type" data-type-id="${def.id}">🗑️ <span class="btn-text">Delete</span></button>`)

    return `
      <div class="marker-type-row" data-type-id="${def.id}">
        <label class="checkbox-label toggle-switch-label marker-type-toggle-label">
          <input type="checkbox" class="marker-type-toggle" data-type-id="${def.id}" ${toggleChecked} ${toggleDisabled} />
          <span class="toggle-switch-slider"></span>
        </label>
        <span class="marker-type-icon" style="color: ${displayColor};">${shapeIcon}</span>
        <span class="marker-type-name">${def.name}</span>
        ${badgeHtml}
        ${colorDisplayHtml}
        <span class="marker-type-shape-label">${def.shape}</span>
        ${showNumberIndicator}
        <span class="marker-type-actions">
          ${editBtnHtml}
        </span>
      </div>
    `
  }

  /**
   * Render the default marker type dropdown
   */
  const renderDefaultTypeDropdown = (allDefinitions, enabledIds) => {
    const select = modal.querySelector('#default-marker-type-select')
    if (!select) return

    // Only point-behavior types (not line-pair) can be default
    const pointTypes = allDefinitions.filter(d =>
      d.behavior === 'point' && enabledIds.has(d.id)
    )

    const currentDefault = callbacks.getDefaultMarkerTypeId
      ? callbacks.getDefaultMarkerTypeId()
      : 'builtin-photo-marker'

    select.innerHTML = pointTypes.map(def => {
      const selected = def.id === currentDefault ? 'selected' : ''
      return `<option value="${def.id}" ${selected}>${SHAPE_ICONS[def.shape] || '●'} ${def.name}</option>`
    }).join('')

    select.addEventListener('change', () => {
      if (callbacks.onChangeDefaultMarkerType) {
        callbacks.onChangeDefaultMarkerType(select.value)
      }
    })
  }

  /**
   * Wire up event listeners on marker type rows
   */
  const wireMarkerTypeEvents = () => {
    // Toggle switches
    modal.querySelectorAll('.marker-type-toggle:not([disabled])').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const typeId = toggle.dataset.typeId
        const enabled = toggle.checked
        if (callbacks.onToggleMarkerType) {
          callbacks.onToggleMarkerType(typeId, enabled)
          // Re-render to update default type dropdown
          renderMarkerTypes()
        }
      })
    })

    // Edit custom type
    modal.querySelectorAll('.edit-marker-type').forEach(btn => {
      btn.addEventListener('click', () => {
        const typeId = btn.dataset.typeId
        if (callbacks.onEditMarkerType) {
          callbacks.onEditMarkerType(typeId, () => renderMarkerTypes())
        }
      })
    })

    // Delete custom type
    modal.querySelectorAll('.delete-marker-type').forEach(btn => {
      btn.addEventListener('click', async () => {
        const typeId = btn.dataset.typeId
        if (callbacks.onDeleteMarkerType) {
          await callbacks.onDeleteMarkerType(typeId)
          await renderMarkerTypes()
        }
      })
    })
  }

  // Add custom type button
  modal.querySelector('#add-marker-type-btn')?.addEventListener('click', () => {
    if (callbacks.onAddMarkerType) {
      callbacks.onAddMarkerType(() => renderMarkerTypes())
    }
  })

  // Export marker types button (placeholder until Phase 5)
  modal.querySelector('#export-marker-types-btn')?.addEventListener('click', () => {
    if (callbacks.onExportMarkerTypes) {
      callbacks.onExportMarkerTypes()
    } else {
      // Placeholder: show info notification via a generic mechanism
      console.log('Marker type export will be implemented in Phase 5')
    }
  })

  // Import marker types button (placeholder until Phase 5)
  const importMarkerTypesInput = modal.querySelector('#import-marker-types-input')
  modal.querySelector('#import-marker-types-btn')?.addEventListener('click', () => {
    importMarkerTypesInput?.click()
  })

  importMarkerTypesInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (file && callbacks.onImportMarkerTypes) {
      await callbacks.onImportMarkerTypes(file)
      await renderMarkerTypes()
      e.target.value = ''
    } else if (file) {
      console.log('Marker type import will be implemented in Phase 5')
    }
  })

  // Load marker types when tab is activated
  const markerTypesTabButton = modal.querySelector('.tab-button[data-tab="marker-types-settings"]')
  if (markerTypesTabButton) {
    markerTypesTabButton.addEventListener('click', () => {
      renderMarkerTypes()
    })
  }

  // If marker types tab is initial tab, load now
  if (initialTab === 'marker-types-settings') {
    requestAnimationFrame(() => {
      renderMarkerTypes()
    })
  }

  return modal
}
