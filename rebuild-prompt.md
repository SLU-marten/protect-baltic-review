# Protect Baltic Review Platform — Full Build Prompt

## Starting State
I have the following file structure:
```
final_reports/
├── CLAUDE.md                          # Project instructions (keep as-is)
├── package.json                       # (may or may not exist yet)
├── fish/
│   ├── fish_details.csv               # CSV with all fish species metadata
│   ├── binary_confidence_pdf/         # One PDF map per species
│   └── binary_confidence_tif/         # One TIF map per species
├── invertebrates/
│   ├── invertebrates_details.csv
│   ├── binary_confidence_pdf/
│   └── binary_confidence_tif/
└── macrophytes/
    ├── macrophytes_details.csv
    ├── binary_confidence_pdf/
    └── binary_confidence_tif/
```

## Goal
Build a professional React SPA for species experts to review ~300+ Baltic Sea habitat distribution models. Deploy to GitHub Pages.

## Tech Stack
- Vite + React 18 + TypeScript + Tailwind CSS v4 (@tailwindcss/vite)
- Zustand with persist middleware for state
- PapaParse for CSV parsing
- No map library — use plain `<img>` with CSS transforms for zoom/pan

## Phase 1: Project Scaffold
Initialize Vite + React + TypeScript project. Install dependencies:
- zustand, papaparse, @types/papaparse
- @tailwindcss/vite, tailwindcss

Configure vite.config.ts:
- `base: '/protect-baltic-review/'`
- Path alias `@` → `./src`
- `server.fs.allow: ['..']`

## Phase 2: Convert PDFs to Cropped PNGs
Create a Python script (`scripts/pdf-to-cropped-png.py`) using PyMuPDF (fitz) + Pillow:
1. Render each PDF at 6x zoom (matrix = fitz.Matrix(6, 6))
2. Convert to PIL Image
3. Crop to the grey map box only — analyze pixel layout to find the grey rectangle boundaries (exclude title bar, legend, and whitespace). The grey box is the map area containing the colored species distribution.
4. Save as PNG to `{category}/binary_confidence_png/`

Run this for the fish category. Copy the resulting PNGs + fish_details.csv into `public/fish/`.

## Phase 3: TypeScript Types (`src/types/index.ts`)
```typescript
Category = 'fish' | 'invertebrates' | 'macrophytes'
FlagValue = 'red' | 'yellow' | 'green' | null

Species interface — all CSV columns:
  scientific_name, common_name, short_name, flag, comment,
  quantity, run_name, observation_methods, method_predict_to,
  models, kept_algos, n_kept_algos, num_presence, num_absence,
  mean_TSS_ensemble, mean_TSS_all_submodels, metric_select_and_weight,
  metric_binary, category (injected during parse)

Review interface:
  reviewer_name, flag (FlagValue), comment, timestamp (ISO string)

CategoryConfig interface:
  id, label, csvPath, pngBasePath, pdfBasePath, tifBasePath, available (boolean)

SpeciesIndex = Record<Category, Species[]>
```

## Phase 4: Category Config (`src/utils/category-config.ts`)
Use `import.meta.env.BASE_URL` for all paths. Three categories:
- fish (available: true)
- invertebrates (available: false)
- macrophytes (available: false)

Each has csvPath, pngBasePath, pdfBasePath, tifBasePath.

## Phase 5: CSV Loader (`src/utils/csv-loader.ts`)
- Fetch all 3 CSVs in parallel using PapaParse
- Parse numeric fields (quantity, num_presence, num_absence, n_kept_algos, mean_TSS_ensemble, mean_TSS_all_submodels)
- Sort species alphabetically by scientific_name
- Inject `category` field during parse
- Export `getPngPath(species)` helper that builds the PNG URL from BASE_URL + category + scientific_name

## Phase 6: Zustand Store (`src/store/index.ts`)
State:
- categories (SpeciesIndex), isLoading, error
- activeCategory (persisted), selectedSpecies
- reviewerName (persisted)
- reviews Record<string, Review> (persisted) — keyed by "category:scientific_name"

Actions:
- loadData() — fetches CSVs, sets initial selection
- setActiveCategory() — switches category, auto-selects first species
- setSelectedSpecies()
- setReviewerName()
- saveReview(), getReview(), getReviewFlag(), getHasReview()

Persist config: persist reviewerName, activeCategory, and reviews to localStorage.
Key: 'habitat-review-storage'

## Phase 7: Google Sheets Integration (`src/utils/google-sheets.ts`)
POST reviews to this Google Apps Script endpoint (no-cors mode):
`https://script.google.com/macros/s/AKfycbyQpdrMP4zndOsBd1ROk603iYiEafKK2Q1lrmXS9anthy2BdflULw7mfo-DdC3wy0AW/exec`

Send: category, scientific_name, reviewer_name, flag, comment as JSON.

## Phase 8: App Shell (`src/App.tsx`)
Layout:
- Left sidebar: fixed width ~260px, dark background (slate-800)
- Right content area: split into map (top/left ~60%) and info+form panel (bottom/right ~40%)
- Content header: just shows scientific name (dots replaced with spaces), with prev/next navigation arrows

