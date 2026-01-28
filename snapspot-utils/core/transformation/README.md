# Core Transformation Module

Phase 1 implementation of the SnapSpot Map Migrator transformation engine.

## Overview

This module provides pure mathematical functions for affine coordinate transformation and validation. It is format-agnostic and has no external dependencies.

## Modules

### affine-transform.js

Pure mathematical transformation engine using least-squares affine transformation.

**Exports:**

```javascript
// Calculate transformation matrix from point correspondences
calculateAffineMatrix(sourcePoints, targetPoints)
  // Parameters:
  //   sourcePoints: Array<{x: number, y: number}> - Source coordinates (3+ points)
  //   targetPoints: Array<{x: number, y: number}> - Target coordinates (same count)
  // Returns: {matrix: {a,b,c,d,e,f}, determinant: number, isDegenerate: boolean}

// Apply transformation to a single point
applyTransform(point, matrix)
  // Parameters:
  //   point: {x: number, y: number}
  //   matrix: {a,b,c,d,e,f}
  // Returns: {x: number, y: number}

// Apply transformation to array of points (optimized)
batchTransform(points, matrix)
  // Parameters:
  //   points: Array<{x: number, y: number}>
  //   matrix: {a,b,c,d,e,f}
  // Returns: Array<{x: number, y: number}>

// Calculate inverse transformation
inverseTransform(matrix)
  // Parameters:
  //   matrix: {a,b,c,d,e,f}
  // Returns: {a,b,c,d,e,f} (inverse matrix)
  // Throws: Error if matrix is singular
```

### transform-validator.js

Quality metrics and validation for transformations.

**Exports:**

```javascript
// Calculate root mean square error
calculateRMSE(referencePairs, matrix)
  // Parameters:
  //   referencePairs: Array<{source: {x,y}, target: {x,y}}>
  //   matrix: {a,b,c,d,e,f}
  // Returns: number (RMSE in pixels)

// Detect transformation anomalies
detectAnomalies(matrix)
  // Parameters:
  //   matrix: {a,b,c,d,e,f}
  // Returns: {
  //   hasNegativeDeterminant: boolean,
  //   hasExtremeScale: boolean,
  //   hasExtremeShear: boolean,
  //   isDegenerate: boolean,
  //   scaleFactors: {x: number, y: number},
  //   shearFactor: number,
  //   determinant: number,
  //   rotation: number
  // }

// Validate reference point distribution
validatePointDistribution(points)
  // Parameters:
  //   points: Array<{x: number, y: number}>
  // Returns: {
  //   isValid: boolean,
  //   warning: string|null,
  //   areaRatio: number
  // }

// Suggest areas for additional reference points
suggestAdditionalPoints(currentPoints, bounds)
  // Parameters:
  //   currentPoints: Array<{x: number, y: number}>
  //   bounds: {width: number, height: number}
  // Returns: Array<{x: number, y: number, reason: string}>
```

## Usage Example

```javascript
import { calculateAffineMatrix, applyTransform } from './affine-transform.js'
import { calculateRMSE, detectAnomalies } from './transform-validator.js'

// Define reference point pairs
const sourcePoints = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: 100 }
]

const targetPoints = [
  { x: 10, y: 20 },
  { x: 110, y: 20 },
  { x: 10, y: 120 }
]

// Calculate transformation matrix
const { matrix, determinant, isDegenerate } = calculateAffineMatrix(
  sourcePoints,
  targetPoints
)

if (isDegenerate) {
  console.error('Cannot calculate transformation - points may be collinear')
} else {
  // Transform a point
  const point = { x: 50, y: 50 }
  const transformed = applyTransform(point, matrix)
  console.log('Transformed:', transformed) // { x: 60, y: 70 }
  
  // Check quality
  const pairs = sourcePoints.map((s, i) => ({
    source: s,
    target: targetPoints[i]
  }))
  
  const rmse = calculateRMSE(pairs, matrix)
  console.log('RMSE:', rmse, 'pixels')
  
  const anomalies = detectAnomalies(matrix)
  if (anomalies.hasExtremeScale) {
    console.warn('Warning: Extreme scaling detected')
  }
}
```

## Transformation Mathematics

The module implements affine transformation using the equation:

```
[x']   [a  b] [x]   [e]
[y'] = [c  d] [y] + [f]
```

Where:
- `a, d`: Scaling factors (X and Y)
- `b, c`: Shear/rotation components
- `e, f`: Translation offsets

The transformation is calculated using least-squares solution for overdetermined systems (3+ point pairs).

## Testing

Open `__tests__/test-runner.html` in a browser to run the test suite.

Or import test modules directly:

```javascript
import './__tests__/affine-transform.test.js'
import './__tests__/transform-validator.test.js'
```

## Performance

- Transformation calculation: <5ms for 3 points, <10ms for 20 points
- Point transformation: <100ms for 1000 points
- No external dependencies
- Pure JavaScript (no WebAssembly)

## Browser Support

Requires modern browser with:
- ES6 modules
- Math functions (sqrt, atan2, abs)

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Part of SnapSpot PWA utilities suite.
