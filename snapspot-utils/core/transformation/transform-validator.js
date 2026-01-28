/**
 * Transform Validator Module
 *
 * Provides quality metrics and validation for affine transformations.
 * Includes RMSE calculation, anomaly detection, and point distribution analysis.
 *
 * @module transform-validator
 */

import { applyTransform } from './affine-transform.js'

// ============================================================================
// Validation Metrics
// ============================================================================

/**
 * Calculate root mean square error of transformation
 *
 * Measures the average error between transformed source points and their
 * corresponding target points. Lower RMSE indicates better alignment.
 *
 * @param {Array<{source: {x,y}, target: {x,y}}>} referencePairs - Reference point pairs
 * @param {Object} matrix - Transformation matrix {a,b,c,d,e,f}
 * @returns {number} RMSE in pixels
 */
export function calculateRMSE (referencePairs, matrix) {
  if (!referencePairs || referencePairs.length === 0) {
    return 0
  }

  let sumSquaredError = 0

  for (const pair of referencePairs) {
    const transformed = applyTransform(pair.source, matrix)
    const dx = transformed.x - pair.target.x
    const dy = transformed.y - pair.target.y
    sumSquaredError += dx * dx + dy * dy
  }

  return Math.sqrt(sumSquaredError / referencePairs.length)
}

/**
 * Detect transformation anomalies
 *
 * Analyzes transformation matrix for potential issues:
 * - Negative determinant (reflection/mirroring)
 * - Extreme scaling (>5× or <0.2×)
 * - Extreme shear (angle between axes > 60°)
 * - Degenerate matrix (singular/non-invertible)
 *
 * @param {Object} matrix - Transformation matrix {a,b,c,d,e,f}
 * @returns {Object} Anomaly report with warnings and metrics
 */
export function detectAnomalies (matrix) {
  const { a, b, c, d } = matrix
  const det = a * d - b * c

  // Calculate scale factors (length of transformed unit vectors)
  const scaleX = Math.sqrt(a * a + c * c)
  const scaleY = Math.sqrt(b * b + d * d)

  // Calculate shear (normalized dot product of basis vectors)
  // Close to 0 means perpendicular (good), close to 1 means parallel (bad)
  const shear = Math.abs(a * b + c * d) / (scaleX * scaleY)

  // Calculate rotation angle (from X-axis basis vector)
  const rotation = Math.atan2(c, a) * 180 / Math.PI

  return {
    hasNegativeDeterminant: det < 0,
    hasExtremeScale: scaleX > 5 || scaleY > 5 || scaleX < 0.2 || scaleY < 0.2,
    hasExtremeShear: shear > 0.5,
    isDegenerate: Math.abs(det) < 1e-10,
    scaleFactors: {
      x: scaleX,
      y: scaleY
    },
    shearFactor: shear,
    determinant: det,
    rotation
  }
}

/**
 * Validate reference point distribution
 *
 * Checks if reference points are well-distributed across the map.
 * Points that are nearly collinear or clustered produce poor transformations.
 *
 * @param {Array<{x: number, y: number}>} points - Reference points
 * @returns {{isValid: boolean, warning: string|null, areaRatio: number}}
 */
export function validatePointDistribution (points) {
  if (points.length < 3) {
    return { isValid: true, warning: null, areaRatio: 1 }
  }

  // Calculate bounding box area
  const bounds = getBoundingBox(points)
  const maxPossibleArea = bounds.width * bounds.height

  if (maxPossibleArea === 0) {
    return {
      isValid: false,
      warning: 'All reference points are at the same location',
      areaRatio: 0
    }
  }

  // Calculate actual area (convex hull or triangle for 3 points)
  const area = calculatePolygonArea(points)
  const areaRatio = area / maxPossibleArea

  // If area is very small relative to bounding box, points are nearly collinear
  const isValid = areaRatio > 0.1
  const warning = isValid
    ? null
    : 'Reference points are nearly collinear - add points further apart'

  return {
    isValid,
    warning,
    areaRatio
  }
}

/**
 * Suggest areas for additional reference points
 *
 * Analyzes current point distribution and recommends locations for
 * additional points to improve transformation accuracy.
 *
 * @param {Array<{x: number, y: number}>} currentPoints - Existing reference points
 * @param {{width: number, height: number}} bounds - Map dimensions
 * @returns {Array<{x: number, y: number, reason: string}>} Suggested locations
 */
