# Baltic Habitat Model Review Platform

> A professional web application for expert review of 300+ species habitat models across Fish, Invertebrates, and Macrophytes in the Baltic Sea.

## Project Purpose

Species experts need to review habitat distribution models (TIF/PDF maps + CSV metadata) for Baltic Sea organisms. The platform provides a structured, efficient review workflow with persistent reviewer identity, standardized flagging (Red/Yellow/Green), and free-text commentary.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript)                               │
│                                                              │
│  ┌─────────┐  ┌──────────────────────────────────────────┐   │
│  │ Sidebar  │  │  Main Content                           │   │
│  │          │  │  ┌─────────────┐ ┌────────────────────┐ │   │
│  │ Category │  │  │  Zoomable   │ │  Species Info      │ │   │
│  │ Selector │  │  │  Map Panel  │ │  (from CSV)        │ │   │
│  │          │  │  │  (TIF/PDF)  │ │                    │ │   │
│  │ Species  │  │  │             │ ├────────────────────┤ │   │
│  │ List     │  │  │             │ │  Review Form       │ │   │
│  │ (A → Z)  │  │  │             │ │  - Reviewer name   │ │   │
│  │          │  │  │             │ │  - Flag (R/Y/G)    │ │   │
│  │          │  │  │             │ │  - Comments        │ │   │
│  └─────────┘  │  └─────────────┘ └────────────────────┘ │   │
│               └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Map Rendering**: Leaflet / OpenLayers (for GeoTIFF) + PDF.js (for PDF fallback)
- **GeoTIFF parsing**: geotiff.js / georaster-layer-for-leaflet
- **CSV Parsing**: PapaParse
- **State**: Zustand (lightweight global state for reviewer name persistence)
- **Data Storage**: JSON file export / localStorage for draft reviews
- **Testing**: Vitest + React Testing Library

## Data Structure

```
data/
├── fish/
│   ├── fish_details.csv              # One CSV with ALL fish species info
│   ├── binary_confidence_tif/        # One .tif per species
│   │   ├── Gadus_morhua.tif
│   │   ├── Clupea_harengus.tif
│   │   └── ...
│   └── binary_confidence_pdf/        # One .pdf per species (same maps)
│       ├── Gadus_morhua.pdf
│       ├── Clupea_harengus.pdf
│       └── ...
├── invertebrates/
│   ├── invertebrates_details.csv
│   ├── binary_confidence_tif/
│   └── binary_confidence_pdf/
└── macrophytes/
    ├── macrophytes_details.csv
    ├── binary_confidence_tif/
    └── binary_confidence_pdf/
```

**Key**: Each category has ONE shared CSV for all species metadata, plus TIF and PDF folders with one map file per species. Filenames match `scientific_name` from the CSV.

### CSV Fields

| Column | Description |
|--------|-------------|
| `scientific_name` | Latin species name (also matches TIF/PDF filenames) |
| `common_name` | Common/vernacular name |
| `flag` | Modeller's quality flag |
| `comment` | Modeller's comment on the model |
| `mean_TSS_ensemble` | Model performance metric (True Skill Statistic) |

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run test         # Vitest
```

## Performance Requirements

Reviewers process 100+ species per session. Navigation must feel instant.

### Principles
1. **CSV metadata loads upfront**: All 3 CSV files fetched in parallel on startup (~KB). Sidebar is navigable immediately.
2. **Maps load on demand**: Only the selected species' TIF/PDF is fetched. Never preload all maps.
3. **Preload neighbors**: When a species is selected, background-fetch the next and previous species' map.
4. **LRU map cache**: Keep last 5 parsed maps in memory. Evict oldest on overflow.
5. **Reuse Leaflet instance**: Swap layers on species change — never destroy/recreate the map container.
6. **AbortController**: Cancel in-flight map fetches if user navigates away before load completes.
7. **No blocking**: Map loading never blocks sidebar navigation or form interaction.

## Key Components

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Category selector + alphabetical species list (by scientific_name) |
| `MapViewer` | Zoomable TIF/PDF map display with Leaflet |
| `SpeciesInfo` | Shows common_name, mean_TSS_ensemble, modeller flag & comment |
| `ReviewForm` | Reviewer name (persistent), flag selector (R/Y/G), comments |
| `ReviewExport` | Export all reviews as CSV/JSON |

## Verification

Before committing:
1. `npm run typecheck` — no errors
2. `npm run lint` — clean
3. `npm run test` — all pass
4. Manual check: sidebar navigation, map zoom, form persistence

## File Boundaries

- **Safe to edit**: `/src/`, `/tests/`, `/public/`
- **Config**: `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- **Never touch**: `/node_modules/`, `/dist/`, `/.git/`

## Agent Team

This project uses specialized subagents:

| Agent | Role | Model |
|-------|------|-------|
| `ui-architect` | Layout, components, styling, UX | Sonnet |
| `map-engineer` | GeoTIFF/PDF rendering, Leaflet integration | Sonnet |
| `data-engineer` | CSV parsing, state management, data flow | Sonnet |
| `form-specialist` | Review form, validation, persistence, export | Sonnet |
| `qa-reviewer` | Code review, accessibility, cross-browser | Inherit |

## Agent Workflow

```
1. ui-architect    → Scaffold layout, sidebar, routing, design system
2. data-engineer   → CSV parsing, species index, data types, state store
3. map-engineer    → GeoTIFF/PDF viewer with zoom/pan in Leaflet
4. form-specialist → Review form with persistent name, flags, comments, export
5. qa-reviewer     → Review all code, accessibility, polish
6. ui-architect    → Final design pass, animations, responsive refinement
```

## Design Direction

Professional, scientific aesthetic. Think research-grade tooling:
- Clean sans-serif typography (e.g., IBM Plex Sans, Source Sans 3)
- Muted blue-grey palette with Baltic Sea tones
- High information density without clutter
- Crisp borders, subtle shadows, no decorative noise
- Traffic-light flag colors (Red #DC2626, Amber #F59E0B, Green #16A34A)
- Sidebar: dark background, light text for scanning comfort
