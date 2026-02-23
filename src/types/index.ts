// ---------------------------------------------------------------------------
// Core domain types for the Baltic Habitat Review Platform
// ---------------------------------------------------------------------------

export type Category = 'fish' | 'invertebrates' | 'macrophytes';

// Reviewer flag applied during review — null means not yet reviewed
export type FlagValue = 'red' | 'yellow' | 'green' | null;

// ---------------------------------------------------------------------------
// Species — one row from a category's *_details.csv
//
// All fields preserve the raw CSV column names so downstream consumers can
// reference exactly what the modellers produced.  Numeric fields are parsed
// to number; everything else is string.
// ---------------------------------------------------------------------------
export interface Species {
  // Identity
  scientific_name: string;   // e.g. "Gadus.morhua"  (matches TIF/PDF filename)
  common_name: string;       // e.g. "Atlantic cod"
  short_name: string;        // abbreviated name used in model run

  // Model metadata from modeller
  flag: string;              // modeller's quality flag: "green" | "yellow" | "red" | ""
  comment: string;           // free-text modeller comment

  // Observation & run metadata
  quantity: number;          // total number of records used
  run_name: string;          // model run identifier
  observation_methods: string; // comma-separated list of survey methods
  method_predict_to: string; // prediction method used

  // Model composition
  models: string;            // comma-separated list of candidate algorithms
  kept_algos: string;        // comma-separated list of retained algorithms
  n_kept_algos: number;      // count of retained algorithms

  // Occurrence counts
  num_presence: number;
  num_absence: number;

  // Performance metrics
  mean_TSS_ensemble: number;           // primary metric (True Skill Statistic)
  mean_TSS_all_submodels: number;      // TSS averaged across all sub-models
  metric_select_and_weight: string;    // metric used to select & weight models
  metric_binary: string;               // metric used for binary threshold

  // Derived category — injected during parsing (not in CSV)
  category: Category;
}

// ---------------------------------------------------------------------------
// Review — one reviewer's assessment of one species
// ---------------------------------------------------------------------------
export interface Review {
  reviewer_name: string;
  flag: FlagValue;    // reviewer's own traffic-light judgement
  comment: string;    // reviewer's free-text notes
  timestamp: string;  // ISO 8601, set when review is saved
}

// ---------------------------------------------------------------------------
// CategoryConfig — static configuration for a data category
// ---------------------------------------------------------------------------
export interface CategoryConfig {
  id: Category;
  label: string;           // Human-readable label shown in the UI
  csvPath: string;         // Relative path from project root to the CSV
  pngBasePath: string;     // Relative path to the PNG folder (no trailing slash)
  pdfBasePath: string;     // Relative path to the PDF folder (no trailing slash)
  tifBasePath: string;     // Relative path to the TIF folder (no trailing slash)
  available: boolean;      // false → data not yet loaded; show "coming soon"
}

// ---------------------------------------------------------------------------
// SpeciesIndex — the fully-loaded catalogue, one sorted array per category
// ---------------------------------------------------------------------------
export type SpeciesIndex = Record<Category, Species[]>;
