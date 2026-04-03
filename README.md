# Watermark & EXIF Explorer
A privacy-first single-page web app for inspecting EXIF metadata and batch-applying watermarks entirely in your browser.

## Features
- **Image intake**: Drag and drop or use the file picker to import JPEG, PNG, WebP, and HEIC images. Browse images in a thumbnail grid with multi-select and keyboard navigation.
- **EXIF inspector**: View camera, exposure, location, and file metadata in a grouped, searchable table. GPS fields include copy actions and quick map links.
- **Watermark configurator**: Add a text watermark or PNG logo, choose from a 9-point position grid, or freely drag placement on the live preview canvas. Adjust opacity and size, with auto-contrast colour selection.
- **Batch export**: Apply watermark settings to all images or selected images, then download as a ZIP. Includes a JPEG quality slider and progress bar, with processing handled in a Web Worker.
- **EXIF strip option**: Remove all metadata from exported files via a dedicated checkbox.

## Getting Started
Live demo: https://abassaf.github.io/watermark-exif-explorer/

This app runs fully client-side in the browser, with no server processing and no image uploads.

```bash
pnpm install
pnpm dev
pnpm build
```

## Tech Stack
- React 19
- TypeScript
- Vite 8
- Tailwind CSS v4
- Zustand
- exifr
- JSZip
- heic2any
- @fontsource
- Deployment: GitHub Pages
