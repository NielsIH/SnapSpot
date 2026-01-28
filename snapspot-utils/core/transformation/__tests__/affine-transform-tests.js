/**
 * Unit Tests for Affine Transform Module
 *
 * Tests transformation calculation, point transformation, and edge cases.
 */

import { assert } from '../../../shared/test-framework.js'
import {
  calculateAffineMatrix,
  applyTransform,
  batchTransform,
  inverseTransform
} from '../affine-transform.js'

/**
 * Test Suite 1: Identity Transformation
 */
const identityTests = {
  name: 'Identity Transformation',
  tests: [
    {
      name: 'Returns identity matrix when source equals target',
      run () {
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]

        const result = calculateAffineMatrix(points, points)

        assert.closeTo(result.matrix.a, 1, 1e-6, 'a should be 1')
        assert.closeTo(result.matrix.b, 0, 1e-6, 'b should be 0')
        assert.closeTo(result.matrix.c, 0, 1e-6, 'c should be 0')
        assert.closeTo(result.matrix.d, 1, 1e-6, 'd should be 1')
        assert.closeTo(result.matrix.e, 0, 1e-6, 'e should be 0')
        assert.closeTo(result.matrix.f, 0, 1e-6, 'f should be 0')
        assert.ok(!result.isDegenerate, 'Should not be degenerate')
      }
    }
  ]
}

/**
 * Test Suite 2: Translation
 */
const translationTests = {
  name: 'Translation',
  tests: [
    {
      name: 'Pure translation in X and Y direction',
      run () {
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

        assert.closeTo(result.matrix.a, 1, 1e-6, 'a should be 1')
        assert.closeTo(result.matrix.d, 1, 1e-6, 'd should be 1')
        assert.closeTo(result.matrix.e, 10, 1e-6, 'e should be 10')
        assert.closeTo(result.matrix.f, 20, 1e-6, 'f should be 20')
      }
    },
    {
      name: 'Large translation values',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 0, y: 50 }
        ]
        const target = [
          { x: 1000, y: 2000 },
          { x: 1050, y: 2000 },
          { x: 1000, y: 2050 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.e, 1000, 1e-6, 'e should be 1000')
        assert.closeTo(result.matrix.f, 2000, 1e-6, 'f should be 2000')
      }
    }
  ]
}

/**
 * Test Suite 3: Scaling
 */
const scalingTests = {
  name: 'Scaling',
  tests: [
    {
      name: 'Uniform scaling (2x)',
      run () {
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

        assert.closeTo(result.matrix.a, 2, 1e-6, 'a should be 2')
        assert.closeTo(result.matrix.d, 2, 1e-6, 'd should be 2')
      }
    },
    {
      name: 'Non-uniform scaling',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 0, y: 300 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, 2, 1e-6, 'a should be 2')
        assert.closeTo(result.matrix.d, 3, 1e-6, 'd should be 3')
      }
    },
    {
      name: 'Scaling down (0.5x)',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 0, y: 50 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, 0.5, 1e-6, 'a should be 0.5')
        assert.closeTo(result.matrix.d, 0.5, 1e-6, 'd should be 0.5')
      }
    }
  ]
}

/**
 * Test Suite 4: Rotation
 */
const rotationTests = {
  name: 'Rotation',
  tests: [
    {
      name: '90 degree rotation',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 0, y: 0 },
          { x: 0, y: 100 },
          { x: -100, y: 0 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, 0, 1e-6, 'a should be 0')
        assert.closeTo(result.matrix.b, -1, 1e-6, 'b should be -1')
        assert.closeTo(result.matrix.c, 1, 1e-6, 'c should be 1')
        assert.closeTo(result.matrix.d, 0, 1e-6, 'd should be 0')
      }
    },
    {
      name: '180 degree rotation',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 0, y: 0 },
          { x: -100, y: 0 },
          { x: 0, y: -100 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, -1, 1e-6, 'a should be -1')
        assert.closeTo(result.matrix.d, -1, 1e-6, 'd should be -1')
      }
    },
    {
      name: '45 degree rotation',
      run () {
        const cos45 = Math.sqrt(2) / 2
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 0, y: 0 },
          { x: 100 * cos45, y: 100 * cos45 },
          { x: -100 * cos45, y: 100 * cos45 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, cos45, 1e-6, 'a should be cos(45°)')
        assert.closeTo(result.matrix.b, -cos45, 1e-6, 'b should be -cos(45°)')
        assert.closeTo(result.matrix.c, cos45, 1e-6, 'c should be cos(45°)')
        assert.closeTo(result.matrix.d, cos45, 1e-6, 'd should be cos(45°)')
      }
    }
  ]
}

/**
 * Test Suite 5: Combined Transformations
 */
const combinedTests = {
  name: 'Combined Transformations',
  tests: [
    {
      name: 'Translation + Scaling',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 50, y: 50 },
          { x: 250, y: 50 },
          { x: 50, y: 250 }
        ]

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, 2, 1e-6, 'Should have 2x scale')
        assert.closeTo(result.matrix.e, 50, 1e-6, 'Should translate by 50')
        assert.closeTo(result.matrix.f, 50, 1e-6, 'Should translate by 50')
      }
    },
    {
      name: 'Rotation + Translation',
      run () {
        const source = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]
        const target = [
          { x: 10, y: 20 },
          { x: 10, y: 120 },
          { x: -90, y: 20 }
        ]

        const result = calculateAffineMatrix(source, target)

        // 90 degree rotation + translation
        assert.closeTo(result.matrix.a, 0, 1e-6, 'Rotation component')
        assert.closeTo(result.matrix.c, 1, 1e-6, 'Rotation component')
        assert.closeTo(result.matrix.e, 10, 1e-6, 'Translation X')
        assert.closeTo(result.matrix.f, 20, 1e-6, 'Translation Y')
      }
    }
  ]
}

