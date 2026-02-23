import Papa from 'papaparse';
import type { Category, CategoryConfig, Species, SpeciesIndex } from '@/types';
import { CATEGORY_CONFIGS } from '@/utils/category-config';

// ---------------------------------------------------------------------------
// Raw row shape exactly as PapaParse hands it back.
// All values are strings — we coerce numerics ourselves.
// ---------------------------------------------------------------------------
interface RawSpeciesRow {
  flag: string;
  comment: string;
  scientific_name: string;
  common_name: string;
  quantity: string;
  use_method_cov: string;
  run_initiated: string;
  run_completed: string;
  run_time: string;
  models: string;
  num_presence: string;
  num_absence: string;
  run_name: string;
  observation_methods: string;
  method_predict_to: string;
  mean_TSS_ensemble: string;
  mean_TSS_all_submodels: string;
  metric_select_and_weight: string;
  metric_binary: string;
  short_name: string;
  kept_algos: string;
  n_kept_algos: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a string to a number; return 0 for empty / unparseable values. */
function toNumber(value: string): number {
  const n = parseFloat(value.trim());
  return isNaN(n) ? 0 : n;
}

/** Consistent alphabetical sort using English locale collation rules. */
const collator = new Intl.Collator('en', { sensitivity: 'base' });

function sortByScientificName(species: Species[]): Species[] {
  return [...species].sort((a, b) =>
    collator.compare(a.scientific_name, b.scientific_name),
  );
}

/** Map a raw CSV row to a typed Species object. */
function rowToSpecies(row: RawSpeciesRow, category: Category): Species {
  return {
    scientific_name: row.scientific_name.trim(),
    common_name: row.common_name.trim(),
    short_name: row.short_name.trim(),
    flag: row.flag.trim(),
    comment: row.comment.trim(),
    quantity: toNumber(row.quantity),
    run_name: row.run_name.trim(),
    observation_methods: row.observation_methods.trim(),
    method_predict_to: row.method_predict_to.trim(),
    models: row.models.trim(),
    kept_algos: row.kept_algos.trim(),
    n_kept_algos: toNumber(row.n_kept_algos),
    num_presence: toNumber(row.num_presence),
    num_absence: toNumber(row.num_absence),
    mean_TSS_ensemble: toNumber(row.mean_TSS_ensemble),
    mean_TSS_all_submodels: toNumber(row.mean_TSS_all_submodels),
    metric_select_and_weight: row.metric_select_and_weight.trim(),
    metric_binary: row.metric_binary.trim(),
    category,
  };
}

// ---------------------------------------------------------------------------
// loadCategoryData
//
// Fetches and parses one category's CSV, returning a sorted Species[].
// Throws a descriptive Error on network or parse failure — the caller
// (loadAllCategories) decides whether to surface or swallow it.
// ---------------------------------------------------------------------------
export async function loadCategoryData(config: CategoryConfig): Promise<Species[]> {
  const response = await fetch(config.csvPath);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${config.csvPath}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const csvText = await response.text();

  return new Promise<Species[]>((resolve, reject) => {
    Papa.parse<RawSpeciesRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete(results) {
        if (results.errors.length > 0) {
          // Surface the first meaningful parse error; PapaParse errors include
          // a row index and message which is useful for debugging.
          const firstError = results.errors[0];
          reject(
            new Error(
              `CSV parse error in ${config.csvPath} (row ${firstError.row ?? '?'}): ${firstError.message}`,
            ),
          );
          return;
        }

        const species = results.data
          .filter((row) => row.scientific_name && row.scientific_name.trim() !== '')
          .map((row) => rowToSpecies(row, config.id));

        resolve(sortByScientificName(species));
      },
      error(err: Error) {
        reject(new Error(`CSV parse failed for ${config.csvPath}: ${err.message}`));
      },
    });
  });
}

// ---------------------------------------------------------------------------
// loadAllCategories
//
// Fetches all three CSVs in parallel.  Unavailable categories (available:
// false) return an empty array immediately without making a network request.
// Available categories that fail return an empty array and log a warning so
// that a single broken CSV does not prevent the rest of the app from loading.
// ---------------------------------------------------------------------------
export async function loadAllCategories(): Promise<SpeciesIndex> {
  const results = await Promise.allSettled(
    CATEGORY_CONFIGS.map((config) =>
      config.available ? loadCategoryData(config) : Promise.resolve([] as Species[]),
    ),
  );

  const index: SpeciesIndex = {
    fish: [],
    invertebrates: [],
    macrophytes: [],
  };

  CATEGORY_CONFIGS.forEach((config, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      index[config.id] = result.value;
    } else {
      console.warn(
        `[csv-loader] Could not load data for category "${config.id}":`,
        result.reason,
      );
      index[config.id] = [];
    }
  });

  return index;
}

// ---------------------------------------------------------------------------
// Path helpers — derive file URLs for a species' map assets
// ---------------------------------------------------------------------------

/** Returns the URL path for a species' PNG file. */
export function getPngPath(config: CategoryConfig, scientificName: string): string {
  return `${config.pngBasePath}/${scientificName}.png`;
}

/** Returns the URL path for a species' TIF file. */
export function getTifPath(config: CategoryConfig, scientificName: string): string {
  return `${config.tifBasePath}/${scientificName}.tif`;
}

/** Returns the URL path for a species' PDF file. */
export function getPdfPath(config: CategoryConfig, scientificName: string): string {
  return `${config.pdfBasePath}/${scientificName}.pdf`;
}
