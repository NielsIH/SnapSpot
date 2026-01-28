# Running SnapSpot Utilities Locally

## Quick Start

### 1. Start the Server

From the `snapspot-utils` directory:

```bash
npx http-server -p 8081 --cors
```

This will start a local web server on port 8081 with CORS enabled.

**Note:** We use port 8081 (not 8080) to avoid conflicts with the main SnapSpot PWA service worker.

### 2. Access the Utilities

Open your browser and navigate to:

```
http://localhost:8081
```

You'll see the SnapSpot Utilities landing page with tiles for each available tool.

## Available Tools

### 🧪 Test Runner (Active)

**URL:** `http://localhost:8081/tests/test-runner.html`

Run unit tests for all completed phases:
- Affine transformation tests
- Matrix calculation tests
- Validation and quality metric tests

Click "Run All Tests" to execute the test suite.

### 🗺️ Map Migrator (In Development)

Transform marker coordinates from one map to another using reference point alignment.

**Status:** Phase 2+ (not yet available)

### Other Tools (Coming Soon)

- **Format Converter** - Export to GeoJSON, CSV, KML
- **Batch Processor** - Bulk operations on multiple maps
- **Data Analyzer** - Statistics and visualizations

## Development Notes

### Why Use a Server?

Modern browsers enforce CORS (Cross-Origin Resource Sharing) restrictions that prevent loading ES6 modules from `file://` URLs. Using an HTTP server resolves these issues.

### Alternative Servers

If you prefer a different server, any static HTTP server will work:

**Python:**
```bash
python -m http.server 8081
```

**PHP:**
```bash
php -S localhost:8081
```

**VS Code Live Server:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### Port Already in Use?

If port 8081 is busy, use a different port:

```bash
npx http-server -p 8082 --cors
```

Then access at `http://localhost:8082`

## Testing Workflow

### Running Tests During Development

1. Start the server (as shown above)
2. Navigate to `http://localhost:8081`
3. Click the "Test Runner" tile
4. Click "Run All Tests"
5. Tests execute in the browser with real-time results

### Expected Test Results

**Phase 1 (Current):**
- ✅ 22 Affine Transform tests
- ✅ Multiple Transform Validator tests
- All tests should pass

### Test Output

The test runner shows:
- ✓ Passing tests in green
- ✗ Failing tests in red
- Statistics (passed/failed/total)
- Execution time
- Detailed error messages for failures

## Troubleshooting

### Wrong Page Loads (SnapSpot Main App)

**Problem:** You see the main SnapSpot PWA index page instead of the utilities page, even when running the server from `snapspot-utils` directory.

**Cause:** The main SnapSpot app is a Progressive Web App (PWA) with a service worker that caches pages. Service workers operate at the origin level (protocol + domain + port), so if you previously ran the main SnapSpot app on port 8080, its service worker is still active and serving cached content.

**Solutions:**

1. **Use Port 8081 (Recommended):**
   ```bash
   npx http-server -p 8081 --cors
   ```
   Access at `http://localhost:8081` - different port = no service worker conflict

2. **Clear Service Workers:**
   - Open DevTools (F12)
   - Go to Application tab → Service Workers
   - Click "Unregister" for any localhost service workers
   - Reload the page

3. **Use Incognito/Private Browsing:**
   - No service workers from previous sessions
   - Ctrl+Shift+N (Chrome) or Ctrl+Shift+P (Firefox)

4. **Hard Refresh:**
   - Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Bypasses cache temporarily
   - Note: Normal reload may revert to cached version

### CORS Errors

If you see CORS errors in the browser console:
- Make sure you're using `http://localhost:8081`, not `file://`
- Ensure `--cors` flag is included when starting http-server
- Try a hard refresh (Ctrl+F5 or Cmd+Shift+R)

### Module Not Found Errors

If test modules fail to load:
- Check that you're in the `snapspot-utils` directory when starting the server
- Verify the URL path matches the file structure
- Clear browser cache and reload

### Tests Not Running

If clicking "Run All Tests" does nothing:
- Open browser DevTools (F12) and check Console for errors
- Ensure JavaScript is enabled
- Try a different browser (Chrome, Firefox, Edge)

## Next Steps

Once Phase 2 is complete, the Map Migrator tool will be available from the landing page. Stay tuned!
