/**
 * Integration Tests for SnapSpot Format Handlers
 *
 * Tests the complete workflow:
 * - Validator validation
 * - Parser parsing
 * - Writer generation
 * - Round-trip data integrity
 */

import { assert } from '../../../../shared/test-framework.js'
import { validateExportFile, isSupportedVersion } from '../../../../lib/snapspot-data/validator.js'
import { parseExport, parseExportMetadata, validateMarkerCoordinates, clampMarkerToBounds } from '../../../../lib/snapspot-data/parser.js'
import { buildExport, generateId, createMinimalExport } from '../../../../lib/snapspot-data/writer.js'
import { base64ToBlob, blobToBase64 } from '../../../../lib/snapspot-image/converter.js'
import { generateImageHash } from '../../../../lib/snapspot-image/hasher.js'

/**
 * Test utilities
 */
const TestUtils = {
  async loadFixture (filename) {
    // Support multiple base paths for different test runner locations
    const basePaths = [
      './fixtures/', // When running from same directory
      '../core/formats/snapspot/__tests__/fixtures/', // When running from root tests/
      './core/formats/snapspot/__tests__/fixtures/' // When running from snapspot-utils/
    ]

    for (const basePath of basePaths) {
      try {
        const response = await fetch(basePath + filename)
        if (response.ok) {
          return await response.text()
        }
      } catch (error) {
        // Try next path
      }
    }

    throw new Error(`Failed to load fixture: ${filename}`)
  }
}

/**
 * Test Suite: Validator
 */
const validatorTests = {
  name: 'Validator',
  tests: [
    {
      name: 'isSupportedVersion - v1.1 is supported',
      async run () {
        assert.ok(
          isSupportedVersion('1.1'),
          'Version 1.1 should be supported'
        )
      }
    },

    {
      name: 'isSupportedVersion - v1.0 is not supported',
      async run () {
        assert.ok(
          !isSupportedVersion('1.0'),
          'Version 1.0 should not be supported'
        )
      }
    },

    {
      name: 'validateExportFile - valid minimal export passes',
      async run () {
        const json = await TestUtils.loadFixture('minimal-export.json')
        const data = JSON.parse(json)
        const result = validateExportFile(data)

        assert.ok(result.isValid, 'Minimal export should be valid')
        assert.equal(result.errors.length, 0, 'Should have no errors')
      }
    },

    {
      name: 'validateExportFile - valid full export passes',
      async run () {
        const json = await TestUtils.loadFixture('full-export.json')
        const data = JSON.parse(json)
        const result = validateExportFile(data)

        assert.ok(result.isValid, 'Full export should be valid')
        assert.equal(result.errors.length, 0, 'Should have no errors')
      }
    },

    {
      name: 'validateExportFile - invalid version fails',
      async run () {
        const json = await TestUtils.loadFixture('invalid-version.json')
        const data = JSON.parse(json)
        const result = validateExportFile(data)

        assert.ok(!result.isValid, 'Invalid version export should fail')
        assert.ok(
          result.errors.some(e => e.includes('Unsupported export version')),
          'Should have version error'
        )
      }
    },

    {
      name: 'validateExportFile - missing map object fails',
      async run () {
        const json = await TestUtils.loadFixture('corrupted.json')
        const data = JSON.parse(json)
        const result = validateExportFile(data)

        assert.ok(!result.isValid, 'Corrupted export should fail')
        assert.ok(
          result.errors.some(e => e.includes('map')),
          'Should have map error'
        )
      }
    },

    {
      name: 'validateExportFile - invalid map dimensions fail',
      async run () {
        const data = {
          version: '1.1',
          type: 'SnapSpotDataExport',
          sourceApp: 'Test',
          timestamp: new Date().toISOString(),
          map: {
            id: 'test',
            name: 'Test',
            imageData: 'data:image/png;base64,test',
            width: -100, // Invalid
            height: 0, // Invalid
            imageHash: 'test',
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString()
          },
          markers: []
        }

        const result = validateExportFile(data)

        assert.ok(!result.isValid, 'Invalid dimensions should fail')
        assert.ok(
          result.errors.some(e => e.includes('width')),
          'Should have width error'
        )
        assert.ok(
          result.errors.some(e => e.includes('height')),
          'Should have height error'
        )
      }
    }
  ]
}

