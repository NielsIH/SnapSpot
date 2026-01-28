/**
 * Phase 3: Shared Utilities - Tests
 *
 * Tests for canvas helpers and file loader utilities
 */

import { assert } from '../../../shared/test-framework.js'
import { CanvasRenderer } from '../canvas-helpers.js'
import { FileLoader } from '../file-loader.js'

/**
 * Canvas Helpers Test Suite
 */
const canvasTests = {
  name: 'Canvas Helpers',
  tests: [
    {
      name: 'CanvasRenderer - Constructor',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600

        const renderer = new CanvasRenderer(canvas)

        assert.equal(renderer.state.zoom, 1.0, 'Initial zoom should be 1.0')
        assert.equal(renderer.state.panX, 0, 'Initial panX should be 0')
        assert.equal(renderer.state.panY, 0, 'Initial panY should be 0')
      }
    },

    {
      name: 'CanvasRenderer - Invalid constructor',
      run () {
        assert.throws(
          () => new CanvasRenderer(null),
          'Should throw error for null canvas'
        )
      }
    },

    {
      name: 'CanvasRenderer - setZoom',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.setZoom(2.0)
        assert.equal(renderer.state.zoom, 2.0, 'Zoom should be set to 2.0')

        renderer.setZoom(20)
        assert.equal(renderer.state.zoom, 10, 'Zoom should be clamped to 10')

        renderer.setZoom(0.01)
        assert.equal(renderer.state.zoom, 0.1, 'Zoom should be clamped to 0.1')
      }
    },

    {
      name: 'CanvasRenderer - setPan',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.setPan(100, 50)
        assert.equal(renderer.state.panX, 100, 'PanX should be set to 100')
        assert.equal(renderer.state.panY, 50, 'PanY should be set to 50')
      }
    },

    {
      name: 'CanvasRenderer - resetView',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.setZoom(3.0)
        renderer.setPan(200, 100)

        renderer.resetView()
        assert.equal(renderer.state.zoom, 1.0, 'Zoom should be reset to 1.0')
        assert.equal(renderer.state.panX, 0, 'PanX should be reset to 0')
        assert.equal(renderer.state.panY, 0, 'PanY should be reset to 0')
      }
    },

    {
      name: 'CanvasRenderer - screenToCanvas',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        document.body.appendChild(canvas)
        const renderer = new CanvasRenderer(canvas)

        const coords1 = renderer.screenToCanvas(100, 100)
        assert.ok(typeof coords1.x === 'number', 'screenToCanvas should return number x')
        assert.ok(typeof coords1.y === 'number', 'screenToCanvas should return number y')

        renderer.setZoom(2.0)
        const coords2 = renderer.screenToCanvas(200, 200)
        assert.ok(typeof coords2.x === 'number', 'screenToCanvas with zoom should return number x')
        assert.ok(typeof coords2.y === 'number', 'screenToCanvas with zoom should return number y')

        document.body.removeChild(canvas)
      }
    },

    {
      name: 'CanvasRenderer - canvasToScreen',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        document.body.appendChild(canvas)
        const renderer = new CanvasRenderer(canvas)

        const coords1 = renderer.canvasToScreen(100, 100)
        assert.ok(typeof coords1.x === 'number', 'canvasToScreen should return number x')
        assert.ok(typeof coords1.y === 'number', 'canvasToScreen should return number y')

        renderer.setZoom(2.0)
        const coords2 = renderer.canvasToScreen(100, 100)
        assert.ok(typeof coords2.x === 'number', 'canvasToScreen with zoom should return number x')
        assert.ok(typeof coords2.y === 'number', 'canvasToScreen with zoom should return number y')

        document.body.removeChild(canvas)
      }
    },

    {
      name: 'CanvasRenderer - clear',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.clear()

        const ctx = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const isCleared = data.every((value, index) => {
          return index % 4 === 3 ? value === 0 : true
        })
        assert.ok(isCleared, 'Canvas should be cleared')
      }
    },

    {
      name: 'CanvasRenderer - enablePanZoom and disablePanZoom',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.enablePanZoom()
        assert.equal(renderer.panEnabled, true, 'PanZoom should be enabled')

        renderer.disablePanZoom()
        assert.equal(renderer.panEnabled, false, 'PanZoom should be disabled')
      }
    },

    {
      name: 'CanvasRenderer - drawMarker',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.drawMarker(100, 100, {
          color: '#ff0000',
          size: 24,
          label: '1',
          opacity: 1.0
        })

        const ctx = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let hasContent = false
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            hasContent = true
            break
          }
        }
        assert.ok(hasContent, 'Marker should be drawn')
      }
    },

    {
      name: 'CanvasRenderer - drawLine',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.clear()
        renderer.drawLine(50, 50, 150, 150, {
          color: '#0000ff',
          width: 2,
          opacity: 1.0
        })

        const ctx = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let hasContent = false
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            hasContent = true
            break
          }
        }
        assert.ok(hasContent, 'Line should be drawn')
      }
    },

    {
      name: 'CanvasRenderer - highlightMarker',
      run () {
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 600
        const renderer = new CanvasRenderer(canvas)

        renderer.clear()
        renderer.highlightMarker(100, 100, 24)

        const ctx = canvas.getContext('2d')
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let hasContent = false
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            hasContent = true
            break
          }
        }
        assert.ok(hasContent, 'Highlight should be drawn')
      }
    }
  ]
}

/**
 * File Loader Test Suite
 */
