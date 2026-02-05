# SnapSpot - Project Overview

## 🚨 Safari Blob Storage Compatibility Fix (2025-12)

SnapSpot now supports all Safari versions (including iOS/iPadOS) by migrating all map and photo image data in IndexedDB from Blob format to Base64 strings.

- All image data is stored as Base64 strings for full Safari compatibility.
- On first launch after update, any legacy Blob data is automatically migrated to Base64 (one-time migration).
- A full-screen overlay blocks UI and shows "Updating maps, please stand by" during migration.
- Import/export, gallery, and thumbnails are fully compatible with both formats.
- Migration is robust and error-tolerant; errors are logged but do not block app startup.

See [docs/SafariBlobFix.md](docs/SafariBlobFix.md) for technical details.

---

## Project Overview

This project is a Progressive Web App (PWA) called **SnapSpot**. It allows users to map photos and images to specific locations on any map or floor plan. It is designed to work offline, making it ideal for environments without reliable internet access, such as construction sites or archaeological surveys.

The application is built with **vanilla JavaScript (ES6+)**, **HTML5**, and **CSS3**. It uses **IndexedDB** for offline data storage and a **Service Worker** to provide offline functionality. The application is structured around a main `SnapSpotApp` class that manages the application's state and orchestrates interactions between various modules.

### Key Features:

*   **Offline First:** The application is designed to be fully functional without an internet connection.
*   **Map and Photo Management:** Users can upload maps, place markers, and attach photos and descriptions to markers.
*   **Data Export/Import:** Map data, including markers and photos, can be exported to a JSON file and imported back into the application.
*   **HTML Reports:** The application can generate an HTML report of a map, including all markers and photos.
*   **PWA:** The application can be installed on a user's device for a native-like experience.

## Application Architecture

The application follows a modular, class-based architecture orchestrated by a central controller. This design separates concerns, making the codebase easier to manage and extend.

### Shared Libraries Architecture

The application uses a **three-layer storage system** with shared libraries:

```
User Files (JSON) ↔ lib/snapspot-data (parser/writer) ↔ IndexedDB (MapStorage) ↔ App UI
```

**Shared Libraries (`lib/`):**
-   **`lib/snapspot-data/`** - Pure data operations (parse, validate, merge, split exports). Used by both PWA and utilities.
-   **`lib/snapspot-image/`** - Image utilities (Base64↔Blob conversion, SHA-256 hashing). Shared across codebase.
-   **`lib/snapspot-storage/`** - StorageExporterImporter that integrates `lib/snapspot-data` with IndexedDB (app-specific).

**Utilities Suite (`snapspot-utils/`):**
-   Desktop-focused tools for batch operations (e.g., map-migrator with affine transformation)
-   Uses shared libraries from `lib/` but operates independently from PWA
-   No mobile/touch optimization - designed for 1280px+ screens

This architecture ensures consistency between the PWA and utilities while maintaining a single source of truth for data operations.

### Core Class: `SnapSpotApp` (`js/app.js`)

This is the heart of the application. The `SnapSpotApp` class acts as the central controller, responsible for:
-   **Initialization:** It initializes all other modules (Storage, Renderer, Managers) when the application starts.
-   **State Management:** It holds the application's current state, such as the `currentMap`, the list of all `maps`, and user preferences (e.g., marker size, rotation).
-   **Event Handling:** It sets up and manages all major event listeners, from UI button clicks to map pan/zoom gestures.
-   **Orchestration:** It coordinates actions between different modules. For example, when a user uploads a map, `SnapSpotApp` uses the `FileManager` to select the file, the `ImageProcessor` to compress it, and the `MapStorage` to save it, finally telling the `MapRenderer` to display it.

### Data Layer: `MapStorage` (`js/storage.js`)

This class is an abstraction layer over **IndexedDB**, handling all data persistence. It is crucial for the app's offline capabilities.
-   **Schema:** The database (`SnapSpotDB`) consists of three main object stores:
    1.  `maps`: Stores map metadata, including the map image as a **Base64 string** (for Safari compatibility).
    2.  `markers`: Stores individual marker data, linked to a map by `mapId`.
    3.  `photos`: Stores photo data, including the image as a **Base64 string**, linked to a marker by `markerId`.
