/**
 * Test Suite Example
 *
 * This file shows how to write tests using the unified test framework.
 * Copy this template to create tests for your phase.
 */

import { assert } from '../../../shared/test-framework.js'
// Import the modules you want to test
// import { myFunction } from '../my-module.js'

/**
 * Test Suite 1: Basic Tests
 */
const basicTests = {
  name: 'Basic Tests',
  tests: [
    {
      name: 'Simple assertion test',
      run() {
        const result = 1 + 1
        assert.equal(result, 2, 'Math should work')
      }
    },

    {
      name: 'Testing with closeTo for floating point',
      run() {
        const result = 0.1 + 0.2
        assert.closeTo(result, 0.3, 1e-10, 'Should handle floating point')
      }
    },

    {
      name: 'Async test example',
      async run() {
        const promise = Promise.resolve(42)
        const result = await promise
        assert.equal(result, 42, 'Promises should work')
      }
    },

    {
      name: 'Testing exceptions',
      run() {
        const throwError = () => {
          throw new Error('Expected error')
        }
        assert.throws(throwError, 'Should throw error')
      }
    }
  ]
}

/**
 * Test Suite 2: Advanced Tests
 */
const advancedTests = {
  name: 'Advanced Tests',
  tests: [
    {
      name: 'Deep equality test',
      run() {
        const obj1 = { a: 1, b: 2 }
        const obj2 = { a: 1, b: 2 }
        assert.deepEqual(obj1, obj2, 'Objects should be equal')
      }
    },

    {
      name: 'Async exception test',
      async run() {
        const asyncThrow = async () => {
          throw new Error('Async error')
        }
        await assert.throwsAsync(asyncThrow, 'Should throw async error')
      }
    }
  ]
}

/**
 * Export all test suites
 * The test runner will run these in order
 */
export const allTests = [
  basicTests,
  advancedTests
]
