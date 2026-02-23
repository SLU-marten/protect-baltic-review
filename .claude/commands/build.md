# Build Habitat Review Platform

Orchestrate the full build of the review platform using the agent team.

## Process

### Phase 1: Foundation
Use the **data-engineer** subagent to:
1. Define all TypeScript types in `src/types/`
2. Build CSV loader that fetches all 3 category CSVs in parallel
3. Build species index from CSV rows + TIF/PDF file path derivation
4. Set up Zustand store with localStorage persistence
5. Implement LRU map cache and preloading utilities
6. Verify types compile cleanly

### Phase 2: Layout & Navigation
Use the **ui-architect** subagent to:
1. Initialize Vite + React + TypeScript + Tailwind project
2. Build the app shell (sidebar + content area)
3. Implement Sidebar with category tabs and species list
4. Implement content header with species name
5. Set up panel layout (60/40 split)
6. Verify layout renders correctly

### Phase 3: Map Viewer
Use the **map-engineer** subagent to:
1. Install geospatial dependencies
2. Build GeoTIFF rendering pipeline
3. Build PDF fallback renderer
4. Add zoom/pan controls
5. Test with sample data

### Phase 4: Form & Info Panel
Use the **form-specialist** subagent to:
1. Build SpeciesInfo panel (CSV metadata display)
2. Build ReviewForm with persistent name, flags, comments
3. Implement auto-save with debouncing
4. Build CSV/JSON export functionality
5. Test persistence across species changes

### Phase 5: Integration & QA
Use the **qa-reviewer** subagent to:
1. Run full quality audit
2. Fix all critical and important issues
3. Verify accessibility
4. Test complete workflow end-to-end

### Phase 6: Polish
Use the **ui-architect** subagent for:
1. Final design refinements
2. Loading states and transitions
3. Empty states and error states
4. Responsive adjustments