/**
 * Test Suite: Parser
 */
const parserTests = {
  name: 'Parser',
  tests: [
    {
      name: 'base64ToBlob - converts valid data URI',
      async run () {
        const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        const blob = base64ToBlob(dataUri)

        assert.ok(blob instanceof Blob, 'Should return a Blob')
        assert.equal(blob.type, 'image/png', 'Should have correct MIME type')
      }
    },

    {
      name: 'base64ToBlob - throws on invalid data URI',
      async run () {
        assert.throws(
          () => base64ToBlob('not-a-data-uri'),
          'Should throw on invalid data URI'
        )
      }
    },

    {
      name: 'parseExportMetadata - extracts basic info',
      async run () {
        const json = await TestUtils.loadFixture('full-export.json')
        const metadata = parseExportMetadata(json)

        assert.equal(metadata.version, '1.1')
        assert.equal(metadata.mapName, 'Full Test Map')
        assert.equal(metadata.markerCount, 3)
        assert.equal(metadata.photoCount, 1)
      }
    },

    {
      name: 'parseExport - parses minimal export',
      async run () {
        const json = await TestUtils.loadFixture('minimal-export.json')
        const parsed = await parseExport(json)

        assert.equal(parsed.map.name, 'Minimal Test Map')
        assert.equal(parsed.markers.length, 0)
        assert.ok(parsed.mapImage instanceof Blob, 'Should have map image as Blob')
      }
    },

    {
      name: 'parseExport - parses full export',
      async run () {
        const json = await TestUtils.loadFixture('full-export.json')
        const parsed = await parseExport(json)

        assert.equal(parsed.map.name, 'Full Test Map')
        assert.equal(parsed.markers.length, 3)
        assert.equal(parsed.photos.length, 1)
        assert.ok(parsed.mapImage instanceof Blob, 'Should have map image as Blob')
      }
    },

    {
      name: 'parseExport - rejects invalid JSON',
      async run () {
        await assert.throwsAsync(
          async () => await parseExport('invalid json {'),
          'Should throw on invalid JSON'
        )
      }
    },

    {
      name: 'parseExport - rejects unsupported version',
      async run () {
        const json = await TestUtils.loadFixture('invalid-version.json')
        await assert.throwsAsync(
          async () => await parseExport(json),
          'Should throw on unsupported version'
        )
      }
    },

    {
      name: 'validateMarkerCoordinates - finds out-of-bounds markers',
      async run () {
        const markers = [
          { x: 50, y: 50, description: 'Valid' },
          { x: -10, y: 50, description: 'Out of bounds X' },
          { x: 50, y: 150, description: 'Out of bounds Y' }
        ]

        const outOfBounds = validateMarkerCoordinates(markers, 100, 100)

        assert.equal(outOfBounds.length, 2, 'Should find 2 out-of-bounds markers')
      }
    },

    {
      name: 'clampMarkerToBounds - clamps coordinates',
      async run () {
        const marker = { x: -10, y: 150, description: 'Test' }
        const clamped = clampMarkerToBounds(marker, 100, 100)

        assert.equal(clamped.x, 0, 'X should be clamped to 0')
        assert.equal(clamped.y, 100, 'Y should be clamped to 100')
      }
    }
  ]
}

/**
 * Test Suite: Writer
 */
const writerTests = {
  name: 'Writer',
  tests: [
    {
      name: 'generateId - generates unique IDs',
      async run () {
        const id1 = generateId('test')
        const id2 = generateId('test')

        assert.ok(id1 !== id2, 'IDs should be unique')
        assert.ok(typeof id1 === 'string', 'ID should be a string')
        assert.ok(id1.length > 0, 'ID should not be empty')
      }
    },

    {
      name: 'blobToBase64 - converts Blob to data URI',
      async run () {
        const blob = new Blob(['test'], { type: 'text/plain' })
        const dataUri = await blobToBase64(blob)

        assert.ok(dataUri.startsWith('data:text/plain;base64,'), 'Should have correct format')
      }
    },

    {
      name: 'generateImageHash - generates SHA-256 hash',
      async run () {
        const blob = new Blob(['test data'], { type: 'application/octet-stream' })
        const hash = await generateImageHash(blob)

        assert.ok(typeof hash === 'string', 'Hash should be a string')
        assert.equal(hash.length, 64, 'SHA-256 hash should be 64 characters')
      }
    },

    {
      name: 'createMinimalExport - creates valid structure',
      async run () {
        const minimal = createMinimalExport()
        const result = validateExportFile(minimal)

        assert.ok(result.isValid, 'Minimal export should be valid')
      }
    },

    {
      name: 'buildExport - creates valid export',
      async run () {
        const map = {
          name: 'Test Map',
          width: 100,
          height: 100
        }

        const blob = new Blob(['test'], { type: 'image/png' })

        const markers = [
          { x: 50, y: 50, label: 'Test Marker' }
        ]

        const exportData = await buildExport(map, blob, markers)

        const result = validateExportFile(exportData)
        assert.ok(result.isValid, 'Generated export should be valid')
      }
    }
  ]
}

