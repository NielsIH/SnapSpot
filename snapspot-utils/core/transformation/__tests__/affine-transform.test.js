/**
 * Unit Tests for Affine Transform Module
 *
 * Tests transformation calculation, point transformation, and edge cases.
 */

import {
  calculateAffineMatrix,
  applyTransform,
  batchTransform,
  inverseTransform
} from '../affine-transform.js'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Assert that a number is close to expected value (within epsilon)
 */
function assertClose (actual, expected, epsilon = 1e-6, message = '') {
  const diff = Math.abs(actual - expected)
  if (diff > epsilon) {
    throw new Error(
      `${message}\nExpected: ${expected}\nActual: ${actual}\nDifference: ${diff}`
    )
  }
}

/**
 * Assert that point coordinates are close to expected values
 */
function assertPointClose (actual, expected, epsilon = 1e-6, message = '') {
  assertClose(actual.x, expected.x, epsilon, `${message} (x coordinate)`)
  assertClose(actual.y, expected.y, epsilon, `${message} (y coordinate)`)
}

/**
 * Run a test case
 */
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
// Identity Transformation Tests
// ============================================================================

test('Identity transformation (same points)', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]

  const result = calculateAffineMatrix(points, points)

  assertClose(result.matrix.a, 1, 1e-6, 'a should be 1')
  assertClose(result.matrix.d, 1, 1e-6, 'd should be 1')
  assertClose(result.matrix.b, 0, 1e-6, 'b should be 0')
  assertClose(result.matrix.c, 0, 1e-6, 'c should be 0')
  assertClose(result.matrix.e, 0, 1e-6, 'e should be 0')
  assertClose(result.matrix.f, 0, 1e-6, 'f should be 0')
  assertClose(result.determinant, 1, 1e-6, 'determinant should be 1')
})

// ============================================================================
// Translation Tests
// ============================================================================

test('Pure translation (10, 20)', () => {
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

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, 1, 1e-6, 'a should be 1 (no X scaling)')
  assertClose(result.matrix.d, 1, 1e-6, 'd should be 1 (no Y scaling)')
  assertClose(result.matrix.b, 0, 1e-6, 'b should be 0 (no shear)')
  assertClose(result.matrix.c, 0, 1e-6, 'c should be 0 (no shear)')
  assertClose(result.matrix.e, 10, 1e-6, 'e should be 10 (X offset)')
  assertClose(result.matrix.f, 20, 1e-6, 'f should be 20 (Y offset)')
})

test('Negative translation (-50, -30)', () => {
  const source = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 100, y: 200 }
  ]
  const target = [
    { x: 50, y: 70 },
    { x: 150, y: 70 },
    { x: 50, y: 170 }
  ]

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.e, -50, 1e-6, 'e should be -50')
  assertClose(result.matrix.f, -30, 1e-6, 'f should be -30')
})

// ============================================================================
// Scaling Tests
// ============================================================================

test('Uniform scaling (2×)', () => {
  const source = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]
  const target = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 0, y: 200 }
  ]

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, 2, 1e-6, 'a should be 2 (X scale)')
  assertClose(result.matrix.d, 2, 1e-6, 'd should be 2 (Y scale)')
  assertClose(result.determinant, 4, 1e-6, 'determinant should be 4 (scale²)')
})

test('Non-uniform scaling (3×, 0.5×)', () => {
  const source = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]
  const target = [
    { x: 0, y: 0 },
    { x: 300, y: 0 },
    { x: 0, y: 50 }
  ]

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, 3, 1e-6, 'a should be 3')
  assertClose(result.matrix.d, 0.5, 1e-6, 'd should be 0.5')
})

test('Scaling with translation', () => {
  const source = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]
  const target = [
    { x: 10, y: 20 },
    { x: 210, y: 20 },
    { x: 10, y: 220 }
  ]

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, 2, 1e-6, 'a should be 2')
  assertClose(result.matrix.d, 2, 1e-6, 'd should be 2')
  assertClose(result.matrix.e, 10, 1e-6, 'e should be 10')
  assertClose(result.matrix.f, 20, 1e-6, 'f should be 20')
})

// ============================================================================
// Rotation Tests
// ============================================================================

test('90-degree rotation (counterclockwise)', () => {
  const source = [
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 }
  ]
  const target = [
    { x: 0, y: 1 },
    { x: 0, y: 0 },
    { x: -1, y: 0 }
  ]

  const result = calculateAffineMatrix(source, target)
  const transformed = applyTransform({ x: 1, y: 0 }, result.matrix)

  assertPointClose(transformed, { x: 0, y: 1 }, 1e-6, '(1,0) should map to (0,1)')
})

test('180-degree rotation', () => {
  const source = [
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 }
  ]
  const target = [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: -1 }
  ]

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, -1, 1e-6, 'a should be -1')
  assertClose(result.matrix.d, -1, 1e-6, 'd should be -1')
})

test('45-degree rotation approximation', () => {
  const cos45 = Math.cos(Math.PI / 4)
  const sin45 = Math.sin(Math.PI / 4)

  const source = [
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 }
  ]
  const target = [
    { x: cos45, y: sin45 },
    { x: 0, y: 0 },
    { x: -sin45, y: cos45 }
  ]

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, cos45, 1e-6, 'a should be cos(45°)')
  assertClose(result.matrix.c, sin45, 1e-6, 'c should be sin(45°)')
})

// ============================================================================
// Point Transformation Tests
// ============================================================================

test('applyTransform with identity matrix', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const point = { x: 123, y: 456 }
  const result = applyTransform(point, matrix)

  assertPointClose(result, point, 1e-6, 'Point should remain unchanged')
})