export function suggestAdditionalPoints (currentPoints, bounds) {
  if (!currentPoints || currentPoints.length === 0) {
    // Suggest corners for first points
    return [
      { x: 0, y: 0, reason: 'Top-left corner (origin)' },
      { x: bounds.width, y: 0, reason: 'Top-right corner' },
      { x: 0, y: bounds.height, reason: 'Bottom-left corner' }
    ]
  }

  const suggestions = []

  // Divide map into quadrants
  const midX = bounds.width / 2
  const midY = bounds.height / 2

  const quadrants = [
    { name: 'top-left', minX: 0, maxX: midX, minY: 0, maxY: midY },
    { name: 'top-right', minX: midX, maxX: bounds.width, minY: 0, maxY: midY },
    { name: 'bottom-left', minX: 0, maxX: midX, minY: midY, maxY: bounds.height },
    { name: 'bottom-right', minX: midX, maxX: bounds.width, minY: midY, maxY: bounds.height }
  ]

  // Find empty quadrants
  for (const quad of quadrants) {
    const hasPoint = currentPoints.some(
      p => p.x >= quad.minX && p.x <= quad.maxX &&
           p.y >= quad.minY && p.y <= quad.maxY
    )

    if (!hasPoint) {
      const centerX = (quad.minX + quad.maxX) / 2
      const centerY = (quad.minY + quad.maxY) / 2
      suggestions.push({
        x: centerX,
        y: centerY,
        reason: `No points in ${quad.name} quadrant`
      })
    }
  }

  // If all quadrants covered, suggest corners if missing
  if (suggestions.length === 0) {
    const corners = [
      { x: 0, y: 0, name: 'top-left corner' },
      { x: bounds.width, y: 0, name: 'top-right corner' },
      { x: 0, y: bounds.height, name: 'bottom-left corner' },
      { x: bounds.width, y: bounds.height, name: 'bottom-right corner' }
    ]

    const threshold = Math.min(bounds.width, bounds.height) * 0.1

    for (const corner of corners) {
      const hasNearbyPoint = currentPoints.some(
        p => Math.abs(p.x - corner.x) < threshold &&
             Math.abs(p.y - corner.y) < threshold
      )

      if (!hasNearbyPoint) {
        suggestions.push({
          x: corner.x,
          y: corner.y,
          reason: `Add point near ${corner.name} for better coverage`
        })
      }
    }
  }

  return suggestions
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get bounding box of points
 * @private
 * @param {Array<{x: number, y: number}>} points
 * @returns {{minX: number, minY: number, maxX: number, maxY: number, width: number, height: number}}
 */
function getBoundingBox (points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Calculate area of polygon using shoelace formula
 * @private
 * @param {Array<{x: number, y: number}>} points
 * @returns {number} Absolute area
 */
function calculatePolygonArea (points) {
  if (points.length < 3) return 0

  // For 3 points, calculate triangle area directly
  if (points.length === 3) {
    const [p1, p2, p3] = points
    const area = Math.abs(
      (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
    ) / 2
    return area
  }

  // For more points, use convex hull area (shoelace formula)
  // Simple convex hull using gift wrapping algorithm
  const hull = convexHull(points)

  let area = 0
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length
    area += hull[i].x * hull[j].y
    area -= hull[j].x * hull[i].y
  }

  return Math.abs(area) / 2
}

/**
 * Calculate convex hull using gift wrapping algorithm
 * @private
 * @param {Array<{x: number, y: number}>} points
 * @returns {Array<{x: number, y: number}>} Hull points in order
 */
function convexHull (points) {
  if (points.length < 3) return points

  // Find leftmost point
  let leftmost = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].x < points[leftmost].x ||
        (points[i].x === points[leftmost].x && points[i].y < points[leftmost].y)) {
      leftmost = i
    }
  }

  const hull = []
  let current = leftmost

  do {
    hull.push(points[current])
    let next = 0

    for (let i = 0; i < points.length; i++) {
      if (i === current) continue

      const cross = crossProduct(
        points[current],
        points[i],
        points[next]
      )

      if (next === current || cross > 0 ||
          (cross === 0 && distance(points[current], points[i]) >
                          distance(points[current], points[next]))) {
        next = i
      }
    }

    current = next
  } while (current !== leftmost && hull.length < points.length)

  return hull
}

/**
 * Calculate cross product for three points
 * @private
 * @param {{x,y}} o - Origin point
 * @param {{x,y}} a - Point A
 * @param {{x,y}} b - Point B
 * @returns {number} Cross product (o->a) × (o->b)
 */
function crossProduct (o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

/**
 * Calculate Euclidean distance between two points
 * @private
 * @param {{x,y}} p1
 * @param {{x,y}} p2
 * @returns {number} Distance
 */
function distance (p1, p2) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}