const fileLoaderTests = {
  name: 'File Loader',
  tests: [
    {
      name: 'FileLoader - loadAsText',
      async run () {
        const content = 'Hello, world!'
        const file = new File([content], 'test.txt', { type: 'text/plain' })

        const result = await FileLoader.loadAsText(file)
        assert.equal(result, content, 'Should load file as text')
      }
    },

    {
      name: 'FileLoader - loadAsText with null file',
      async run () {
        await assert.throwsAsync(
          async () => await FileLoader.loadAsText(null),
          'Should throw error for null file'
        )
      }
    },

    {
      name: 'FileLoader - loadAsDataURL',
      async run () {
        const content = 'Hello, world!'
        const file = new File([content], 'test.txt', { type: 'text/plain' })

        const result = await FileLoader.loadAsDataURL(file)
        assert.ok(result.startsWith('data:'), 'Data URL should start with "data:"')
        assert.ok(result.includes('text/plain'), 'Data URL should include MIME type')
      }
    },

    {
      name: 'FileLoader - loadAsBlob',
      async run () {
        const content = 'Hello, world!'
        const file = new File([content], 'test.txt', { type: 'text/plain' })

        const result = await FileLoader.loadAsBlob(file)
        assert.ok(result instanceof File, 'Result should be a File/Blob')
      }
    },

    {
      name: 'FileLoader - loadAsImage with valid image',
      async run () {
        const blob = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==').then(r => r.blob())
        const file = new File([blob], 'test.png', { type: 'image/png' })

        const result = await FileLoader.loadAsImage(file)
        assert.ok(result.image, 'Should have image property')
        assert.equal(typeof result.width, 'number', 'Width should be a number')
        assert.equal(typeof result.height, 'number', 'Height should be a number')
        assert.equal(result.width, 1, 'Width should be 1')
        assert.equal(result.height, 1, 'Height should be 1')
      }
    },

    {
      name: 'FileLoader - loadAsImage with non-image file',
      async run () {
        const file = new File(['not an image'], 'test.txt', { type: 'text/plain' })

        await assert.throwsAsync(
          async () => await FileLoader.loadAsImage(file),
          'Should throw error for non-image file'
        )
      }
    },

    {
      name: 'FileLoader - validateFileType with allowed types',
      run () {
        const file = new File([''], 'test.png', { type: 'image/png' })

        assert.ok(
          FileLoader.validateFileType(file, ['image/png', 'image/jpeg']),
          'Should pass for allowed type'
        )

        assert.ok(
          !FileLoader.validateFileType(file, ['application/json']),
          'Should fail for disallowed type'
        )
      }
    },

    {
      name: 'FileLoader - validateFileType with wildcards',
      run () {
        const file = new File([''], 'test.png', { type: 'image/png' })

        assert.ok(
          FileLoader.validateFileType(file, ['image/*']),
          'Should pass for image/* wildcard'
        )

        assert.ok(
          !FileLoader.validateFileType(file, ['text/*']),
          'Should fail for text/* wildcard'
        )
      }
    },

    {
      name: 'FileLoader - validateFileSize',
      run () {
        const file = new File(['Hello'], 'test.txt', { type: 'text/plain' })

        assert.ok(
          FileLoader.validateFileSize(file, 10),
          'Should pass for size under limit'
        )

        assert.ok(
          !FileLoader.validateFileSize(file, 3),
          'Should fail for size over limit'
        )
      }
    },

    {
      name: 'FileLoader - validate with valid file',
      run () {
        const file = new File(['Hello'], 'test.txt', { type: 'text/plain' })

        const result = FileLoader.validate(file, {
          allowedTypes: ['text/plain'],
          maxSizeBytes: 10
        })

        assert.ok(result.valid, 'Validation should pass')
        assert.equal(result.error, null, 'Should have no error')
      }
    },

    {
      name: 'FileLoader - validate with invalid type',
      run () {
        const file = new File(['Hello'], 'test.txt', { type: 'text/plain' })

        const result = FileLoader.validate(file, {
          allowedTypes: ['image/png']
        })

        assert.ok(!result.valid, 'Validation should fail')
        assert.ok(result.error.includes('Invalid file type'), 'Should have type error')
      }
    },

    {
      name: 'FileLoader - validate with oversized file',
      run () {
        const file = new File(['Hello World'], 'test.txt', { type: 'text/plain' })

        const result = FileLoader.validate(file, {
          maxSizeBytes: 5
        })

        assert.ok(!result.valid, 'Validation should fail')
        assert.ok(result.error.includes('File too large'), 'Should have size error')
      }
    },

    {
      name: 'FileLoader - validate with null file',
      run () {
        const result = FileLoader.validate(null)

        assert.ok(!result.valid, 'Validation should fail')
        assert.ok(result.error.includes('No file provided'), 'Should have no file error')
      }
    },

    {
      name: 'FileLoader - formatFileSize',
      run () {
        assert.equal(FileLoader.formatFileSize(0), '0 Bytes', 'Should format 0 bytes')
        assert.equal(FileLoader.formatFileSize(1024), '1 KB', 'Should format 1 KB')
        assert.equal(FileLoader.formatFileSize(1024 * 1024), '1 MB', 'Should format 1 MB')
        assert.equal(FileLoader.formatFileSize(1536), '1.5 KB', 'Should format 1.5 KB')
      }
    },

    {
      name: 'FileLoader - createDropZone',
      run () {
        const element = document.createElement('div')
        document.body.appendChild(element)

        const cleanup = FileLoader.createDropZone(element, (files) => {})

        assert.equal(typeof cleanup, 'function', 'Should return cleanup function')

        cleanup()
        document.body.removeChild(element)
      }
    }
  ]
}

export const allTests = [canvasTests, fileLoaderTests]
