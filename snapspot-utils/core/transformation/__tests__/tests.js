/**
 * Phase 1: Core Transformation - Combined Test Suites
 *
 * Imports and combines all test suites for the transformation module:
 * - Affine transformation tests (23 tests across 9 suites)
 * - Transform validator tests (23 tests across 5 suites)
 *
 * Total: 46 tests
 */

import { allTests as affineTests } from './affine-transform-tests.js'
import { allTests as validatorTests } from './transform-validator-tests.js'

/**
 * Export all test suites for Phase 1
 */
export const allTests = [
  ...affineTests,
  ...validatorTests
]
