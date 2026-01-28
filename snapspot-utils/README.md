# SnapSpot Utilities Suite

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

**Status:** In Development  
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

### Option 1: Local File Access

1. Clone or download this repository
2. Open `snapspot-utils/index.html` in your browser
3. Select a tool to launch
4. No installation or server required!

### Option 2: Hosted Version *(future)*

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
   - Drag your new map image to "Target Map"

4. **Select Reference Points**
   - Click corresponding locations on both maps (minimum 3 pairs)
   - Choose clear features like corners or fixtures

5. **Calculate & Preview**
   - Click "Calculate Transformation"
   - Review metrics (RMSE, scale, rotation)
   - Click "Preview" to see transformed marker positions

6. **Generate Export**
   - Click "Generate Export"
   - Download the migrated JSON file

7. **Import to SnapSpot**
   - Open SnapSpot PWA
   - Navigate to Settings → Import Data
   - Import the migrated file

---

## Architecture

```
snapspot-utils/
├── index.html              # Tool selector page
├── shared/                 # Reusable components
│   ├── styles/            # Common CSS variables
│   └── utils/             # Shared JavaScript modules
├── core/                  # Business logic
│   ├── transformation/    # Coordinate math
│   └── formats/          # File format handlers
├── tools/                # Individual tools
│   └── map-migrator/     # Map migration tool
└── docs/                 # Documentation
```

**Design Principles:**
- **Modular:** Clean separation between tools and core logic
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

---

## Development Status

### Current Phase: Planning ✅

- [x] Feature branch created
- [x] Project structure defined
- [x] Architecture documented
- [x] Implementation plan created
- [ ] Phase 1: Core Transformation (not started)
- [ ] Phase 2: Format Handlers (not started)
- [ ] Phase 3: Shared Utilities (not started)
- [ ] Phase 4: UI Foundation (not started)
- [ ] Phase 5: Migration Tool (not started)
- [ ] Phase 6: Testing & Polish (not started)

**Estimated Completion:** 12-17 days from start

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
