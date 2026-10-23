# Instagram Carousel PNG Exporter

A production-quality local web application that converts existing HTML, CSS, and JavaScript carousel designs into individual, high-resolution, pixel-perfect Instagram PNG images (default: **1080 × 1350 px**, 4:5 portrait).

Built with **React, TypeScript, Vite, Tailwind CSS, Node.js, Express, Playwright Chromium, Sharp, and JSZip**.

---

## 🌟 Key Features

1. **Flexible File Import**:
   - Drag and drop HTML files, ZIP archives, or full project folders.
   - 1-Click **"Load Current Project (index.html)"** button for testing the existing carousel instantly.
   - Automatically detects entry HTML and scans for missing assets.

2. **Automated Slide Detection**:
   - Auto-detects slide containers (`.slide`, `.carousel-slide`, `.carousel-item`, `.swiper-slide`, `.post-slide`, `[data-slide]`).
   - Discovers candidate elements and allows custom CSS selector override.
   - Preserves DOM order, displays slide counts, labels, dimensions, and allows manual reordering.

3. **Instagram Presets & Custom Dimensions**:
   - **Instagram Portrait**: `1080 × 1350 px` (4:5) — **Default Recommended**
   - **Instagram Square**: `1080 × 1080 px` (1:1)
   - **Instagram Landscape**: `1080 × 566 px` (1.91:1)
   - **Instagram Story / Reel**: `1080 × 1920 px` (9:16)
   - **Custom Dimensions**: Up to 8000 × 8000 px.
   - **Resolution Multipliers**: 1x, 2x (Retina HD), 3x (Ultra 4K).

4. **Accurate Browser Rendering**:
   - Uses **Playwright with Chromium** in an isolated browser context.
   - Synchronizes `document.fonts.ready` and image decoding before capture.
   - Isolates slides even when structured in horizontal rows or container-query units (`cqw`).
   - Configurable animation capture: Stable / Final state, Delay in ms, or Timeline timestamp.
   - Image verification via **Sharp**: guarantees exact output dimensions down to the pixel.

5. **Export & Download Options**:
   - Real-time queued background processing with per-slide progress tracking.
   - Download individual high-res PNGs (`slide-01.png`, `slide-02.png`, etc.).
   - Download selected slides as a ZIP archive.
   - Download all exported slides as a single ZIP archive.
   - Retry failed slides with one click.
   - Lightbox modal for full-resolution inspection.

---

## 📁 Project Structure

```
.
├── index.html                   # Original source carousel (untouched)
├── export_carousel.js           # Original source script (untouched)
├── package.json                 # Monorepo root configuration
├── tsconfig.json                # Shared TypeScript compiler options
├── vitest.config.ts             # Vitest unit test configuration
├── playwright.config.ts         # Playwright E2E test configuration
├── apps/
│   ├── server/                  # Node.js + Express + Playwright + Sharp API
│   │   ├── src/
│   │   │   ├── config/constants.ts
│   │   │   ├── middleware/validation.ts, errorHandler.ts
│   │   │   ├── routes/project.routes.ts, export.routes.ts, download.routes.ts
│   │   │   ├── services/
│   │   │   │   ├── projectImporter.ts
│   │   │   │   ├── assetResolver.ts
│   │   │   │   ├── slideDetector.ts
│   │   │   │   ├── browserRenderingService.ts
│   │   │   │   ├── imageProcessingService.ts
│   │   │   │   ├── exportJobManager.ts
│   │   │   │   └── zipPackagingService.ts
│   │   │   ├── server.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── web/                     # React + Vite + Tailwind CSS Frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── Header.tsx
│       │   │   ├── ImportDropzone.tsx
│       │   │   ├── SlideSelector.tsx
│       │   │   ├── ExportSettingsPanel.tsx
│       │   │   ├── PreviewWorkspace.tsx
│       │   │   ├── ConversionProgress.tsx
│       │   │   ├── ExportResults.tsx
│       │   │   └── ImageModal.tsx
│       │   ├── hooks/useExportJob.ts
│       │   ├── services/api.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   └── shared/                  # Shared TypeScript types, Zod schemas, constants
│       ├── src/
│       │   ├── types.ts
│       │   ├── presets.ts
│       │   ├── schemas.ts
│       │   └── index.ts
│       └── package.json
└── tests/
    ├── unit/                    # Vitest unit tests
    │   ├── schemas.test.ts
    │   ├── imageProcessing.test.ts
    │   ├── zipPackaging.test.ts
    │   └── slideDetector.test.ts
    └── e2e/                     # Playwright end-to-end tests
        └── exportWorkflow.spec.ts
```