-   **Critical:** All images are stored as Base64 strings in IndexedDB, not Blobs, to ensure Safari iOS/iPadOS compatibility. Blob-to-Base64 conversion happens at storage boundaries.
-   **Operations:** It provides asynchronous methods for all CRUD (Create, Read, Update, Delete) operations, such as `addMap`, `getMap`, `getMarkersForMap`, `addPhoto`, `deleteMap`, etc.

### View Layer: Rendering and UI

The view layer is composed of several components that handle what the user sees.

-   **`MapRenderer` (`js/mapRenderer.js`):** This class exclusively manages the HTML `<canvas>`. It is responsible for drawing the map, markers, and any overlays. It handles all the complex logic for panning, zooming, and rotation, converting between screen coordinates and map coordinates. It receives data from `SnapSpotApp` but does not fetch data itself.
-   **`ModalManager` (`js/ui/modals.js`):** This class acts as a factory for creating and managing all modal dialogs (e.g., Upload, Settings, Marker Details, Search). It builds the modal's HTML, attaches event listeners to its internal elements, and communicates user actions back to `SnapSpotApp` via callbacks.
-   **`UIRenderer` (`js/ui/uiRenderer.js`):** A static utility class that provides helper methods for creating consistent UI elements. Its primary use is generating the "card" views for maps and photos that appear in the Search and Settings modals.

### Service Modules (The "How")

These modules provide specific functionalities and are used by the `SnapSpotApp` controller.

-   **`FileManager` (`js/fileManager.js`):** The entry point for getting data into the app. It handles opening the device's file picker and performs initial validation (file type, size) and metadata extraction for new map images.
-   **`ImageProcessor` (`js/imageProcessor.js`):** A utility class for all image-related transformations. It's used to resize and compress images (for maps and photos), generate thumbnails, and convert images between `Blob` and `Base64` formats. **Critical:** Uses `lib/snapspot-image` for Base64/Blob conversions.
-   **`SearchManager` (`js/searchManager.js`):** Orchestrates the search functionality. It uses the `ModalManager` to display the search UI and calls back to `SnapSpotApp` to execute searches against the data stored in `MapStorage`.
-   **`MapDataExporterImporter.js`:** Wrapper for backward compatibility. Delegates to `lib/snapspot-storage/exporter-importer.js` which uses shared libraries from `lib/snapspot-data` and `lib/snapspot-image`.
-   **`HtmlReportGenerator.js`:** Generates standalone HTML reports with embedded images (Base64).

## Core Workflows

### App Initialization

1.  The user opens the web page, which loads `index.html`.
2.  `js/app.js` is loaded, and a `SnapSpotApp` instance is created.
3.  `app.init()` is called. It instantiates all modules.
4.  `MapStorage.init()` connects to IndexedDB and creates the schema if it doesn't exist.
5.  `app.loadMaps()` fetches all map records from `MapStorage`.
6.  If an active map is found, `app.displayMap()` is called. This loads the map's Base64 image data from storage, converts it to a Blob for rendering, and passes it to `MapRenderer` to be displayed. It also fetches the markers for that map.
7.  If no maps exist, `app.checkWelcomeScreen()` shows the "Upload First Map" screen.

### Adding a New Map

1.  The user clicks an "Upload Map" button, which calls `app.showUploadModal()`.
2.  `ModalManager` creates the upload dialog.
3.  The user selects a file. `FileManager.selectFiles()` returns the `File` object.
4.  `FileManager.processFileUpload()` validates the file and extracts metadata.
5.  The `onUpload` callback in `app.js` is triggered. It uses `ImageProcessor.processImage()` to create a compressed `Blob` of the map.
6.  `MapStorage.addMap()` converts the Blob to Base64 and saves the map metadata and Base64 image data to IndexedDB.
7.  `app.switchToMap()` is called, which makes the new map the active one and triggers a re-render via `MapRenderer`.

### Placing and Interacting with Markers

1.  The user clicks the "Place Marker" button, calling `app.placeMarker()`.
2.  The app gets the current center of the screen from `MapRenderer` and converts it to map coordinates.
3.  A new marker object is created and saved to IndexedDB via `MapStorage.addMarker()`.
4.  The app refreshes its local list of markers and tells `MapRenderer` to re-draw the canvas with the new marker.
5.  When a user clicks on a marker, `app.handleMapMouseUp()` detects the click, finds the marker with `getMarkerAtPoint()`, and calls `app.showMarkerDetails()`.
6.  `app.showMarkerDetails()` fetches the marker's photos from `MapStorage` and uses `ModalManager` to display the details modal.