/**
 * Test Suite: Round-trip Integration
 */
const integrationTests = {
  name: 'Integration',
  tests: [
    {
      name: 'Round-trip - parse and rebuild minimal export',
      async run () {
        const originalJson = await TestUtils.loadFixture('minimal-export.json')
        const parsed = await parseExport(originalJson)

        const rebuiltData = await buildExport(
          parsed.map,
          parsed.mapImage,
          parsed.markers,
          parsed.photos
        )

        const result = validateExportFile(rebuiltData)

        assert.ok(result.isValid, 'Rebuilt export should be valid')
        assert.equal(
          rebuiltData.markers.length,
          0,
          'Should have same marker count'
        )
      }
    },

    {
      name: 'Round-trip - parse and rebuild full export',
      async run () {
        const originalJson = await TestUtils.loadFixture('full-export.json')
        const parsed = await parseExport(originalJson)

        const rebuiltData = await buildExport(
          parsed.map,
          parsed.mapImage,
          parsed.markers,
          parsed.photos
        )

        const result = validateExportFile(rebuiltData)

        assert.ok(result.isValid, 'Rebuilt export should be valid')
        assert.equal(
          rebuiltData.markers.length,
          3,
          'Should have same marker count'
        )
        assert.equal(
          rebuiltData.photos.length,
          1,
          'Should have same photo count'
        )
      }
    },

    {
      name: 'Round-trip - marker data integrity',
      async run () {
        const originalJson = await TestUtils.loadFixture('full-export.json')
        const original = JSON.parse(originalJson)
        const parsed = await parseExport(originalJson)

        const rebuiltData = await buildExport(
          parsed.map,
          parsed.mapImage,
          parsed.markers,
          parsed.photos
        )

        // Check first marker coordinates are preserved
        assert.equal(
          rebuiltData.markers[0].x,
          original.markers[0].x,
          'Marker X coordinate should match'
        )
        assert.equal(
          rebuiltData.markers[0].y,
          original.markers[0].y,
          'Marker Y coordinate should match'
        )
        assert.equal(
          rebuiltData.markers[0].description,
          original.markers[0].description,
          'Marker description should match'
        )
      }
    },

    {
      name: 'Performance - handle large export (500 markers)',
      async run () {
        // Generate 500 markers
        const markers = []
        for (let i = 0; i < 500; i++) {
          markers.push({
            id: `marker_${i}`,
            x: Math.random() * 2000,
            y: Math.random() * 1500,
            description: `Marker ${i}`,
            photoIds: [],
            createdDate: new Date().toISOString()
          })
        }

        const map = {
          name: 'Large Map',
          width: 2000,
          height: 1500
        }

        const blob = new Blob(['test'], { type: 'image/png' })

        const startTime = performance.now()
        const exportData = await buildExport(map, blob, markers)
        const buildTime = performance.now() - startTime

        // Convert to JSON and back to simulate real usage
        const exportJson = JSON.stringify(exportData)

        const parseStartTime = performance.now()
        const parsed = await parseExport(exportJson)
        const parseTime = performance.now() - parseStartTime

        assert.equal(parsed.markers.length, 500, 'Should have 500 markers')
        assert.ok(buildTime < 5000, `Build should complete in <5s (took ${buildTime.toFixed(0)}ms)`)
        assert.ok(parseTime < 5000, `Parse should complete in <5s (took ${parseTime.toFixed(0)}ms)`)
      }
    }
  ]
}

/**
 * All test suites
 */
export const allTests = [
  validatorTests,
  parserTests,
  writerTests,
  integrationTests
]
