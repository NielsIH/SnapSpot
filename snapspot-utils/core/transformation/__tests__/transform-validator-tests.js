/**
 * Unit Tests for Transform Validator Module
 *
 * Tests RMSE calculation, anomaly detection, and point distribution validation.
 */

import { assert } from '../../../shared/test-framework.js'
import {
  calculateRMSE,
  detectAnomalies,
  validatePointDistribution,
  suggestAdditionalPoints
} from '../transform-validator.js'
import { calculateAffineMatrix } from '../affine-transform.js'

/**
 * Test Suite 1: RMSE Calculation
 */
const rmseTests = {
  name: 'RMSE Calculation',
  tests: [
    {
      name: 'Returns 0 for perfect transformation',
      run () {
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

        assert.closeTo(rmse, 0, 1e-6, 'RMSE should be 0 for perfect fit')
      }
    },
    {
      name: 'Calculates correct error for imperfect fit',
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

        const { matrix } = calculateAffineMatrix(source, target)

        // Add a point with known error (2px off in each direction)
        const pairs = [
          { source: { x: 0, y: 0 }, target: { x: 10, y: 20 } },
          { source: { x: 100, y: 0 }, target: { x: 110, y: 20 } },
          { source: { x: 0, y: 100 }, target: { x: 10, y: 120 } },
          { source: { x: 50, y: 50 }, target: { x: 62, y: 72 } }
        ]

        const rmse = calculateRMSE(pairs, matrix)

        // Expected: sqrt((0² + 0² + 0² + (2² + 2²)) / 4) = sqrt(2) ≈ 1.414
        assert.closeTo(rmse, Math.sqrt(2), 1e-3, 'RMSE should be sqrt(2)')
      }
    },
    {
      name: 'Handles empty array',
      run () {
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const rmse = calculateRMSE([], matrix)

        assert.closeTo(rmse, 0, 1e-6, 'RMSE should be 0 for empty array')
      }
    }
  ]
}

/**
 * Test Suite 2: Anomaly Detection
 */
const anomalyTests = {
  name: 'Anomaly Detection',
  tests: [
    {
      name: 'Identifies identity transformation',
      run () {
        const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.ok(!anomalies.hasNegativeDeterminant, 'Should not have negative determinant')
        assert.ok(!anomalies.hasExtremeScale, 'Should not have extreme scale')
        assert.ok(!anomalies.hasExtremeShear, 'Should not have extreme shear')
        assert.ok(!anomalies.isDegenerate, 'Should not be degenerate')
        assert.closeTo(anomalies.scaleFactors.x, 1, 1e-6, 'X scale should be 1')
        assert.closeTo(anomalies.scaleFactors.y, 1, 1e-6, 'Y scale should be 1')
        assert.closeTo(anomalies.determinant, 1, 1e-6, 'Determinant should be 1')
      }
    },
    {
      name: 'Identifies reflection (negative determinant)',
      run () {
        const matrix = { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.ok(anomalies.hasNegativeDeterminant, 'Should detect negative determinant')
      }
    },
    {
      name: 'Identifies extreme scaling (large)',
      run () {
        const matrix = { a: 10, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.ok(anomalies.hasExtremeScale, 'Should detect large scale (10×)')
      }
    },
    {
      name: 'Identifies extreme scaling (small)',
      run () {
        const matrix = { a: 0.1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.ok(anomalies.hasExtremeScale, 'Should detect small scale (0.1×)')
      }
    },
    {
      name: 'Calculates scale factors correctly',
      run () {
        const matrix = { a: 3, b: 0, c: 0, d: 2, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.closeTo(anomalies.scaleFactors.x, 3, 1e-6, 'X scale should be 3')
        assert.closeTo(anomalies.scaleFactors.y, 2, 1e-6, 'Y scale should be 2')
      }
    },
    {
      name: 'Identifies degenerate matrix',
      run () {
        const matrix = { a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.ok(anomalies.isDegenerate, 'Should detect degenerate matrix (det = 0)')
      }
    },
    {
      name: 'Calculates rotation angle',
      run () {
        // 90-degree rotation
        const matrix = { a: 0, b: -1, c: 1, d: 0, e: 0, f: 0 }
        const anomalies = detectAnomalies(matrix)

        assert.closeTo(Math.abs(anomalies.rotation), 90, 1, 'Rotation should be ~90 degrees')
      }
    }
  ]
}

/**
 * Test Suite 3: Point Distribution Validation
 */
const distributionTests = {
  name: 'Point Distribution Validation',
  tests: [
    {
      name: 'Accepts well-distributed triangle points',
      run () {
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]

        const result = validatePointDistribution(points)

        assert.ok(result.isValid, 'Should accept triangle points')
        assert.ok(result.warning === null, 'Should have no warning')
        assert.ok(result.areaRatio > 0.1, 'Area ratio should be > 0.1')
      }
    },
    {
      name: 'Detects collinear points',
      run () {
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          { x: 200, y: 200 }
        ]

        const result = validatePointDistribution(points)

        assert.ok(!result.isValid, 'Should reject collinear points')
        assert.ok(result.warning !== null, 'Should have warning')
        assert.ok(result.warning.includes('collinear'), 'Warning should mention collinearity')
      }
    },
    {
      name: 'Detects duplicate points',
      run () {
        const points = [
          { x: 50, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 50 }
        ]

        const result = validatePointDistribution(points)

        assert.ok(!result.isValid, 'Should reject duplicate points')
      }
    },
    {
      name: 'Accepts fewer than 3 points',
      run () {
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 100 }
        ]

        const result = validatePointDistribution(points)

        assert.ok(result.isValid, 'Should accept < 3 points without validation')
      }
    },
    {
      name: 'Handles square distribution',
      run () {
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 }
        ]

        const result = validatePointDistribution(points)

        assert.ok(result.isValid, 'Should accept square distribution')
        assert.closeTo(result.areaRatio, 1, 0.01, 'Square should fill entire bounding box')
      }
    },
    {
      name: 'Handles L-shape distribution',
      run () {
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 0, y: 100 }
        ]

        const result = validatePointDistribution(points)

        assert.ok(result.isValid, 'Should accept L-shape')
        // Triangle area = 0.5 * 100 * 100 = 5000
        // Bounding box = 100 * 100 = 10000
        // Ratio = 0.5
        assert.closeTo(result.areaRatio, 0.5, 0.01, 'Triangle should be half of bounding box')
      }
    }
  ]
}