## Offline Functionality

The application is designed to be "offline-first".
-   **Service Worker (`service-worker.js`):** On first visit, the service worker caches all critical static assets (HTML, CSS, JS). When the user revisits, it serves these assets directly from the cache, allowing the app to load without an internet connection.
-   **IndexedDB (`storage.js`):** All user-generated data—including map metadata, marker locations, and the full-resolution images (stored as **Base64 strings**) for both maps and photos—is stored locally in the browser's IndexedDB. This makes all user data available offline. All read and write operations target the local database, so the app remains fully functional without a network connection.

## Key Files Summary

-   **`index.html`**: The main entry point of the application. It defines the basic HTML structure and loads all necessary CSS and JavaScript modules.
-   **`manifest.json`**: The Progressive Web App (PWA) manifest file. It provides metadata about the application, such as its name and icons, allowing it to be installed on a user's device.
-   **`service-worker.js`**: The core of the offline functionality. This script intercepts network requests and caches static assets, enabling the app to run without an internet connection.
-   **`css/main.css`**: The primary stylesheet that imports all other CSS files and sets the overall look and feel of the application.
-   **`js/app.js`**: The main application controller (`SnapSpotApp` class). It initializes all other modules, manages application state, and orchestrates the interactions between different parts of the app.
-   **`js/app-*.js`**: Feature modules imported by `app.js` for specific functionality (map-interactions, marker-photo-manager, search, settings, storage-manager).
-   **`js/storage.js`**: The data persistence layer (`MapStorage` class). It manages all interactions with the browser's IndexedDB, storing and retrieving maps, markers, and photos.
-   **`js/mapRenderer.js`**: The view layer for the map (`MapRenderer` class). It handles all drawing on the HTML canvas, including the map image and markers, as well as user interactions like panning, zooming, and rotation.
-   **`js/fileManager.js`**: A utility module (`FileManager` class) for handling file system interactions, responsible for opening the file picker and processing uploaded map images.
-   **`js/imageProcessor.js`**: A helper module (`ImageProcessor` class) that provides utilities for image manipulation, such as resizing, compression, and format conversion.
-   **`js/ui/modals.js`**: The modal management system (`ModalManager` class). It is responsible for creating, displaying, and managing all modal dialogs.
-   **`js/ui/uiRenderer.js`**: A static utility class (`UIRenderer`) for generating consistent UI components, such as the "card" elements used in lists.
-   **`js/ui/*-modal.js`**: Individual modal component implementations (marker-details, photo-gallery, search, settings, upload).
-   **`js/searchManager.js`**: The search functionality orchestrator (`SearchManager` class). It manages the search modal and coordinates with the main app to query and display results.
-   **`js/MapDataExporterImporter.js`**: Backward-compatible wrapper that delegates to `lib/snapspot-storage/exporter-importer.js` for exporting application data to JSON and importing it back.
-   **`lib/snapspot-data/`**: Shared library for pure data operations - parsing, validation, merging, and splitting SnapSpot export files. Used by both PWA and utilities.
-   **`lib/snapspot-image/`**: Shared library for image utilities - Base64/Blob conversion and SHA-256 hashing.
-   **`lib/snapspot-storage/`**: Storage integration layer that combines `lib/snapspot-data` and `lib/snapspot-image` with IndexedDB operations.
-   **`js/HtmlReportGenerator.js`**: A module responsible for generating a standalone, self-contained HTML report of a map with its markers and photos.
-   **`snapspot-utils/`**: Desktop-focused utilities suite with standalone tools:
    -   **`tools/map-migrator/`**: Affine transformation tool for migrating markers between different map images.
    -   **`core/transformation/affine-transform.js`**: Pure mathematical transformation engine (no DOM dependencies).
    -   Uses shared libraries from `lib/` for consistent data handling.

## Building and Running

The application is a client-side PWA and does not require a build process. To run the application locally, you can use any local web server.

### Local Development:

