/**
 * SnapSpot Utilities - Unified Test Framework
 *
 * Simple, consistent testing framework for all phases.
 * Browser-based with clear UI and console logging.
 *
 * @version 1.0.0
 */

/**
 * Test result tracker
 */
class TestRunner {
  constructor () {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    }
    this.startTime = 0
  }

  /**
   * Run a test suite
   * @param {Object} suite - Test suite with name and tests array
   * @returns {Promise<Object>} Test results
   */
  async runSuite (suite) {
    console.group(`📦 ${suite.name}`)
    this.startTime = performance.now()

    for (const test of suite.tests) {
      await this.runTest(test, suite.name)
    }

    const duration = performance.now() - this.startTime
    console.groupEnd()
    console.log(`⏱️  Suite completed in ${duration.toFixed(2)}ms`)
    console.log(`✅ ${this.results.passed} passed, ❌ ${this.results.failed} failed, 📊 ${this.results.total} total\n`)

    return this.results
  }

  /**
   * Run multiple test suites
   * @param {Array<Object>} suites - Array of test suites
   * @returns {Promise<Object>} Combined results
   */
  async runSuites (suites) {
    console.log('🧪 Starting Test Run\n')
    this.reset()

    for (const suite of suites) {
      await this.runSuite(suite)
    }

    return {
      ...this.results,
      allPassed: this.results.failed === 0
    }
  }

  /**
   * Run a single test
   * @private
   */
  async runTest (test, suiteName) {
    this.results.total++
    const testStartTime = performance.now()

    try {
      await test.run()
      const duration = performance.now() - testStartTime

      console.log(`✅ ${test.name} (${duration.toFixed(2)}ms)`)

      this.results.passed++
      this.results.tests.push({
        name: test.name,
        suite: suiteName,
        passed: true,
        duration
      })
    } catch (error) {
      const duration = performance.now() - testStartTime

      console.error(`❌ ${test.name}`)
      console.error(`   Error: ${error.message}`)
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
      }

      this.results.failed++
      this.results.tests.push({
        name: test.name,
        suite: suiteName,
        passed: false,
        error: error.message,
        stack: error.stack,
        duration
      })
    }
  }

  /**
   * Reset test results
   */
  reset () {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    }
  }

  /**
   * Get results summary
   */
  getSummary () {
    return {
      ...this.results,
      duration: performance.now() - this.startTime,
      allPassed: this.results.failed === 0
    }
  }
}

/**
 * Test assertion helpers
 */
export const assert = {
  /**
   * Assert that a condition is true
   */
  ok (condition, message = 'Assertion failed') {
    if (!condition) {
      throw new Error(message)
    }
  },

  /**
   * Assert equality
   */
  equal (actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(
        `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
      )
    }
  },

  /**
   * Assert deep equality
   */
  deepEqual (actual, expected, message = '') {
    const actualStr = JSON.stringify(actual)
    const expectedStr = JSON.stringify(expected)
    if (actualStr !== expectedStr) {
      throw new Error(
        `${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`
      )
    }
  },

  /**
   * Assert that a number is close to expected (within epsilon)
   */
  closeTo (actual, expected, epsilon = 1e-6, message = '') {
    const diff = Math.abs(actual - expected)
    if (diff > epsilon) {
      throw new Error(
        `${message}\nExpected: ${expected}\nActual: ${actual}\nDifference: ${diff} (epsilon: ${epsilon})`
      )
    }
  },

  /**
   * Assert that a function throws
   */
  throws (fn, message = 'Expected function to throw') {
    let threw = false
    try {
      fn()
    } catch (error) {
      threw = true
    }
    if (!threw) {
      throw new Error(message)
    }
  },

  /**
   * Assert that an async function throws
   */
  async throwsAsync (fn, message = 'Expected async function to throw') {
    let threw = false
    try {
      await fn()
    } catch (error) {
      threw = true
    }
    if (!threw) {
      throw new Error(message)
    }
  }
}

/**
 * Create test runner instance
 */
export const testRunner = new TestRunner()

/**
 * Update UI with test results
 * @param {Object} results - Test results from runner
 */
export function updateUI (results) {
  // Update stats
  document.getElementById('totalTests').textContent = results.total
  document.getElementById('passedTests').textContent = results.passed
  document.getElementById('failedTests').textContent = results.failed

  // Show stats
  document.getElementById('stats').style.display = 'grid'

  // Group tests by suite
  const testsBySuite = {}
  for (const test of results.tests) {
    if (!testsBySuite[test.suite]) {
      testsBySuite[test.suite] = []
    }
    testsBySuite[test.suite].push(test)
  }

  // Render results
  const resultsHTML = Object.entries(testsBySuite).map(([suiteName, tests]) => {
    const suitePassed = tests.filter(t => t.passed).length
    const suiteFailed = tests.filter(t => !t.passed).length
    const suiteDuration = tests.reduce((sum, t) => sum + t.duration, 0)

    return `
      <div class="test-suite">
        <div class="suite-header">
          <h3 class="suite-title">${suiteName}</h3>
          <div class="suite-stats">
            ${suitePassed} passed, ${suiteFailed} failed · ${suiteDuration.toFixed(1)}ms
          </div>
        </div>
        ${tests.map(test => `
          <div class="test-item ${test.passed ? 'passed' : 'failed'}">
            <span class="test-icon">${test.passed ? '✅' : '❌'}</span>
            <span class="test-name">${test.name}</span>
            <span class="test-time">${test.duration.toFixed(1)}ms</span>
          </div>
        `).join('')}
      </div>
    `
  }).join('')

  document.getElementById('testResults').innerHTML = resultsHTML
  document.getElementById('emptyState').style.display = 'none'
  document.getElementById('testResults').style.display = 'block'
}
