# SnapSpot Utilities Suite

> **⚠️ REPOSITORY MOVED**  
> This directory is archived and no longer maintained.  
> **SnapSpot Utilities has moved to its own repository:**  
> 🔗 **https://github.com/NielsIH/SnapSpot-Utils**  
>   
> **Download the latest release:**  
> 📦 **https://github.com/NielsIH/SnapSpot-Utils/releases**  
>   
> This copy remains for historical reference only and will be removed in a future update.

---

**Desktop tools for advanced SnapSpot data operations**

Version 1.0 | [Documentation](docs/) | [SnapSpot Main App](../)

---

## Overview

SnapSpot Utilities is a collection of browser-based desktop tools for advanced operations on SnapSpot data. These utilities complement the main SnapSpot PWA with specialized features optimized for desktop workflows.

### Current Tools

#### 🗺️ Map Migrator
Transform marker coordinates from one map to another using reference point alignment. Perfect for:
- Upgrading to higher-resolution maps
- Migrating to updated floor plans
- Moving markers between different scans of the same location
- **Merging markers** from multiple exports onto the same map

**Two Migration Modes:**
- **Replace Mode:** Target is an image → Creates new export with transformed markers
- **Merge Mode:** Target is an export → Intelligently merges transformed markers with existing markers

**Duplicate Detection in Merge Mode (Optional):**
- **Default:** Add all as new (no duplicate detection)
- **Smart Detection:** Cascading strategy (photos → labels → coordinates)
- **Photo Filenames:** Match markers by 70%+ shared photo filenames
- **Label/Description:** Match markers by text (case-insensitive)
- **Coordinates:** Match within tolerance based on transformation quality (RMSE × 2.5)

**Status:** Available  
**Guide:** [Map Migrator Documentation](docs/map-migrator-guide.md) *(available after Phase 6)*

### Coming Soon

- **Format Converter** - Export to GeoJSON, CSV, KML
- **Batch Processor** - Bulk operations on multiple maps
- **Data Analyzer** - Statistics and visualizations

---

## Requirements

### System Requirements
- **Desktop/Laptop Computer** with 1280px+ screen width
- **Mouse and Keyboard** (touch input not supported)
- **Modern Web Browser:**
  - Chrome/Edge 90+
  - Firefox 88+
  - Safari 14+

### Usage Context
These are **desktop-only** tools designed for occasional workstation use. For day-to-day field operations, use the main SnapSpot PWA on mobile devices.

---

## Getting Started

**📘 Full Guide:** [Running Locally Documentation](docs/RUNNING_LOCALLY.md)

### Option 1: Simple HTTP Server (Recommended)

```bash
# Navigate to the snapspot-utils directory
cd snapspot-utils

# Start a local HTTP server (Node.js required)
# Use port 8081 to avoid conflicts with main SnapSpot PWA service worker
npx http-server -p 8081 --cors

# Open in your browser
# http://localhost:8081
```

The index page will show all available utilities. Click on a tile to launch a tool.

### Option 2: Local File Access

Some features may require an HTTP server due to browser CORS restrictions. For best results, use Option 1.

1. Clone or download this repository
2. Start an HTTP server in the `snapspot-utils` directory
3. Open `http://localhost:8081` in your browser (use port 8081 to avoid PWA conflicts)
4. Select a tool to launch

### Option 3: Hosted Version *(future)*

Visit the hosted utilities site (URL TBD after deployment).

---

## Quick Start: Map Migrator

1. **Export from SnapSpot**
   - Open SnapSpot PWA
   - Navigate to Settings → Export Data
   - Export map with markers you want to migrate

2. **Launch Map Migrator**
   - Open `tools/map-migrator/index.html`

3. **Load Files**
   - Drag your SnapSpot export JSON to "Source Map"
   - Drag your target to "Target Map":
     - **Image file** (.jpg, .png, .webp) for Replace Mode
     - **SnapSpot export** (.json) for Merge Mode

4. **Select Reference Points**
   - Click corresponding locations on both maps (minimum 3 pairs)
   - Choose clear features like corners or fixtures

5. **Calculate & Preview**
   - Click "Calculate Transformation"
   - Review metrics (RMSE, scale, rotation)
   - Click "Preview" to see transformed marker positions

6. **Generate Export**
   - Click "Generate Export"
   - **Replace Mode:** Downloads new export with transformed markers
   - **Merge Mode:** 
     1. Choose merge strategy (add all new, by label, by coordinates, or both)
     2. Preview merge statistics showing how many markers will be added vs merged
     3. Download merged export
   - Download the migrated/merged JSON file

7. **Import to SnapSpot**
   - Open SnapSpot PWA
   - Navigate to Settings → Import Data
   - Import the migrated/merged file

---

## Architecture

```
snapspot-utils/
├── index.html              # Tool selector page
├── shared/                 # Reusable components
│   ├── styles/            # Common CSS variables
│   └── utils/             # Shared JavaScript modules
├── core/                  # Business logic
│   └── transformation/    # Coordinate math (affine transforms)
├── lib/                   # Shared SnapSpot libraries (refactored)
│   ├── snapspot-data/     # Data operations (parse, write, validate, merge)
│   ├── snapspot-image/    # Image utilities (conversion, hashing)
│   └── snapspot-storage/  # Storage integration
├── tools/                # Individual tools
│   └── map-migrator/     # Map migration tool
└── docs/                 # Documentation
```