/**
 * Test Suite 4: Point Suggestion
 */
const suggestionTests = {
  name: 'Point Suggestion',
  tests: [
    {
      name: 'Suggests corners for empty points',
      run () {
        const bounds = { width: 1000, height: 800 }
        const suggestions = suggestAdditionalPoints([], bounds)

        assert.ok(suggestions.length >= 3, 'Should suggest at least 3 points')
        assert.ok(
          suggestions.some(s => s.x === 0 && s.y === 0),
          'Should suggest top-left corner'
        )
        assert.ok(
          suggestions.some(s => s.x === bounds.width && s.y === 0),
          'Should suggest top-right corner'
        )
      }
    },
    {
      name: 'Identifies empty quadrants',
      run () {
        const bounds = { width: 1000, height: 800 }
        const points = [
          { x: 100, y: 100 } // Only in top-left quadrant
        ]

        const suggestions = suggestAdditionalPoints(points, bounds)

        assert.ok(suggestions.length >= 3, 'Should suggest points for empty quadrants')
        assert.ok(
          suggestions.some(s =>
            s.reason.includes('top-right') ||
            s.reason.includes('bottom-left') ||
            s.reason.includes('bottom-right')
          ),
          'Should mention empty quadrants'
        )
      }
    },
    {
      name: 'Suggests corners when quadrants are covered',
      run () {
        const bounds = { width: 1000, height: 800 }
        const points = [
          { x: 250, y: 200 }, // Top-left quadrant
          { x: 750, y: 200 }, // Top-right quadrant
          { x: 250, y: 600 }, // Bottom-left quadrant
          { x: 750, y: 600 } // Bottom-right quadrant
        ]

        const suggestions = suggestAdditionalPoints(points, bounds)

        assert.ok(suggestions.length > 0, 'Should suggest some points')
        assert.ok(
          suggestions.some(s => s.reason.includes('corner')),
          'Should suggest corners'
        )
      }
    },
    {
      name: 'Handles null/undefined points',
      run () {
        const bounds = { width: 1000, height: 800 }
        const suggestions = suggestAdditionalPoints(null, bounds)

        assert.ok(suggestions.length > 0, 'Should return suggestions for null points')
      }
    }
  ]
}

/**
 * Test Suite 5: Integration Workflows
 */
const integrationTests = {
  name: 'Integration Workflows',
  tests: [
    {
      name: 'Full workflow: transform + validate quality',
      run () {
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
        assert.closeTo(rmse, 0, 1e-6, 'RMSE should be near 0')
        assert.ok(!anomalies.hasExtremeScale, 'Should not have extreme scale')
        assert.ok(!anomalies.isDegenerate, 'Should not be degenerate')
        assert.ok(distribution.isValid, 'Distribution should be valid')
      }
    },
    {
      name: 'Full workflow: detect problematic transformation',
      run () {
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
        assert.ok(isDegenerate, 'Matrix should be degenerate')
        assert.ok(!distribution.isValid, 'Distribution should be invalid')
        assert.ok(
          distribution.warning.includes('collinear'),
          'Should warn about collinearity'
        )
      }
    }
  ]
}

/**
 * Export all test suites
 */
export const allTests = [
  rmseTests,
  anomalyTests,
  distributionTests,
  suggestionTests,
  integrationTests
]
