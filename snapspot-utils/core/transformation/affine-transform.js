/**
 * Affine Transform Module
 *
 * Pure mathematical transformation engine for coordinate transformation.
 * Implements affine transformation using least-squares solution.
 *
 * @module affine-transform
 */

// ============================================================================
// Linear Algebra Utilities
// ============================================================================

/**
 * Transpose a matrix
 * @param {Array<Array<number>>} matrix - Input matrix
 * @returns {Array<Array<number>>} Transposed matrix
 */
function transpose (matrix) {
  const rows = matrix.length
  const cols = matrix[0].length
  const result = []

  for (let j = 0; j < cols; j++) {
    result[j] = []
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j]
    }
  }

  return result
}

/**
 * Multiply two matrices
 * @param {Array<Array<number>>} A - First matrix (m×n)
 * @param {Array<Array<number>>} B - Second matrix (n×p)
 * @returns {Array<Array<number>>} Result matrix (m×p)
 */
function multiplyMatrices (A, B) {
  const m = A.length
  const n = A[0].length
  const p = B[0].length
  const result = []

  for (let i = 0; i < m; i++) {
    result[i] = []
    for (let j = 0; j < p; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += A[i][k] * B[k][j]
      }
      result[i][j] = sum
    }
  }

  return result
}

/**
 * Multiply matrix by vector
 * @param {Array<Array<number>>} matrix - Matrix (m×n)
 * @param {Array<number>} vector - Vector (n×1)
 * @returns {Array<number>} Result vector (m×1)
 */
function multiplyMatrixVector (matrix, vector) {
  const m = matrix.length
  const n = matrix[0].length
  const result = []

  for (let i = 0; i < m; i++) {
    let sum = 0
    for (let j = 0; j < n; j++) {
      sum += matrix[i][j] * vector[j]
    }
    result[i] = sum
  }

  return result
}

/**
 * Solve 3×3 linear system using Gaussian elimination
 * @param {Array<Array<number>>} A - Coefficient matrix (3×3)
 * @param {Array<number>} b - Right-hand side vector (3×1)
 * @returns {Array<number>} Solution vector [x, y, z]
 * @throws {Error} If matrix is singular
 */
function solveLinearSystem (A, b) {
  // Make copies to avoid modifying inputs
  const matrix = A.map(row => [...row])
  const vector = [...b]
  const n = 3

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k
      }
    }

    // Swap rows
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
    [vector[i], vector[maxRow]] = [vector[maxRow], vector[i]]

    // Check for singular matrix
    if (Math.abs(matrix[i][i]) < 1e-10) {
      throw new Error('Matrix is singular or nearly singular')
    }

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i]
      vector[k] -= factor * vector[i]
      for (let j = i; j < n; j++) {
        matrix[k][j] -= factor * matrix[i][j]
      }
    }
  }

  // Back substitution
  const solution = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let sum = vector[i]
    for (let j = i + 1; j < n; j++) {
      sum -= matrix[i][j] * solution[j]
    }
    solution[i] = sum / matrix[i][i]
  }

  return solution
}

/**
 * Solve normal equations: (A^T × A) × x = A^T × b
 * @param {Array<Array<number>>} A - Coefficient matrix (N×3)
 * @param {Array<number>} b - Target vector (N×1)
 * @returns {Array<number>} Solution parameters [param1, param2, param3]
 */
function solveNormalEquations (A, b) {
  const At = transpose(A)
  const AtA = multiplyMatrices(At, A)
  const Atb = multiplyMatrixVector(At, b)
  return solveLinearSystem(AtA, Atb)
}

// ============================================================================
// Affine Transformation Functions
// ============================================================================

/**
 * Calculate affine transformation matrix from point correspondences
 *
 * Uses least-squares solution to find the best-fit affine transformation
 * that maps source points to target points. Requires minimum 3 point pairs.
 *
 * Transformation equation: [x'] = [a b] [x] + [e]
 *                          [y']   [c d] [y]   [f]
 *
 * @param {Array<{x: number, y: number}>} sourcePoints - Source coordinates (3+ points)
 * @param {Array<{x: number, y: number}>} targetPoints - Target coordinates (same count)
 * @returns {{matrix: Object, determinant: number, isDegenerate: boolean}}
 * @throws {Error} If point count < 3 or array lengths differ
 */
export function calculateAffineMatrix (sourcePoints, targetPoints) {
  // Validate inputs
  if (!sourcePoints || !targetPoints) {
    throw new Error('Source and target points are required')
  }

  const N = sourcePoints.length

  if (N !== targetPoints.length) {
    throw new Error('Source and target point arrays must have same length')
  }

  if (N < 3) {
    throw new Error('Minimum 3 point pairs required')
  }

  // Build coefficient matrix A and target vectors Bx, By
  const A = []
  const Bx = []
  const By = []

  for (let i = 0; i < N; i++) {
    A.push([sourcePoints[i].x, sourcePoints[i].y, 1])
    Bx.push(targetPoints[i].x)
    By.push(targetPoints[i].y)
  }

  // Solve normal equations for X coordinates: A × [a,b,e]^T = Bx
  // Handle singular matrices (e.g., collinear source points)
  let paramsX, paramsY
  try {
    paramsX = solveNormalEquations(A, Bx)
    paramsY = solveNormalEquations(A, By)
  } catch (error) {
    // Matrix is singular (e.g., all source points are collinear)
    // Return identity matrix marked as degenerate
    return {
      matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      determinant: 0,
      isDegenerate: true
    }
  }

  // Build transformation matrix
  const matrix = {
    a: paramsX[0],
    b: paramsX[1],
    e: paramsX[2],
    c: paramsY[0],
    d: paramsY[1],
    f: paramsY[2]
  }

  // Calculate determinant
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c

  return {
    matrix,
    determinant,
    isDegenerate: Math.abs(determinant) < 1e-10
  }
}

/**
 * Apply affine transformation to a single point
 *
 * Transforms point using: x' = a*x + b*y + e
 *                         y' = c*x + d*y + f
 *
 * @param {{x: number, y: number}} point - Point to transform
 * @param {Object} matrix - Transformation matrix {a,b,c,d,e,f}
 * @returns {{x: number, y: number}} Transformed point
 */
export function applyTransform (point, matrix) {
  const { a, b, c, d, e, f } = matrix

  return {
    x: a * point.x + b * point.y + e,
    y: c * point.x + d * point.y + f
  }
}

/**
 * Apply affine transformation to an array of points (optimized)
 *
 * @param {Array<{x: number, y: number}>} points - Points to transform
 * @param {Object} matrix - Transformation matrix {a,b,c,d,e,f}
 * @returns {Array<{x: number, y: number}>} Transformed points
 */
export function batchTransform (points, matrix) {
  const { a, b, c, d, e, f } = matrix

  return points.map(p => ({
    x: a * p.x + b * p.y + e,
    y: c * p.x + d * p.y + f
  }))
}

/**
 * Calculate inverse affine transformation matrix
 *
 * Computes the inverse transformation that reverses the effect of the
 * original transformation. Useful for backward mapping.
 *
 * @param {Object} matrix - Original transformation matrix {a,b,c,d,e,f}
 * @returns {Object} Inverse matrix {a,b,c,d,e,f}
 * @throws {Error} If matrix is singular (not invertible)
 */
export function inverseTransform (matrix) {
  const { a, b, c, d, e, f } = matrix
  const det = a * d - b * c

  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is singular (not invertible)')
  }

  return {
    a: d / det,
    b: -b / det,
    c: -c / det,
    d: a / det,
    e: (b * f - d * e) / det,
    f: (c * e - a * f) / det
  }
}
