/**
 * SnapSpot Export Splitter
 *
 * Provides functionality to split and filter SnapSpot exports by date and other criteria.
 *
 * @module snapspot-data/splitter
 */

/**
 * Group markers by creation date (day)
 *
 * @param {Array<Object>} markers - Array of marker objects
 * @returns {Object} Object with date keys (YYYY-MM-DD) and marker arrays as values
 *
 * @example
 * const grouped = groupMarkersByDay(markers)
 * // => {
 * //   '2026-01-15': [marker1, marker2],
 * //   '2026-01-20': [marker3]
 * // }
 */
export function groupMarkersByDay (markers) {
  if (!Array.isArray(markers)) {
    throw new Error('Markers must be an array')
  }

  const grouped = {}

  markers.forEach(marker => {
    const createdDate = marker.createdDate instanceof Date
      ? marker.createdDate
      : new Date(marker.createdDate)

    const dateKey = createdDate.toISOString().slice(0, 10) // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }

    grouped[dateKey].push(marker)
  })

  return grouped
}

/**
 * Filter markers by date range
 *
 * @param {Array<Object>} markers - Array of marker objects
 * @param {Date|string} startDate - Start date (inclusive)
 * @param {Date|string} endDate - End date (inclusive)
 * @returns {Array<Object>} Filtered markers
 *
 * @example
 * const filtered = filterMarkersByDateRange(markers, '2026-01-01', '2026-01-31')
 */
export function filterMarkersByDateRange (markers, startDate, endDate) {
  if (!Array.isArray(markers)) {
    throw new Error('Markers must be an array')
  }

  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date range')
  }

  return markers.filter(marker => {
    const createdDate = marker.createdDate instanceof Date
      ? marker.createdDate
      : new Date(marker.createdDate)

    return createdDate >= start && createdDate <= end
  })
}

/**
 * Filter markers by specific dates
 *
 * @param {Array<Object>} markers - Array of marker objects
 * @param {Array<string>} dates - Array of date strings (YYYY-MM-DD)
 * @returns {Array<Object>} Filtered markers
 *
 * @example
 * const filtered = filterMarkersByDates(markers, ['2026-01-15', '2026-01-20'])
 */
export function filterMarkersByDates (markers, dates) {
  if (!Array.isArray(markers)) {
    throw new Error('Markers must be an array')
  }

  if (!Array.isArray(dates) || dates.length === 0) {
    return []
  }

  const dateSet = new Set(dates)

  return markers.filter(marker => {
    const createdDate = marker.createdDate instanceof Date
      ? marker.createdDate
      : new Date(marker.createdDate)

    const dateKey = createdDate.toISOString().slice(0, 10)
    return dateSet.has(dateKey)
  })
}

/**
 * Filter photos by marker IDs
 *
 * @param {Array<Object>} photos - Array of photo objects
 * @param {Array<string>} markerIds - Array of marker IDs to include
 * @returns {Array<Object>} Filtered photos
 *
 * @example
 * const filtered = filterPhotosByMarkers(allPhotos, ['marker1', 'marker2'])
 */
export function filterPhotosByMarkers (photos, markerIds) {
  if (!Array.isArray(photos)) {
    throw new Error('Photos must be an array')
  }

  if (!Array.isArray(markerIds)) {
    throw new Error('Marker IDs must be an array')
  }

  const markerIdSet = new Set(markerIds)

  return photos.filter(photo => markerIdSet.has(photo.markerId))
}

/**
 * Split export into multiple exports by date
 *
 * Creates separate export objects for each date, each containing:
 * - Full map data (shared across all splits)
 * - Markers created on that date
 * - Photos associated with those markers
 *
 * @param {Object} exportData - Complete export object
 * @param {Array<string>} dates - Array of date strings (YYYY-MM-DD)
 * @returns {Array<Object>} Array of export objects, one per date
 *
 * @example
 * const splits = splitByDates(exportData, ['2026-01-15', '2026-01-20'])
 * // =>[
 * //   { map, markers: [...], photos: [...] },  // 2026-01-15
 * //   { map, markers: [...], photos: [...] }   // 2026-01-20
 * // ]
 */