## Phase 9: Sidebar (`src/components/Sidebar.tsx`)
From top to bottom:
1. **App title**: "Protect Baltic Review" with a wave SVG icon
2. **Category tabs**: Fish / Invertebrates / Macrophytes. Unavailable tabs show "Soon" badge and are disabled.
3. **Search input**: Filters species by scientific_name or common_name. "/" keyboard shortcut to focus.
4. **Species count**: "110 species" or "5 of 110 species" when filtered
5. **Species list**: Scrollable, keyboard navigable (arrow keys). Each item shows:
   - Scientific name (italic, dots replaced with spaces)
   - Two flag dots in fixed columns on the right:
     - **M** (Modeller's flag) — colored dot from CSV species.flag, only visible if set
     - **R** (Reviewer's flag) — colored dot from store review, only visible if reviewed
     - White dot with border for review without flag (comment only)
     - Tooltip on hover: "Modeller's flag" / "Reviewer's flag"
     - Both columns always present (invisible when empty to maintain alignment)
   - Selected item has blue left border accent

Flag dot colors: red=#DC2626, yellow=#F59E0B, green=#16A34A

## Phase 10: MapViewer (`src/components/MapViewer.tsx`)
PNG-based map viewer with custom CSS transform zoom/pan. This is the most complex component.

Key constants:
- `PNG_SCALE = 6` — divide naturalWidth/Height by this for logical CSS size
- `MAX_ZOOM = 4`
- No fixed MIN_ZOOM — computed dynamically as fit-to-view scale

Features:
1. **Image loading**: Fetch PNG via `getPngPath()`. Show loading spinner. Use AbortController to cancel on species change.
2. **Fit-to-view**: Compute scale that fits image exactly in container (no margins). This is also the minimum zoom.
3. **Zoom**: CSS `transform: translate(x,y) scale(s)` on a wrapper div. Transform origin at 0,0.
4. **Focal-point zoom**: Wheel zoom zooms toward cursor position. Use `applyZoom` that accepts `number | ((prev: number) => number)` for correct batching during rapid wheel events.
5. **Pan clamping**: `clampPan()` ensures image always covers the entire viewport — no gaps/margins on any side.
6. **Wheel zoom optimization**: Disable CSS transition during wheel zoom via direct DOM manipulation on wrapper ref. Re-enable 200ms after last wheel event via timeout.
7. **Button zoom**: Smooth 150ms ease-out transition for zoom in/out buttons.
8. **Drag to pan**: Pointer capture on pointerdown, track movement, release on pointerup. Apply clampPan after every move.
9. **Keyboard**: +/- for zoom, arrow keys for pan, 0 for fit-to-view.
10. **Fullscreen**: Toggle via Fullscreen API.

Use refs extensively to avoid stale closures:
- `imgSizeRef` for current image logical dimensions
- `wrapperRef` for direct DOM transition manipulation
- `wheelEndTimerRef` for debouncing wheel-end

Zoom controls overlay (top-right):
- Zoom in, Zoom out (disabled at min), Fit to view, Fullscreen toggle
- `onPointerDown stopPropagation` on controls wrapper to prevent container's pointer capture

Static **MapLegend** component (top-left overlay):
- 4 color swatches: Absent (high confidence), Absent (low confidence), Present (low confidence), Present (high confidence)
- Semi-transparent dark background, always visible

## Phase 11: SpeciesInfo (`src/components/SpeciesInfo.tsx`)
Shows when a species is selected. Layout:
1. "Model Information" heading (uppercase, slate-400)
2. Scientific name (italic, bold) + common name below
3. "Model score" heading (bold) → "TSS (Ensemble)" label + numeric value (mono font, 3 decimals)
4. "Modeller's comment" heading (bold) → comment text (or "No comment provided") → FlagBadge below

FlagBadge: colored pill badge (green/yellow/red) with white/dark text. "Not set" if empty.

## Phase 12: ReviewForm (`src/components/ReviewForm.tsx`)
1. "Expert Review" heading with "Submitted" checkmark indicator (fades in/out)
2. **Instructions paragraph**: "Please mark species with an appropriate flag. Marking species with a red flag indicates that based on your expert judgement, the species should be removed and therefore not included in the product delivery, not published in the HELCOM Maps and Data Service, and not used in subsequent analyses in the project. Marking a species with a yellow flag indicates that the map is of sufficient quality to be published but should be used with caution. Please add comments justifying your decision, particularly when marking species with a red flag."
   - "red flag" styled in red color (#DC2626), "yellow flag" styled in yellow color (#F59E0B)
3. **Reviewer name**: Text input, persisted across species/sessions
4. **Assessment Flag**: Three toggle buttons (radio group):
   - Red: "Remove species (map highly inaccurate)"
   - Yellow: "Keep species (but flag as somewhat inaccurate)"
   - Green: "Keep species (map is sufficiently accurate)"
   - Click again to deselect. Arrow keys navigate between flags. Min height 60px for longer descriptions.
5. **Comments**: Textarea, auto-focused after flag selection
6. **Submit button**: Sends to Google Sheets + saves locally. Disabled until name >= 2 chars and (flag or comment set). Shows "Submitting..." during request.
7. **Error display** if submit fails
8. **Last submitted timestamp**

Form loads existing review data when switching species.

## Phase 13: Styling
- Design: Professional, scientific. Muted blue-grey palette.
- Sidebar: dark (slate-800), light text
- Content: white/light grey background
- Clean sans-serif typography
- Traffic-light colors: Red #DC2626, Amber #F59E0B, Green #16A34A
- High density, no decorative noise

## Phase 14: GitHub Pages Deployment
Create `.github/workflows/deploy.yml`:
- Trigger on push to main
- Node 20, npm ci, npm run build
- Upload dist/ as pages artifact
- Deploy via actions/deploy-pages@v4

Create `.gitignore`: node_modules/, dist/, *.tif, .claude/, CLAUDE.md

## Performance Requirements
- CSV metadata loads upfront (all 3 in parallel)
- Maps load on demand only for selected species
- AbortController cancels in-flight fetches on navigation
- Sidebar navigation never blocked by map loading
- Zoom feels instant (no lag on scroll wheel)
