/**
 * SnapSpot PWA - Line Marker Details Modal
 */

/* global document, DOMParser, requestAnimationFrame, confirm */

const LINE_COLORS = [
  { name: 'Red', value: '#e53e3e' },
  { name: 'Orange', value: '#dd6b20' },
  { name: 'Yellow', value: '#d69e2e' },
  { name: 'Green', value: '#38a169' },
  { name: 'Blue', value: '#3182ce' },
  { name: 'Purple', value: '#805ad5' }
]

export function createLineMarkerDetailsModal (modalManager, markerData, callbacks = {}) {
  const {
    onSave,
    onDeletePair,
    onClose
  } = callbacks

  const markerColor = markerData.lineColor || '#e53e3e'
  const markerCaption = markerData.lineCaption || ''
  const markerLabel = markerData.description || ''

  const swatchesHtml = LINE_COLORS.map(color => {
    const isSelected = color.value.toLowerCase() === markerColor.toLowerCase()
    return `
      <button
        class="line-color-swatch ${isSelected ? 'is-selected' : ''}"
        type="button"
        data-line-color="${color.value}"
        aria-label="${color.name}"
        title="${color.name}"
      ></button>
    `
  }).join('')

  const modalHtml = `
    <div class="modal" id="line-marker-details-modal" data-marker-id="${markerData.id}">
      <div class="modal-backdrop"></div>
      <div class="modal-content line-marker-modal">
        <div class="modal-header">
          <h3><span class="line-marker-icon" aria-hidden="true">◆</span> Line Marker Details</h3>
          <button class="modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="line-marker-form-group">
            <label for="line-marker-label">Line label</label>
            <div class="line-marker-inline">
              <input id="line-marker-label" type="text" class="form-control" maxlength="120" value="${escapeHtml(markerLabel)}" />
            </div>
          </div>

          <div class="line-marker-form-group">
            <label>Colour</label>
            <div class="line-color-swatches" id="line-color-swatches">
              ${swatchesHtml}
            </div>
            <div class="line-marker-inline mt-sm">
              <input id="line-marker-color-input" type="color" value="${markerColor}" aria-label="Custom line colour" />
            </div>
          </div>

          <div class="line-marker-form-group">
            <label for="line-marker-caption">Caption</label>
            <div class="line-marker-inline">
              <input id="line-marker-caption" type="text" class="form-control" maxlength="40" value="${escapeHtml(markerCaption)}" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="modal-actions">
            <button class="btn btn-primary" type="button" id="btn-save-line-details">💾 Save</button>
            <button class="btn btn-danger" type="button" id="btn-delete-line-pair">🗑️ Delete Pair</button>
          </div>
        </div>
      </div>
    </div>
  `

  const parser = new DOMParser()
  const modalDoc = parser.parseFromString(modalHtml, 'text/html')
  const modal = modalDoc.querySelector('.modal')

  if (!modal) {
    if (onClose) onClose()
    return null
  }

  document.body.appendChild(modal)
  modalManager.activeModals.add(modal)

  const closeModal = () => {
    modalManager.closeModal(modal)
    if (onClose) onClose()
  }

  const labelInput = modal.querySelector('#line-marker-label')
  const captionInput = modal.querySelector('#line-marker-caption')
  const colorInput = modal.querySelector('#line-marker-color-input')

  const getSelectedColor = () => {
    return colorInput.value || '#e53e3e'
  }

  const setSelectedSwatch = (selectedColor) => {
    const normalized = selectedColor.toLowerCase()
    modal.querySelectorAll('.line-color-swatch').forEach(swatch => {
      swatch.classList.toggle('is-selected', swatch.dataset.lineColor.toLowerCase() === normalized)
    })
  }

  modal.querySelector('.modal-close')?.addEventListener('click', closeModal)
  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal)

  modal.querySelectorAll('.line-color-swatch').forEach(swatch => {
    const swatchColor = swatch.dataset.lineColor
    swatch.style.backgroundColor = swatchColor
    swatch.addEventListener('click', () => {
      colorInput.value = swatchColor
      setSelectedSwatch(swatchColor)
    })
  })

  colorInput.addEventListener('input', () => {
    setSelectedSwatch(colorInput.value)
  })

  modal.querySelector('#btn-save-line-details')?.addEventListener('click', async () => {
    if (onSave) {
      const saveResult = await onSave(markerData.id, {
        description: labelInput.value.trim(),
        lineColor: getSelectedColor(),
        lineCaption: captionInput.value.trim()
      })
      if (saveResult !== false) {
        closeModal()
      }
    }
  })

  modal.querySelector('#btn-delete-line-pair')?.addEventListener('click', () => {
    if (onDeletePair && confirm('Are you sure you want to delete this line pair? This cannot be undone.')) {
      onDeletePair(markerData.id)
    }
  })

  requestAnimationFrame(() => {
    modal.classList.add('show')
  })

  return modal
}

function escapeHtml (value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