export function splitByDates (exportData, dates) {
  if (!exportData || !exportData.map || !exportData.markers || !exportData.photos) {
    throw new Error('Invalid export data: missing required fields')
  }

  if (!Array.isArray(dates) || dates.length === 0) {
    throw new Error('Dates array is required and must not be empty')
  }

  const splits = []

  for (const dateKey of dates) {
    // Filter markers for this date
    const markersForDate = filterMarkersByDates(exportData.markers, [dateKey])

    if (markersForDate.length === 0) {
      console.warn(`Splitter: No markers found for date ${dateKey}`)
      continue
    }

    // Get marker IDs for filtering photos
    const markerIds = markersForDate.map(m => m.id)

    // Filter photos for these markers
    const photosForDate = filterPhotosByMarkers(exportData.photos, markerIds)

    // Create split export object
    const splitExport = {
      version: exportData.version,
      type: exportData.type,
      sourceApp: exportData.sourceApp,
      timestamp: new Date().toISOString(),
      map: { ...exportData.map }, // Shared map data
      markers: markersForDate,
      photos: photosForDate,
      metadata: {
        ...exportData.metadata,
        splitDate: dateKey,
        originalTimestamp: exportData.timestamp
      }
    }

    splits.push(splitExport)
  }

  console.log(`Splitter: Created ${splits.length} splits from ${dates.length} dates`)

  return splits
}

/**
 * Get date range summary for export
 *
 * @param {Object} exportData - Export object
 * @returns {Object} Date range information
 * @returns {string} return.earliestDate - Earliest marker date (YYYY-MM-DD)
 * @returns {string} return.latestDate - Latest marker date (YYYY-MM-DD)
 * @returns {Array<string>} return.allDates - All unique dates (sorted)
 * @returns {number} return.totalDays - Total number of unique days
 *
 * @example
 * const summary = getDateRangeSummary(exportData)
 * console.log(`Markers span ${summary.totalDays} days`)
 */
export function getDateRangeSummary (exportData) {
  if (!exportData || !exportData.markers) {
    throw new Error('Invalid export data: missing markers')
  }

  if (exportData.markers.length === 0) {
    return {
      earliestDate: null,
      latestDate: null,
      allDates: [],
      totalDays: 0
    }
  }

  const grouped = groupMarkersByDay(exportData.markers)
  const allDates = Object.keys(grouped).sort()

  return {
    earliestDate: allDates[0],
    latestDate: allDates[allDates.length - 1],
    allDates,
    totalDays: allDates.length
  }
}

/**
 * Filter export by date range, returning a new export object
 *
 * @param {Object} exportData - Export object to filter
 * @param {Date|string} startDate - Start date (inclusive)
 * @param {Date|string} endDate - End date (inclusive)
 * @returns {Object} New filtered export object
 *
 * @example
 * const filtered = filterExportByDateRange(exportData, '2026-01-01', '2026-01-31')
 */
export function filterExportByDateRange (exportData, startDate, endDate) {
  if (!exportData || !exportData.map || !exportData.markers || !exportData.photos) {
    throw new Error('Invalid export data: missing required fields')
  }

  const filteredMarkers = filterMarkersByDateRange(exportData.markers, startDate, endDate)
  const markerIds = filteredMarkers.map(m => m.id)
  const filteredPhotos = filterPhotosByMarkers(exportData.photos, markerIds)

  return {
    ...exportData,
    markers: filteredMarkers,
    photos: filteredPhotos,
    timestamp: new Date().toISOString(),
    metadata: {
      ...exportData.metadata,
      filteredDateRange: {
        start: startDate instanceof Date ? startDate.toISOString() : startDate,
        end: endDate instanceof Date ? endDate.toISOString() : endDate
      },
      originalTimestamp: exportData.timestamp
    }
  }
}
