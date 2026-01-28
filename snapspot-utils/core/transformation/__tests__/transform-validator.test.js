/**
 * Unit Tests for Transform Validator Module
 *
 * Tests RMSE calculation, anomaly detection, and point distribution validation.
 */

import {
  calculateRMSE,
  detectAnomalies,
  validatePointDistribution,
  suggestAdditionalPoints
} from '../transform-validator.js'

import { calculateAffineMatrix } from '../affine-transform.js'

// ============================================================================
// Test Utilities
// ============================================================================

function assertClose (actual, expected, epsilon = 1e-6, message = '') {
  const diff = Math.abs(actual - expected)
  if (diff > epsilon) {
    throw new Error(
      `${message}\nExpected: ${expected}\nActual: ${actual}\nDifference: ${diff}`
    )
  }
}

function assertTrue (condition, message = '') {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertFalse (condition, message = '') {
  if (condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function test (name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(`  ${error.message}`)
    throw error
  }
}

// ============================================================================
// RMSE Calculation Tests
// ============================================================================

test('calculateRMSE returns 0 for perfect transformation', () => {
  const pairs = [
    { source: { x: 0, y: 0 }, target: { x: 10, y: 20 } },
    { source: { x: 100, y: 0 }, target: { x: 110, y: 20 } },
    { source: { x: 0, y: 100 }, target: { x: 10, y: 120 } }
  ]

  const { matrix } = calculateAffineMatrix(
    pairs.map(p => p.source),
    pairs.map(p => p.target)
  )

  const rmse = calculateRMSE(pairs, matrix)

  assertClose(rmse, 0, 1e-6, 'RMSE should be 0 for perfect fit')
})

test('calculateRMSE calculates correct error', () => {
  // Create transformation that perfectly fits first 3 points
  const source = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]
  const target = [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 10, y: 120 }
  ]

  const { matrix } = calculateAffineMatrix(source, target)

  // Add a point with known error
  const pairs = [
    { source: { x: 0, y: 0 }, target: { x: 10, y: 20 } },
    { source: { x: 100, y: 0 }, target: { x: 110, y: 20 } },
    { source: { x: 0, y: 100 }, target: { x: 10, y: 120 } },
    { source: { x: 50, y: 50 }, target: { x: 62, y: 72 } } // 2px off in each direction
  ]

  const rmse = calculateRMSE(pairs, matrix)

  // Expected: sqrt((0² + 0² + 0² + (2² + 2²)) / 4) = sqrt(8/4) = sqrt(2) ≈ 1.414
  assertClose(rmse, Math.sqrt(2), 1e-3, 'RMSE should be sqrt(2)')
})

test('calculateRMSE handles empty array', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const rmse = calculateRMSE([], matrix)

  assertClose(rmse, 0, 1e-6, 'RMSE should be 0 for empty array')
})

// ============================================================================
// Anomaly Detection Tests
// ============================================================================

test('detectAnomalies identifies identity transformation', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const anomalies = detectAnomalies(matrix)

  assertFalse(anomalies.hasNegativeDeterminant, 'Should not have negative determinant')
  assertFalse(anomalies.hasExtremeScale, 'Should not have extreme scale')
  assertFalse(anomalies.hasExtremeShear, 'Should not have extreme shear')
  assertFalse(anomalies.isDegenerate, 'Should not be degenerate')
  assertClose(anomalies.scaleFactors.x, 1, 1e-6, 'X scale should be 1')
  assertClose(anomalies.scaleFactors.y, 1, 1e-6, 'Y scale should be 1')
  assertClose(anomalies.determinant, 1, 1e-6, 'Determinant should be 1')
})

test('detectAnomalies identifies reflection (negative determinant)', () => {
  const matrix = { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } // Reflection in X
  const anomalies = detectAnomalies(matrix)

  assertTrue(anomalies.hasNegativeDeterminant, 'Should detect negative determinant')
})

test('detectAnomalies identifies extreme scaling', () => {
  const matrix1 = { a: 10, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const anomalies1 = detectAnomalies(matrix1)
  assertTrue(anomalies1.hasExtremeScale, 'Should detect large scale (10×)')

  const matrix2 = { a: 0.1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const anomalies2 = detectAnomalies(matrix2)
  assertTrue(anomalies2.hasExtremeScale, 'Should detect small scale (0.1×)')
})

test('detectAnomalies calculates scale factors correctly', () => {
  const matrix = { a: 3, b: 0, c: 0, d: 2, e: 0, f: 0 }
  const anomalies = detectAnomalies(matrix)

  assertClose(anomalies.scaleFactors.x, 3, 1e-6, 'X scale should be 3')
  assertClose(anomalies.scaleFactors.y, 2, 1e-6, 'Y scale should be 2')
})

test('detectAnomalies identifies degenerate matrix', () => {
  const matrix = { a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 } // det = 0
  const anomalies = detectAnomalies(matrix)

  assertTrue(anomalies.isDegenerate, 'Should detect degenerate matrix')
})

test('detectAnomalies calculates rotation angle', () => {
  // 90-degree rotation: a=0, c=1 (counterclockwise)
  const matrix = { a: 0, b: -1, c: 1, d: 0, e: 0, f: 0 }
  const anomalies = detectAnomalies(matrix)

  assertClose(Math.abs(anomalies.rotation), 90, 1, 'Rotation should be ~90 degrees')
})

// ============================================================================
// Point Distribution Validation Tests
// ============================================================================

test('validatePointDistribution accepts well-distributed points', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]

  const result = validatePointDistribution(points)

  assertTrue(result.isValid, 'Should accept triangle points')
  assertTrue(result.warning === null, 'Should have no warning')
  assertTrue(result.areaRatio > 0.1, 'Area ratio should be > 0.1')
})

