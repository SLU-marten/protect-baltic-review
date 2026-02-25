import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { Sidebar } from '@/components/Sidebar';
import { MapViewer } from '@/components/MapViewer';
import { SpeciesInfo } from '@/components/SpeciesInfo';
import { ReviewForm } from '@/components/ReviewForm';

// ---------------------------------------------------------------------------
// LoadingSpinner — shown while CSV data is being fetched on startup
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50"
      role="status"
      aria-label="Loading species data"
    >
      {/* Animated ring */}
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-slate-500 tracking-wide">
        Loading species data…
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorBanner — shown when CSV loading fails
// ---------------------------------------------------------------------------

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-slate-50 px-6"
      role="alert"
    >
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          {/* Warning icon */}
          <svg
            className="h-5 w-5 flex-shrink-0 text-red-600"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-sm font-semibold text-slate-900">
            Failed to load species data
          </h2>
        </div>
        <p className="ml-7 text-sm text-slate-600">{message}</p>
        <div className="mt-5 ml-7">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — shown in the content area when no species is selected
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 text-center"
      aria-label="No species selected"
    >
      {/* Compass / map icon */}
      <svg
        className="h-12 w-12 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
      <p className="text-sm font-medium text-slate-400">
        Select a species from the sidebar to begin review
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContentHeader — species name bar above the map + info panels
// ---------------------------------------------------------------------------

function ContentHeader({ displayName }: { displayName: string }) {
  return (
    <header
      className="flex flex-shrink-0 items-center border-b border-slate-200 bg-white px-6 py-3"
      aria-label="Selected species"
    >
      <h1 className="truncate text-lg font-semibold italic leading-tight text-slate-900">
        {displayName}
      </h1>
    </header>
  );
}

// ---------------------------------------------------------------------------
// App — root shell
// ---------------------------------------------------------------------------

export function App() {
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const loadData = useAppStore((s) => s.loadData);

  // Trigger data load once on mount. loadData is re-entrant-safe — safe to
  // call in StrictMode's double-invoke.
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---- Full-screen loading state ----
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // ---- Full-screen error state ----
  if (error) {
    return <ErrorBanner message={error} onRetry={() => void loadData()} />;
  }

  // ---- Application shell ----
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar — fixed 280px, dark background                             */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className="flex h-full w-[280px] flex-shrink-0 flex-col bg-slate-800"
        aria-label="Species navigation"
      >
        <Sidebar />
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content — fills remaining width                               */}
      {/* ------------------------------------------------------------------ */}
      <main
        id="main-content"
        className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white"
        aria-label="Species review workspace"
      >
        {selectedSpecies ? (
          <>
            {/* Top header bar with species identity */}
            <ContentHeader displayName={selectedSpecies.full_name} />

            {/* Body — map 60% | info+form 40% */}
            <div className="flex min-h-0 flex-1 overflow-hidden">

              {/* Map panel — 60% */}
              <section
                className="relative flex min-w-0 flex-[3] flex-col border-r border-slate-200"
                aria-label="Habitat distribution map"
              >
                <MapViewer />
              </section>

              {/* Right panel — 40%: SpeciesInfo stacked above ReviewForm */}
              <section
                className="flex w-[40%] min-w-[320px] flex-shrink-0 flex-col overflow-y-auto content-scroll"
                aria-label="Species information and review form"
              >
                {/* Species metadata from CSV */}
                <div className="bg-white">
                  <SpeciesInfo />
                </div>

                {/* Strong visual divider between info and review */}
                <div className="border-y border-slate-300 bg-slate-100 px-5 py-2">
                  <div className="h-px" />
                </div>

                {/* Reviewer form — distinct background */}
                <div className="flex-1 bg-slate-50">
                  <ReviewForm />
                </div>
              </section>

            </div>
          </>
        ) : (
          /* No species selected — placeholder */
          <EmptyState />
        )}
      </main>

    </div>
  );
}