---

## 🚀 Installation & Startup

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24.21.0)
- **npm**: v9+ (tested on npm 11.19.0)
- **macOS** / Linux / Windows

### 2. Install Dependencies & Playwright Browser
```bash
npm install
npx playwright install chromium
```

### 3. Start Development Servers
```bash
npm run dev
```
This runs both the backend API and frontend Vite server concurrently:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

*(Individual servers can also be started with `npm run dev:server` or `npm run dev:web`)*

---

## 🧪 Running Automated Tests

### Unit Tests (Vitest)
```bash
npm test
```
Runs 8 unit tests across 4 test suites covering schema validation, Sharp image processing, ZIP packaging, and slide detection on the actual project `index.html`.

### End-to-End Tests (Playwright)
```bash
npm run test:e2e
```
Executes the complete workflow:
1. Spawns backend and frontend dev servers.
2. Loads `index.html` carousel.
3. Detects all 6 slides (`.slide`).
4. Converts all slides to 1080 × 1350 PNG images via Playwright Chromium.
5. Verifies all 6 cards appear and downloads the generated ZIP archive.
6. Inspects the unpacked PNGs using Sharp to verify dimensions are exactly `1080 × 1350 px`.

### Build Production Bundle
```bash
npm run build
```

---

## 📖 User Guide

### How to Import a Project
1. Open `http://localhost:5173`.
2. Click **"Load Current Project (index.html)"** to test your existing carousel immediately, OR:
3. Drag & drop any `.html` file, a `.zip` archive containing an HTML/CSS/JS project, or click **"Upload complete folder"**.
4. If multiple HTML files exist, choose the entry file from the dropdown.

### How to Configure Export Dimensions
1. In the **3. Instagram Export Settings** panel, select a preset:
   - Default: **Instagram Portrait (1080 × 1350)**
   - Or select Square, Landscape, Story, or Custom.
2. Select a **Resolution Multiplier**:
   - `1x` (1080 × 1350 px)
   - `2x` (2160 × 2700 px)
   - `3x` (3240 × 4050 px)
3. Select **Fit Mode**:
   - `Contain` (Safe, no cropping)
   - `Cover` (Fills canvas)
   - `Crop` (Warns if content will be trimmed)
4. Select **Background**: Original, Transparent, or Custom Hex color.
5. Set optional **Inner Padding** (0px - 120px).

### How to Export and Download
1. Click the primary button: **"Convert to PNG (X Slides)"**.
2. Watch the live progress bar and per-slide status badges.
3. Once complete:
   - Click **"Download PNG"** on any slide card for an individual file.
   - Check desired slides and click **"Download Selected (X)"**.
   - Click **"Download All as ZIP"** to download all slides packaged together.
   - Click any slide thumbnail to open the high-res inspect modal.

---

## 🔒 Security & Local Isolation
- **Untrusted Code Isolation**: Rendered HTML/JS is served in a strictly sandboxed directory (`apps/server/temp/sessions/:sessionId`).
- **Path Traversal Protection**: All asset and file requests use strict path resolution checks against the session directory root, preventing directory traversal (`..`) attacks.
- **Archive Security**: Zip-slip protection rejects archive entries containing relative traversal paths or absolute targets.
- **Resource Limits**: File uploads capped at 100MB, decompressed archives at 250MB, max 500 files, and Playwright execution timeout capped per slide.
- **No External Data Transmission**: All rendering, image manipulation, and packaging execute 100% locally on your machine without third-party services.