test('validatePointDistribution detects collinear points', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 200 }
  ]

  const result = validatePointDistribution(points)

  assertFalse(result.isValid, 'Should reject collinear points')
  assertTrue(result.warning !== null, 'Should have warning')
  assertTrue(result.warning.includes('collinear'), 'Warning should mention collinearity')
})

test('validatePointDistribution detects duplicate points', () => {
  const points = [
    { x: 50, y: 50 },
    { x: 50, y: 50 },
    { x: 50, y: 50 }
  ]

  const result = validatePointDistribution(points)

  assertFalse(result.isValid, 'Should reject duplicate points')
})

test('validatePointDistribution accepts fewer than 3 points', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 100 }
  ]

  const result = validatePointDistribution(points)

  assertTrue(result.isValid, 'Should accept < 3 points without validation')
})

test('validatePointDistribution handles square distribution', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ]

  const result = validatePointDistribution(points)

  assertTrue(result.isValid, 'Should accept square distribution')
  assertClose(result.areaRatio, 1, 0.01, 'Square should fill entire bounding box')
})

test('validatePointDistribution handles L-shape distribution', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]

  const result = validatePointDistribution(points)

  assertTrue(result.isValid, 'Should accept L-shape')
  // Triangle area = 0.5 * 100 * 100 = 5000
  // Bounding box = 100 * 100 = 10000
  // Ratio = 0.5
  assertClose(result.areaRatio, 0.5, 0.01, 'Triangle should be half of bounding box')
})

// ============================================================================
// Point Suggestion Tests
// ============================================================================

test('suggestAdditionalPoints suggests corners for empty points', () => {
  const bounds = { width: 1000, height: 800 }
  const suggestions = suggestAdditionalPoints([], bounds)

  assertTrue(suggestions.length >= 3, 'Should suggest at least 3 points')
  assertTrue(suggestions.some(s => s.x === 0 && s.y === 0), 'Should suggest top-left')
  assertTrue(suggestions.some(s => s.x === bounds.width && s.y === 0), 'Should suggest top-right')
})

test('suggestAdditionalPoints identifies empty quadrants', () => {
  const bounds = { width: 1000, height: 800 }
  const points = [
    { x: 100, y: 100 } // Only in top-left quadrant
  ]

  const suggestions = suggestAdditionalPoints(points, bounds)

  // Should suggest points in other 3 quadrants
  assertTrue(suggestions.length >= 3, 'Should suggest points for empty quadrants')
  assertTrue(
    suggestions.some(s => s.reason.includes('top-right') ||
                          s.reason.includes('bottom-left') ||
                          s.reason.includes('bottom-right')),
    'Should mention empty quadrants'
  )
})

test('suggestAdditionalPoints suggests corners when quadrants are covered', () => {
  const bounds = { width: 1000, height: 800 }
  const points = [
    { x: 250, y: 200 }, // Top-left quadrant
    { x: 750, y: 200 }, // Top-right quadrant
    { x: 250, y: 600 }, // Bottom-left quadrant
    { x: 750, y: 600 } // Bottom-right quadrant
  ]

  const suggestions = suggestAdditionalPoints(points, bounds)

  // Should suggest corners since all quadrants have points
  assertTrue(suggestions.length > 0, 'Should suggest some points')
  assertTrue(
    suggestions.some(s => s.reason.includes('corner')),
    'Should suggest corners'
  )
})

test('suggestAdditionalPoints handles null/undefined points', () => {
  const bounds = { width: 1000, height: 800 }
  const suggestions = suggestAdditionalPoints(null, bounds)

  assertTrue(suggestions.length > 0, 'Should return suggestions for null points')
})

// ============================================================================
// Integration Tests
// ============================================================================

test('Full workflow: transform + validate quality', () => {
  // Create a good transformation
  const source = [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1000, y: 800 },
    { x: 0, y: 800 }
  ]
  const target = [
    { x: 10, y: 20 },
    { x: 1010, y: 20 },
    { x: 1010, y: 820 },
    { x: 10, y: 820 }
  ]

  const { matrix } = calculateAffineMatrix(source, target)

  const pairs = source.map((s, i) => ({ source: s, target: target[i] }))
  const rmse = calculateRMSE(pairs, matrix)
  const anomalies = detectAnomalies(matrix)
  const distribution = validatePointDistribution(source)

  // Verify quality
  assertClose(rmse, 0, 1e-6, 'RMSE should be near 0')
  assertFalse(anomalies.hasExtremeScale, 'Should not have extreme scale')
  assertFalse(anomalies.isDegenerate, 'Should not be degenerate')
  assertTrue(distribution.isValid, 'Distribution should be valid')
})

test('Full workflow: detect problematic transformation', () => {
  // Create collinear points (bad)
  const source = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 200 }
  ]
  const target = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 200, y: 0 }
  ]

  const { matrix, isDegenerate } = calculateAffineMatrix(source, target)
  const distribution = validatePointDistribution(source)

  // Should detect problems
  assertTrue(isDegenerate, 'Matrix should be degenerate')
  assertFalse(distribution.isValid, 'Distribution should be invalid')
  assertTrue(distribution.warning.includes('collinear'), 'Should warn about collinearity')
})

// ============================================================================
// Note: Tests run automatically when this module is imported
// The test runner captures console output to display results
// ============================================================================