**Design Principles:**
- **Modular:** Clean separation between tools and core logic
- **Shared Libraries:** Uses refactored SnapSpot libraries from `lib/` directory
- **Privacy-First:** All processing in-browser, no data uploaded
- **Standalone:** No build process, just open HTML files
- **Extensible:** Easy to add new tools and formats

---

## Documentation

### For Users
- **Map Migrator Guide:** [docs/map-migrator-guide.md](docs/map-migrator-guide.md) *(Phase 6)*
- **Troubleshooting:** [docs/map-migrator-guide.md#troubleshooting](docs/map-migrator-guide.md#troubleshooting) *(Phase 6)*

### For Developers
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Technical Specs:** [docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md)
- **Implementation Plan:** [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)
- **Running Locally:** [docs/RUNNING_LOCALLY.md](docs/RUNNING_LOCALLY.md)

---

## Troubleshooting

### Wrong Page Loads (SnapSpot Main App Instead of Utilities)

**Problem:** When accessing `http://localhost:8080/index.html`, you see the main SnapSpot PWA instead of the utilities page, even though the server is running from the `snapspot-utils` directory.

**Cause:** The main SnapSpot app is a Progressive Web App (PWA) with a service worker that aggressively caches pages. Service workers operate at the origin level (domain + port), so if you previously ran the main SnapSpot app on port 8080, its service worker is still active and serving cached content.

**Solutions:**

1. **Use Port 8081 (Recommended):**
   ```bash
   npx http-server -p 8081 --cors
   ```
   Access at `http://localhost:8081` - Different port = no service worker conflict

2. **Clear Service Workers in DevTools:**
   - Open browser DevTools (F12)
   - Go to **Application** tab → **Service Workers**
   - Find any localhost service workers
   - Click **Unregister**
   - Reload the page (Ctrl+R)

3. **Use Incognito/Private Browsing:**
   - Ctrl+Shift+N (Chrome/Edge) or Ctrl+Shift+P (Firefox)
   - No cached service workers from previous sessions

4. **Hard Refresh (Temporary):**
   - Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Bypasses cache, but normal reload may revert

### Other Common Issues

See [docs/RUNNING_LOCALLY.md](docs/RUNNING_LOCALLY.md) for more troubleshooting help including CORS errors, module loading issues, and test runner problems.

---

## Development Status

### Current Phase: Phase 4 Complete ✅ → Phase 5 Next ⏳

- [x] Feature branch created
- [x] Project structure defined
- [x] Architecture documented
- [x] Implementation plan created
- [x] **Phase 1: Core Transformation ✅ COMPLETE**
  - [x] Linear algebra utilities
  - [x] Affine transformation calculation
  - [x] Transform validation & quality metrics
  - [x] Unit tests with browser-based test runner (44 tests)
- [x] **Phase 2: Format Handlers ✅ COMPLETE**
  - [x] SnapSpot export parser
  - [x] Writer for migrated exports
  - [x] Validation utilities
  - [x] Integration tests (22 tests)
- [x] **Phase 3: Shared Utilities ✅ COMPLETE**
  - [x] Canvas rendering with pan/zoom
  - [x] File loading utilities
  - [x] CSS framework and variables
  - [x] Unit tests (27 tests)
- [x] **Phase 4: UI Foundation ✅ COMPLETE**
  - [x] Suite landing page with desktop warning
  - [x] Map Migrator HTML structure
  - [x] Dual-canvas layout with responsive design
  - [x] Tool-specific CSS styling (973 lines)
- [ ] Phase 5: Migration Tool Logic (next)
- [ ] Phase 6: Testing & Polish

**Total Tests:** 93 tests passing across 3 phases  
**Estimated Completion:** 5-7 days remaining

---

## Contributing

This project is part of the SnapSpot ecosystem. Contributions welcome!

### Development Workflow
1. Work in `feature/utilities-suite` branch
2. Follow JavaScript Standard Style
3. Add tests for new features
4. Update documentation
5. Submit pull request

### Adding New Tools
See [docs/ARCHITECTURE.md#future-extensibility](docs/ARCHITECTURE.md#future-extensibility) for guidance on adding tools to the suite.

---

## Privacy & Security

- **No Server:** All processing happens in your browser
- **No Upload:** Your data never leaves your computer
- **No Tracking:** No analytics or telemetry
- **Local Only:** All files stay on your device

---

## License

Same license as SnapSpot main application. *(Specify MIT, GPL, etc.)*

---

## Support

- **Issues:** [GitHub Issues](https://github.com/NielsIH/SnapSpot/issues)
- **Documentation:** [docs/](docs/)
- **Main SnapSpot App:** [../README.md](../README.md)

---

## Acknowledgments

Built to extend [SnapSpot](https://github.com/NielsIH/SnapSpot) - a Progressive Web App for photo mapping.