1.  Clone the repository.
2.  Serve the files using a local web server. Here are a few examples:

    *   **Using Python 3:**
        ```bash
        python -m http.server 8000
        ```

    *   **Using Node.js:**
        ```bash
        npx http-server
        ```

    *   **Using PHP:**
        ```bash
        php -S localhost:8000
        ```
3.  Open `http://localhost:8000` in your browser.

### Deployment:

The application is deployed to GitHub Pages from the `main` branch. Auto-deploys on push. See README.md for deployment details.

**Pre-deployment checklist:**
1. Bump `CACHE_NAME` in `service-worker.js` (format: `vYYYY-MM-DD-NN`)
2. Run `npm run lint` to ensure 0 errors
3. Test on Safari iOS/iPadOS for Base64 storage compatibility
4. Update README.md with user-facing changes

## Development Conventions

*   **JavaScript:** The project uses modern JavaScript (ES6+) and strictly follows the [JavaScript Standard Style](https://standardjs.com/) guide. Code should be organized into ES6 modules.
*   **CSS:** The project uses a BEM-like methodology for CSS classes.
*   **Offline First:** All features should be designed to work offline.
*   **Touch-Optimized:** The user interface should be touch-friendly, with a minimum touch target size of 44px.
*   **No External Frameworks:** The core functionality is built without any external JavaScript frameworks.

## Development Guidelines

### Iterative Planning & Confirmation (Pre-Coding)

Always begin with open discussion and exploration of options for new features or significant changes. Do not proceed to code generation, even proof-of-concept, until a specific plan has been mutually agreed upon.

Explicitly ask for confirmation before starting any code generation phase, even for small changes. For example, "Are you ready for me to provide the code changes for modals.js based on our agreed plan?"

### Strict Contextual Awareness (No Assumptions)

Never, under any circumstances, assume the existence, exact naming, or internal structure of variables, properties, functions, classes, or UI elements. If there is any doubt whatsoever, immediately request the relevant code snippet or file content for absolute confirmation. "Always ask" means if it's not directly in front of me, I ask for it.

Avoid implying or suggesting code structures that haven't been explicitly verified by the user's provided context.

### Modular & Targeted Code Generation (Minimal Diff Principle)

Always generate code in the smallest, most logical units necessary to implement a specific change. This is crucial to prevent truncation and facilitate easy review.

When modifying existing files, always provide only the specific lines to be added, removed, or changed. Try to avoid regenerating entire files.

### Clear & Actionable Instructions (Developer-Centric)

If new or modified code does not behave as expected, immediately prioritize understanding the root cause. Do not attempt to generate alternative code until the problem's nature is clearly identified.

Proactively suggest diagnostic steps, such as adding debug logging, inspecting state, or providing error messages, to gather more information from the developer.

### Efficiency & Conciseness (Value-Driven Output)

Only generate code snippets for new additions or strictly necessary modifications. Avoid generating code that is already correct or unchanged.

Explicitly state when no code change is required for a file or section. Do not re-state existing, correct code.

Prioritize concise, targeted instructions and code over verbose explanations or redundant output. Every piece of output should add clear, new value towards the task.

### Base Code Authority (Source of Truth)

Always refer to developer-provided code or previously accepted and implemented code as the authoritative base. Do not introduce elements not present in this base without explicit discussion and approval.

### Singular Focus on Diagnostics and Solutions

When an error or unexpected behavior arises, address only one identified problem at a time. Do not propose a solution that attempts to resolve multiple distinct issues simultaneously. Each proposed change should be focused narrowly on diagnosing or fixing one specific symptom or error until that particular problem is confirmed resolved.

### Reusable Abstractions

When developing new features or modifying existing ones, always first identify if the required logic (data fetching, data processing, UI rendering, event handling) can be generalized into a reusable function, class, or module.

Specifically, if a pattern of operations is identified beyond its immediate use-case, propose to abstract it into a reusable unit.

- **Detect Pattern:** Scan for similar logic in existing methods (e.g., data preparation for display, common UI component rendering).
- **Propose Abstraction:** Suggest creating a new, dedicated private method, public method, or helper module for this common logic.
- **Refactor & Reuse:** Only after the abstraction is agreed upon, refactor existing code to use it and then apply it to the new feature.

### IMPORTANT RULE

**NEVER START CODING A NEW FEATURE OR FIXING A BUG UNLESS SPECIFICALLY INSTRUCTED TO DO SO!**
