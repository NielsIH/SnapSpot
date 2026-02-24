# SnapSpot

A Progressive Web App for mapping photos to specific locations on any map, floor plan, or site diagram. SnapSpot is designed to work completely offline, making it perfect for construction sites, field surveys, property inspections, and any environment where GPS or internet connectivity is unavailable.

**Live Demo:** [https://nielsih.github.io/SnapSpot](https://nielsih.github.io/SnapSpot)

## Features

### Map Management
- Upload and manage multiple maps (PNG, JPG, SVG, or any image format)
- Support for Vector Graphics (SVG) with infinite zoom quality
- Rotate maps in 90-degree increments with persistent orientation
- Switch between multiple maps instantly
- Name and describe maps for easy organization
- Import and export map data with all markers and photos

### Marker System
- Place numbered markers at specific locations on maps
- Place paired line markers with connecting boundary lines
- Drag markers to reposition them precisely
- Add descriptions and notes to any marker
- Configure line color and optional line caption from endpoint details
- Attach multiple photos to each marker
- View marker coordinates and creation timestamps
- Custom marker colors based on description keywords
- Lock markers to prevent accidental movement
- Limit visible markers to the most recent ones

### Photo Management
- Associate photos with specific map locations
- Full-size photo viewer with zoom capability
- Photo gallery to browse all images on the active map
- Duplicate photo detection (optional)
- Configurable image quality settings
- Delete photos directly from the viewer
- Search photos by filename across all maps

### Navigation & Display
- Pan and zoom with mouse or touch gestures
- Pinch-to-zoom on touch devices
- Crosshair overlay for precise marker placement
- Responsive design optimized for desktop, tablet, and mobile
- Touch-friendly interface with 44px minimum touch targets
- Adaptive button layout (bottom in portrait, side in landscape)

### Search & Discovery
- Search across maps, markers, and photos
- Filter search results to active map only
- "Show on Map" function to navigate to any marker
- Search by image file to find specific maps

### Data Management
- Import/Export individual maps or all data
- Merge imported data into existing maps
- Export data filtered by specific dates
- Generate HTML reports with embedded images
- Full IndexedDB storage for offline capability
- Automatic data migration for compatibility updates

### Offline Functionality
- Progressive Web App (PWA) with Service Worker
- Works completely offline after first visit
- Install as standalone app on any device
- No internet required for any feature
- Connection status monitoring

### Cross-Platform Support
- Chrome, Firefox, Edge, Safari (desktop and mobile)
- Full compatibility with iOS and iPadOS
- Optimized for both mouse and touch input
- GPU-accelerated rendering for smooth performance

## Getting Started

### Installation

**Option 1: Use Online (Recommended)**
1. Visit [https://nielsih.github.io/SnapSpot](https://nielsih.github.io/SnapSpot) in any web browser
2. Click the install button or "Add to Home Screen" option
3. Launch the installed app - it works offline after installation

**Option 2: Local Development**
1. Clone this repository
2. Serve files using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

### Basic Usage

**1. Upload Your First Map**
- Click the Settings button (gear icon)
- Navigate to "Map Management" tab
- Click "Upload New Map" and select an image file
- Give your map a name and optional description
- Click "Save" to store the map

**2. Place Markers**
- Pan or zoom to position the crosshair where you want to place a marker
- Click "Place Marker" button (center-bottom on mobile, right side on desktop)
- Markers are numbered automatically in chronological order

**3. Add Photos to Markers**
- Click on any marker to open the marker details
- Click "Add Photo" and select image files
- Add descriptions or notes to the marker
- Photos are stored locally and work offline

**4. Navigate Your Map**
- **Pan:** Click and drag (mouse) or swipe (touch)
- **Zoom:** Mouse wheel, pinch gesture, or zoom buttons
- **Rotate:** Use the rotate button to change orientation
- **Move Markers:** Unlock markers, then drag them to new positions

**5. Search and Find**
- Click the Search button (magnifying glass icon)
- Search for maps, markers, or photos by name
- Use "Show on Map" to navigate to any result
- Toggle "Active map" to limit search to current map

**6. Export Your Data**
- Open Settings → Map Management
- Click the export icon next to any map
- Choose export options (all data or specific dates)
- Save the JSON file - it contains all markers and photos

### Tips for New Users

- **Always Lock Markers:** After placing markers, use the lock button to prevent accidental movement
- **Backup Regularly:** Export your map data periodically as a backup
- **Use Descriptions:** Add keywords to marker descriptions for easier searching and color-coding
- **Offline First:** After the first visit, SnapSpot works completely offline
- **Clear Crosshair:** Toggle off the crosshair after marker placement for clearer viewing
- **Photo Quality:** Adjust image quality in settings to balance file size and clarity
- **SVG for Plans:** Use SVG files for floor plans and CAD drawings - they zoom infinitely without blur

## Use Cases

SnapSpot is ideal for any situation where you need to document and organize photos by location:

- **Construction Projects** - Track progress photos across floor plans and site layouts
- **Property Inspections** - Link inspection photos to specific locations on property maps
- **Archaeological Surveys** - Document findings with precise location mapping
- **Facility Management** - Track maintenance work, equipment, and asset locations
- **Underground/Indoor Work** - Map photos in areas without GPS signal
- **Event Planning** - Organize venue layouts and logistics with photo documentation
- **Research & Field Work** - Document observations with precise location data
- **Quality Control** - Track inspections and issues across facility maps

## Technical Information

### Architecture
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3
- **Storage**: IndexedDB for persistent offline data storage
- **PWA**: Service Worker for offline functionality and app installation
- **No Dependencies**: Zero external frameworks - lightweight and fast

### Browser Compatibility
- Chrome/Edge 88+
- Firefox 85+  
- Safari 14+ (desktop and mobile - full iOS/iPadOS support)
- Any browser with IndexedDB and Service Worker support

### File Structure
```
SnapSpot/
├── index.html                    # Main application HTML
├── manifest.json                 # PWA configuration
├── service-worker.js             # Offline functionality & caching
├── LICENSE                       # MIT License
├── README.md                     # This file
│
├── css/                          # Modular stylesheets
│   ├── base.css                  # Base styles & variables
│   ├── components.css            # Reusable UI components
│   ├── layout.css                # Layout & positioning
│   ├── main.css                  # Main application styles
│   ├── map-display.css           # Map canvas & controls
│   ├── migration-overlay.css     # Data migration overlay
│   ├── modals.css                # General modal styles
│   ├── notifications.css         # Toast notifications
│   ├── responsive.css            # Responsive breakpoints
│   ├── utilities.css             # Utility classes
│   └── modals/                   # Modal-specific styles
│       ├── base.css              # Modal base styles
│       ├── components.css        # Modal components
│       ├── export-decision.css   # Export options modal
│       ├── image-viewer.css      # Image viewer modal
│       ├── import-decision.css   # Import options modal
│       ├── marker-details.css    # Marker details modal
│       ├── photo-gallery.css     # Photo gallery modal
│       ├── responsive.css        # Modal responsive styles
│       ├── search.css            # Search modal
│       ├── settings.css          # Settings modal
│       └── upload.css            # Upload modal
│
├── js/                           # JavaScript modules
│   ├── app.js                    # Main application controller
│   ├── app-map-interactions.js   # Pan, zoom, rotate handlers
│   ├── app-marker-photo-manager.js # Marker & photo management
│   ├── app-search.js             # Search functionality
│   ├── app-settings.js           # Settings orchestration
│   ├── app-storage-manager.js    # Storage & display management
│   ├── fileManager.js            # File selection & processing
│   ├── HtmlReportGenerator.js    # HTML report generation
│   ├── imageProcessor.js         # Image manipulation & thumbnails
│   ├── mapRenderer.js            # Canvas rendering engine
│   ├── searchManager.js          # Search modal logic
│   ├── storage.js                # IndexedDB interface (MapStorage)
│   └── ui/                       # UI component modules
│       ├── marker-details-modal.js # Marker details UI
│       ├── modals.js             # Modal manager (ModalManager)
│       ├── photo-gallery-modal.js # Photo gallery UI
│       ├── search-modal.js       # Search UI
│       ├── settings-modal.js     # Settings UI
│       ├── uiRenderer.js         # Common UI components
│       └── upload-modal.js       # Upload UI
│
├── lib/                          # Data handling libraries
│   ├── snapspot-data/            # Data import/export/merge
│   │   ├── merger.js             # Map data merging logic
│   │   ├── parser.js             # JSON parsing & validation
│   │   ├── splitter.js           # Date-based data splitting
│   │   ├── validator.js          # Data validation
│   │   └── writer.js             # JSON/HTML export writer
│   ├── snapspot-image/           # Image processing utilities
│   │   ├── converter.js          # Format conversion (Blob/Base64)
│   │   └── hasher.js             # Image content hashing
│   └── snapspot-storage/         # Storage utilities
│       └── exporter-importer.js  # Export/import orchestration
│
├── icons/                        # PWA icons & app images
│   ├── favicon.ico               # Browser favicon
│   ├── favicon.svg               # SVG favicon
│   ├── favicon-96x96.png         # PNG favicon
│   ├── apple-touch-icon.png      # iOS home screen icon
│   ├── web-app-manifest-192x192.png # PWA icon (192px)
│   ├── web-app-manifest-512x512.png # PWA icon (512px)
│   ├── screenshot-narrow.png     # PWA screenshot (mobile)
│   └── screenshot-wide.png       # PWA screenshot (desktop)
│
└── docs/                         # Documentation
    ├── Instructions.md           # Development instructions
```

### Development
1. Clone the repository
2. Serve with any static web server (Python, Node.js, PHP)
3. Code changes are instantly reflected - no build step required
4. Test offline mode using browser DevTools

## Contributing

Contributions are welcome! Please ensure:
- Code works completely offline
- Touch targets are at least 44px for mobile usability
- Changes are tested across Chrome, Firefox, and Safari
- ES6+ JavaScript standards are followed

## License

MIT License - See LICENSE file for details