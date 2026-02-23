import type { CategoryConfig } from '@/types';

// ---------------------------------------------------------------------------
// Static configuration for each species category.
//
// Paths are relative to the project root (Vite serves the project root as the
// static file root via `server.fs.allow: ['..']`).  The Vite dev server and
// production build both resolve these via fetch() from the browser.
// ---------------------------------------------------------------------------

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    id: 'fish',
    label: 'Fish',
    csvPath: `${BASE}/fish/fish_details.csv`,
    pngBasePath: `${BASE}/fish/binary_confidence_png`,
    pdfBasePath: `${BASE}/fish/binary_confidence_pdf`,
    tifBasePath: `${BASE}/fish/binary_confidence_tif`,
    available: true,
  },
  {
    id: 'invertebrates',
    label: 'Invertebrates',
    csvPath: `${BASE}/invertebrates/invertebrates_details.csv`,
    pngBasePath: `${BASE}/invertebrates/binary_confidence_png`,
    pdfBasePath: `${BASE}/invertebrates/binary_confidence_pdf`,
    tifBasePath: `${BASE}/invertebrates/binary_confidence_tif`,
    available: false,
  },
  {
    id: 'macrophytes',
    label: 'Macrophytes',
    csvPath: `${BASE}/macrophytes/macrophytes_details.csv`,
    pngBasePath: `${BASE}/macrophytes/binary_confidence_png`,
    pdfBasePath: `${BASE}/macrophytes/binary_confidence_pdf`,
    tifBasePath: `${BASE}/macrophytes/binary_confidence_tif`,
    available: false,
  },
];

// Convenience lookup: category id → config
export const CATEGORY_CONFIG_MAP: Record<string, CategoryConfig> = Object.fromEntries(
  CATEGORY_CONFIGS.map((c) => [c.id, c]),
);
