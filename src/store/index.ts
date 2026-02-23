import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, FlagValue, Review, Species, SpeciesIndex } from '@/types';
import { loadAllCategories } from '@/utils/csv-loader';

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface AppState {
  // ---- Loaded species data (runtime, not persisted) -----------------------
  categories: SpeciesIndex;
  isLoading: boolean;
  error: string | null;

  // ---- Navigation (activeCategory is persisted) ---------------------------
  activeCategory: Category;
  selectedSpecies: Species | null;

  // ---- Reviewer identity (persisted) --------------------------------------
  reviewerName: string;

  // ---- Reviews (session-only, NOT persisted) --------------------------------
  // Keyed by "{category}:{scientific_name}" for unambiguous lookup across
  // the full catalogue.  Used only for sidebar flag dots during the session.
  reviews: Record<string, Review>;

  // ---- Actions ------------------------------------------------------------
  loadData: () => Promise<void>;
  setActiveCategory: (cat: Category) => void;
  setSelectedSpecies: (species: Species | null) => void;
  setReviewerName: (name: string) => void;
  saveReview: (category: Category, scientificName: string, review: Omit<Review, 'timestamp'>) => void;
  getReview: (category: Category, scientificName: string) => Review | undefined;
  getReviewFlag: (category: Category, scientificName: string) => FlagValue;
}

// ---------------------------------------------------------------------------
// Review key helper — consistent across the codebase
// ---------------------------------------------------------------------------
export function reviewKey(category: Category, scientificName: string): string {
  return `${category}:${scientificName}`;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ---- Initial state --------------------------------------------------
      categories: {
        fish: [],
        invertebrates: [],
        macrophytes: [],
      },
      isLoading: false,
      error: null,
      activeCategory: 'fish',
      selectedSpecies: null,
      reviewerName: '',
      reviews: {},

      // ---- loadData -------------------------------------------------------
      // Fetches all three CSVs in parallel on app startup.  Safe to call
      // multiple times — re-entrant calls while loading are ignored.
      loadData: async () => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const categories = await loadAllCategories();

          // After loading, derive the initial selected species.
          // Honour the already-persisted activeCategory.
          const activeCategory = get().activeCategory;
          const list = categories[activeCategory];
          const selectedSpecies = list.length > 0 ? list[0] : null;

          set({ categories, isLoading: false, selectedSpecies });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unknown error loading species data.';
          set({ isLoading: false, error: message });
        }
      },

      // ---- setActiveCategory ----------------------------------------------
      // Switches category and auto-selects the first species in the new list.
      setActiveCategory: (cat: Category) => {
        const { categories } = get();
        const list = categories[cat];
        const selectedSpecies = list.length > 0 ? list[0] : null;
        set({ activeCategory: cat, selectedSpecies });
      },

      // ---- setSelectedSpecies ---------------------------------------------
      setSelectedSpecies: (species: Species | null) => {
        set({ selectedSpecies: species });
      },

      // ---- setReviewerName ------------------------------------------------
      setReviewerName: (name: string) => {
        set({ reviewerName: name.trimStart() });
      },

      // ---- saveReview -----------------------------------------------------
      // Accepts a partial Review (without timestamp) and stamps it on save.
      saveReview: (
        category: Category,
        scientificName: string,
        review: Omit<Review, 'timestamp'>,
      ) => {
        const key = reviewKey(category, scientificName);
        const stamped: Review = {
          ...review,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          reviews: { ...state.reviews, [key]: stamped },
        }));
      },

      // ---- getReview ------------------------------------------------------
      getReview: (category: Category, scientificName: string) => {
        return get().reviews[reviewKey(category, scientificName)];
      },

      // ---- getReviewFlag --------------------------------------------------
      // Convenience selector for sidebar status indicators.
      getReviewFlag: (category: Category, scientificName: string): FlagValue => {
        const review = get().reviews[reviewKey(category, scientificName)];
        return review?.flag ?? null;
      },

    }),

    // ---- Persistence config -----------------------------------------------
    // Only reviewer identity and reviews are persisted — species data is
    // re-fetched fresh from CSV on every session so it always reflects the
    // latest modelling outputs.  activeCategory is persisted as a UX nicety
    // so reviewers return to where they left off.
    {
      name: 'habitat-review-storage',
      partialize: (state) => ({
        reviewerName: state.reviewerName,
        activeCategory: state.activeCategory,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Selector helpers — memoisation-friendly functions for components to import
// directly rather than duplicating selector logic.
// ---------------------------------------------------------------------------

/** Returns the sorted species list for the currently active category. */
export function selectActiveSpeciesList(state: AppState): Species[] {
  return state.categories[state.activeCategory];
}

/** Returns true when at least one category has data loaded. */
export function selectHasData(state: AppState): boolean {
  return Object.values(state.categories).some((list) => list.length > 0);
}
