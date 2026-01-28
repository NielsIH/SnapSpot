# Phase 1: Core Transformation Module

**Estimated Duration:** 2-3 days  
**Dependencies:** None  
**Goal:** Build pure mathematical transformation engine

## Deliverables

- `core/transformation/affine-transform.js`
- `core/transformation/transform-validator.js`
- Unit tests for transformation functions

---

## Tasks

### 1.1 Linear Algebra Utilities

**File:** `core/transformation/affine-transform.js`

- [ ] Implement matrix multiplication (3×3 and 3×N)
- [ ] Implement matrix transpose
- [ ] Implement Gaussian elimination for 3×3 systems
- [ ] Add helper: `solveLinearSystem(A, b)` → solution vector

**Testing:**
```javascript
// Test with known solutions
solve([[2,1],[1,3]], [5,5]) → [2, 1]
```

---

### 1.2 Affine Transformation Calculation

**File:** `core/transformation/affine-transform.js`

- [ ] Implement `calculateAffineMatrix(sourcePoints, targetPoints)`
  - Validate minimum 3 point pairs
  - Build coefficient matrix A
  - Build target vectors Bx and By
  - Solve normal equations: `(A^T × A)^(-1) × A^T × B`
  - Return `{matrix: {a,b,c,d,e,f}, determinant, isDegenerate}`

- [ ] Implement `applyTransform(point, matrix)`
  - Single point transformation: `x' = ax + by + e, y' = cx + dy + f`

- [ ] Implement `batchTransform(points, matrix)`
  - Optimized array transformation
  - Use typed arrays if performance needed

- [ ] Implement `inverseTransform(matrix)`
  - Calculate inverse: `det = ad - bc`
  - Check for singularity (`|det| < 1e-10`)
  - Return inverse matrix

**Testing:**
```javascript
// Identity transformation
points = [{x:0,y:0}, {x:100,y:0}, {x:0,y:100}]
matrix = calculateAffineMatrix(points, points)
expect(matrix.a ≈ 1, matrix.d ≈ 1, matrix.b ≈ 0, matrix.e ≈ 0)

// Translation
target = [{x:10,y:20}, {x:110,y:20}, {x:10,y:120}]
matrix = calculateAffineMatrix(points, target)
expect(matrix.e ≈ 10, matrix.f ≈ 20)

// Scaling
target = [{x:0,y:0}, {x:200,y:0}, {x:0,y:200}]
matrix = calculateAffineMatrix(points, target)
expect(matrix.a ≈ 2, matrix.d ≈ 2)
```

---

### 1.3 Transformation Validator

**File:** `core/transformation/transform-validator.js`

- [ ] Implement `calculateRMSE(referencePairs, matrix)`
  - Transform each source point
  - Calculate Euclidean distance to target
  - Return `sqrt(Σ(distance²) / N)`

- [ ] Implement `detectAnomalies(matrix)`
  - Calculate scale factors: `scaleX = sqrt(a² + c²)`, `scaleY = sqrt(b² + d²)`
  - Calculate shear: `(ab + cd) / (scaleX × scaleY)`
  - Check determinant sign (negative = reflection)
  - Return warnings object

- [ ] Implement `validatePointDistribution(points)`
  - Calculate bounding box area
  - Calculate convex hull or triangle area (3 points)
  - Check area ratio > 0.1 (not collinear)

- [ ] Implement `suggestAdditionalPoints(currentPoints, bounds)`
  - Find quadrants with no points
  - Suggest corners or midpoints
  - Return array of suggestions

**Testing:**
```javascript
// Good transformation
rmse = calculateRMSE(pairs, goodMatrix)
expect(rmse < 5) // pixels

// Collinear detection
points = [{x:0,y:0}, {x:100,y:100}, {x:200,y:200}]
result = validatePointDistribution(points)
expect(result.isValid === false)
```

---

### 1.4 Module Export & Documentation

- [ ] Add ES6 exports for all public functions
- [ ] Add JSDoc comments with parameter types and descriptions
- [ ] Create constants file if needed (error thresholds, epsilon values)
- [ ] Verify no external dependencies (pure module)

**Example JSDoc:**
```javascript
/**
 * Calculate affine transformation matrix from point correspondences
 * @param {Array<{x: number, y: number}>} sourcePoints - Source coordinates (3+ points)
 * @param {Array<{x: number, y: number}>} targetPoints - Target coordinates (same count)
 * @returns {{matrix: Object, determinant: number, isDegenerate: boolean}}
 * @throws {Error} If point count < 3 or array lengths differ
 */
export function calculateAffineMatrix(sourcePoints, targetPoints)
```

---

### 1.5 Unit Testing

**Create:** `core/transformation/__tests__/affine-transform.test.js`

- [ ] Test identity transformation
- [ ] Test pure translation (various offsets)
- [ ] Test pure scaling (uniform and non-uniform)
- [ ] Test 90°, 180°, 270° rotations
- [ ] Test combined transformations
- [ ] Test overdetermined system (10+ points)
- [ ] Test edge cases (collinear points, duplicate points)
- [ ] Test error handling (< 3 points, mismatched arrays)

**Create:** `core/transformation/__tests__/transform-validator.test.js`

- [ ] Test RMSE calculation accuracy
- [ ] Test anomaly detection (extreme scale, shear, reflection)
- [ ] Test point distribution validation

---

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] No external dependencies (pure JavaScript)
- [ ] JSDoc documentation complete
- [ ] Code follows JavaScript Standard Style
- [ ] Identity transformation returns identity matrix
- [ ] RMSE = 0 for perfect point correspondences
- [ ] Handles 3-100 point pairs without performance issues

---

## Notes

- **Linear Algebra Library:** Consider `ml-matrix` package if manual implementation too complex, but prefer pure JS for no dependencies
- **Numeric Stability:** Use epsilon (1e-10) for floating-point comparisons
- **Performance:** Transformation of 10,000 points should take <100ms