/**
 * Test Suite 6: Point Transformation
 */
const pointTransformTests = {
  name: 'Point Transformation',
  tests: [
    {
      name: 'applyTransform with identity matrix',
      run () {
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const point = { x: 10, y: 20 }
        const result = applyTransform(point, matrix)

        assert.equal(result.x, 10, 'X should not change')
        assert.equal(result.y, 20, 'Y should not change')
      }
    },
    {
      name: 'applyTransform with translation',
      run () {
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: 5, f: 10 }
        const point = { x: 10, y: 20 }
        const result = applyTransform(point, matrix)

        assert.equal(result.x, 15, 'X should translate')
        assert.equal(result.y, 30, 'Y should translate')
      }
    },
    {
      name: 'batchTransform with multiple points',
      run () {
        const matrix = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }
        const points = [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 }
        ]
        const results = batchTransform(points, matrix)

        assert.equal(results.length, 3, 'Should return same number of points')
        assert.equal(results[0].x, 2, 'First point scaled')
        assert.equal(results[1].x, 4, 'Second point scaled')
        assert.equal(results[2].x, 6, 'Third point scaled')
      }
    }
  ]
}

/**
 * Test Suite 7: Inverse Transform
 */
const inverseTests = {
  name: 'Inverse Transform',
  tests: [
    {
      name: 'Inverse of identity is identity',
      run () {
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const inverse = inverseTransform(matrix)

        assert.closeTo(inverse.a, 1, 1e-6)
        assert.closeTo(inverse.d, 1, 1e-6)
      }
    },
    {
      name: 'Inverse of translation',
      run () {
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }
        const inverse = inverseTransform(matrix)

        assert.closeTo(inverse.e, -10, 1e-6, 'Should negate translation')
        assert.closeTo(inverse.f, -20, 1e-6, 'Should negate translation')
      }
    },
    {
      name: 'Inverse of scaling',
      run () {
        const matrix = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }
        const inverse = inverseTransform(matrix)

        assert.closeTo(inverse.a, 0.5, 1e-6, 'Should be reciprocal')
        assert.closeTo(inverse.d, 0.5, 1e-6, 'Should be reciprocal')
      }
    },
    {
      name: 'Round-trip transformation',
      run () {
        const matrix = { a: 2, b: 0, c: 0, d: 3, e: 10, f: 20 }
        const inverse = inverseTransform(matrix)
        const point = { x: 5, y: 7 }

        const transformed = applyTransform(point, matrix)
        const restored = applyTransform(transformed, inverse)

        assert.closeTo(restored.x, point.x, 1e-10, 'X should round-trip')
        assert.closeTo(restored.y, point.y, 1e-10, 'Y should round-trip')
      }
    }
  ]
}

/**
 * Test Suite 8: Overdetermined Systems
 */
const overdeterminedTests = {
  name: 'Overdetermined Systems',
  tests: [
    {
      name: 'Handles 10 point pairs',
      run () {
        // Use non-collinear points distributed in 2D space
        const source = [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 0, y: 10 },
          { x: 10, y: 10 },
          { x: 5, y: 5 },
          { x: 15, y: 5 },
          { x: 5, y: 15 },
          { x: 20, y: 20 },
          { x: 25, y: 15 },
          { x: 15, y: 25 }
        ]

        // Pure 2x scaling transformation
        const target = source.map(p => ({ x: p.x * 2, y: p.y * 2 }))

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, 2, 1e-6, 'Should handle least squares - scale X')
        assert.closeTo(result.matrix.d, 2, 1e-6, 'Should handle least squares - scale Y')
        assert.closeTo(result.matrix.b, 0, 1e-6, 'Should have no shear')
        assert.closeTo(result.matrix.c, 0, 1e-6, 'Should have no shear')
        assert.closeTo(result.matrix.e, 0, 1e-6, 'Should have no translation')
        assert.closeTo(result.matrix.f, 0, 1e-6, 'Should have no translation')
      }
    },
    {
      name: 'Handles 100 point pairs',
      run () {
        const source = []
        const target = []
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * 1000
          const y = Math.random() * 1000
          source.push({ x, y })
          target.push({ x: x * 1.5 + 10, y: y * 1.5 + 20 })
        }

        const result = calculateAffineMatrix(source, target)

        assert.closeTo(result.matrix.a, 1.5, 1e-3, 'Should approximate scale')
        assert.closeTo(result.matrix.d, 1.5, 1e-3, 'Should approximate scale')
      }
    }
  ]
}

/**
 * Test Suite 9: Edge Cases
 */
const edgeCaseTests = {
  name: 'Edge Cases',
  tests: [
    {
      name: 'Throws error with less than 3 point pairs',
      run () {
        const source = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
        const target = [{ x: 0, y: 0 }, { x: 100, y: 0 }]

        assert.throws(
          () => calculateAffineMatrix(source, target),
          'Should require at least 3 points'
        )
      }
    },
    {
      name: 'Throws error with mismatched array lengths',
      run () {
        const source = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }]
        const target = [{ x: 0, y: 0 }, { x: 100, y: 0 }]

        assert.throws(
          () => calculateAffineMatrix(source, target),
          'Should require same number of points'
        )
      }
    },
    {
      name: 'Detects collinear points',
      run () {
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

        assert.ok(result.isDegenerate, 'Should detect collinear points')
      }
    }
  ]
}

/**
 * Export all test suites
 */
export const allTests = [
  identityTests,
  translationTests,
  scalingTests,
  rotationTests,
  combinedTests,
  pointTransformTests,
  inverseTests,
  overdeterminedTests,
  edgeCaseTests
]