test('applyTransform with translation', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }
  const point = { x: 5, y: 8 }
  const result = applyTransform(point, matrix)

  assertPointClose(result, { x: 15, y: 28 }, 1e-6, 'Point should translate')
})

test('applyTransform with scaling', () => {
  const matrix = { a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 }
  const point = { x: 10, y: 20 }
  const result = applyTransform(point, matrix)

  assertPointClose(result, { x: 20, y: 60 }, 1e-6, 'Point should scale')
})

// ============================================================================
// Batch Transform Tests
// ============================================================================

test('batchTransform handles multiple points', () => {
  const matrix = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 }
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 20 },
    { x: -5, y: 15 }
  ]

  const results = batchTransform(points, matrix)

  assertPointClose(results[0], { x: 10, y: 20 }, 1e-6, 'First point')
  assertPointClose(results[1], { x: 30, y: 60 }, 1e-6, 'Second point')
  assertPointClose(results[2], { x: 0, y: 50 }, 1e-6, 'Third point')
})

test('batchTransform returns array of same length', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const points = new Array(100).fill(0).map((_, i) => ({ x: i, y: i * 2 }))

  const results = batchTransform(points, matrix)

  if (results.length !== points.length) {
    throw new Error(`Expected ${points.length} results, got ${results.length}`)
  }
})

// ============================================================================
// Inverse Transform Tests
// ============================================================================

test('inverseTransform of identity is identity', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const inverse = inverseTransform(matrix)

  assertClose(inverse.a, 1, 1e-6, 'inverse a')
  assertClose(inverse.d, 1, 1e-6, 'inverse d')
  assertClose(inverse.e, 0, 1e-6, 'inverse e')
  assertClose(inverse.f, 0, 1e-6, 'inverse f')
})

test('inverseTransform reverses translation', () => {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }
  const inverse = inverseTransform(matrix)

  assertClose(inverse.e, -10, 1e-6, 'inverse e should be -10')
  assertClose(inverse.f, -20, 1e-6, 'inverse f should be -20')
})

test('inverseTransform reverses scaling', () => {
  const matrix = { a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 }
  const inverse = inverseTransform(matrix)

  assertClose(inverse.a, 0.5, 1e-6, 'inverse a should be 1/2')
  assertClose(inverse.d, 1 / 3, 1e-6, 'inverse d should be 1/3')
})

test('inverseTransform composition returns identity', () => {
  const source = [
    { x: 10, y: 20 },
    { x: 100, y: 50 },
    { x: 30, y: 150 }
  ]
  const target = [
    { x: 25, y: 45 },
    { x: 215, y: 105 },
    { x: 65, y: 305 }
  ]

  const { matrix } = calculateAffineMatrix(source, target)
  const inverse = inverseTransform(matrix)

  // Apply forward then inverse transformation
  const point = { x: 50, y: 75 }
  const forward = applyTransform(point, matrix)
  const back = applyTransform(forward, inverse)

  assertPointClose(back, point, 1e-6, 'Should return to original point')
})

test('inverseTransform throws on singular matrix', () => {
  const matrix = { a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 } // det = 0

  try {
    inverseTransform(matrix)
    throw new Error('Should have thrown error for singular matrix')
  } catch (error) {
    if (!error.message.includes('singular')) {
      throw error
    }
  }
})

// ============================================================================
// Overdetermined System Tests
// ============================================================================

test('Overdetermined system (10 points) for perfect transformation', () => {
  const matrix = { a: 1.5, b: 0, c: 0, d: 2, e: 10, f: -5 }

  // Generate 10 non-collinear source points and their exact transforms
  const source = []
  const target = []

  for (let i = 0; i < 10; i++) {
    const x = i * 10
    const y = i * i * 3 // Non-linear pattern to avoid collinearity
    source.push({ x, y })
    target.push(applyTransform({ x, y }, matrix))
  }

  const result = calculateAffineMatrix(source, target)

  assertClose(result.matrix.a, matrix.a, 1e-6, 'a should match')
  assertClose(result.matrix.d, matrix.d, 1e-6, 'd should match')
  assertClose(result.matrix.e, matrix.e, 1e-6, 'e should match')
  assertClose(result.matrix.f, matrix.f, 1e-6, 'f should match')
})

// ============================================================================
// Error Handling Tests
// ============================================================================

test('calculateAffineMatrix throws with fewer than 3 points', () => {
  const source = [{ x: 0, y: 0 }, { x: 1, y: 1 }]
  const target = [{ x: 0, y: 0 }, { x: 2, y: 2 }]

  try {
    calculateAffineMatrix(source, target)
    throw new Error('Should have thrown error for < 3 points')
  } catch (error) {
    if (!error.message.includes('Minimum 3 point pairs')) {
      throw error
    }
  }
})

test('calculateAffineMatrix throws with mismatched array lengths', () => {
  const source = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]
  const target = [{ x: 0, y: 0 }, { x: 1, y: 1 }]

  try {
    calculateAffineMatrix(source, target)
    throw new Error('Should have thrown error for mismatched lengths')
  } catch (error) {
    if (!error.message.includes('same length')) {
      throw error
    }
  }
})

test('calculateAffineMatrix detects degenerate matrix (collinear points)', () => {
  const source = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 200 }
  ]
  const target = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 }
  ]

  const result = calculateAffineMatrix(source, target)

  if (!result.isDegenerate) {
    throw new Error('Should detect degenerate matrix for collinear points')
  }
})

// ============================================================================
// Note: Tests run automatically when this module is imported
// The test runner captures console output to display results
// ============================================================================
