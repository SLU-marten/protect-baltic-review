import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { CATEGORY_CONFIGS } from '@/utils/category-config';
import type { Category, FlagValue, Species } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert dot-separated scientific names to display form: "Gadus.morhua" → "Gadus morhua" */
function formatScientificName(raw: string): string {
  return raw.replace(/\./g, ' ');
}

/** Map a reviewer flag value to a Tailwind background colour class. */
function flagDotClass(flag: FlagValue): string {
  switch (flag) {
    case 'red':    return 'bg-[#DC2626]';
    case 'yellow': return 'bg-[#F59E0B]';
    case 'green':  return 'bg-[#16A34A]';
    default:       return '';
  }
}

// ---------------------------------------------------------------------------
// AppTitle — compact branding header at the very top of the sidebar
// ---------------------------------------------------------------------------

function AppTitle() {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-2 px-4 py-3 border-b border-slate-700"
      aria-label="Protect Baltic Review"
    >
      {/* Wave / water icon */}
      <svg
        className="h-5 w-5 flex-shrink-0 text-blue-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
        <path d="M2 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0" opacity="0.5" />
      </svg>
      <span className="text-sm font-semibold tracking-wide text-slate-100 leading-none">
        Protect Baltic Review
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryTabs — Fish / Invertebrates / Macrophytes switcher
// ---------------------------------------------------------------------------

interface CategoryTabsProps {
  activeCategory: Category;
  onSelect: (cat: Category) => void;
}

function CategoryTabs({ activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div
      className="flex flex-shrink-0 gap-0.5 bg-slate-900/40 p-1.5"
      role="tablist"
      aria-label="Species categories"
    >
      {CATEGORY_CONFIGS.map((cfg) => {
        const isActive = cfg.id === activeCategory;
        const isUnavailable = !cfg.available;

        return (
          <div key={cfg.id} className="relative flex-1">
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={isUnavailable}
              aria-label={
                isUnavailable
                  ? `${cfg.label} — coming soon`
                  : cfg.label
              }
              onClick={() => {
                if (!isUnavailable) {
                  onSelect(cfg.id as Category);
                }
              }}
              disabled={isUnavailable}
              className={[
                'group relative w-full rounded px-2 py-1.5 text-xs font-medium leading-none',
                'transition-colors duration-150 focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isUnavailable
                    ? 'cursor-not-allowed text-slate-500'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100',
              ].join(' ')}
            >
              {cfg.label}
              {/* "Coming Soon" badge on unavailable tabs */}
              {isUnavailable && (
                <span
                  className={[
                    'absolute -top-1.5 left-1/2 -translate-x-1/2',
                    'rounded px-1 py-0.5 text-[9px] font-semibold leading-none',
                    'bg-slate-600 text-slate-400',
                    'pointer-events-none select-none',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  Soon
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchInput — filters species list
// ---------------------------------------------------------------------------

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" focuses the search input
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="relative flex-shrink-0 px-3 py-2">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search species..."
        aria-label="Search species by name"
        className={[
          'w-full rounded-md border border-slate-600 bg-slate-700/60',
          'pl-7 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500',
          'focus:border-blue-500 focus:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500',
          'transition-colors duration-150',
        ].join(' ')}
      />
      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none focus-visible:text-slate-300"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpeciesCount — small count label above the list
// ---------------------------------------------------------------------------

interface SpeciesCountProps {
  filtered: number;
  total: number;
}

function SpeciesCount({ filtered, total }: SpeciesCountProps) {
  const isFiltered = filtered !== total;
  return (
    <p
      className="flex-shrink-0 px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-slate-500"
      aria-live="polite"
      aria-atomic="true"
    >
      {isFiltered
        ? `${filtered} of ${total} species`
        : `${total} species`}
    </p>
  );
}

// ---------------------------------------------------------------------------
// SpeciesListItem — single row in the species list
// ---------------------------------------------------------------------------

interface SpeciesListItemProps {
  species: Species;
  isSelected: boolean;
  reviewFlag: FlagValue;
  onSelect: (species: Species) => void;
}

function SpeciesListItem({
  species,
  isSelected,
  reviewFlag,
  onSelect,
}: SpeciesListItemProps) {
  const displayName = formatScientificName(species.scientific_name);
  const dotClass = flagDotClass(reviewFlag);
  const hasDot = reviewFlag !== null;

  return (
    <li id={`species-${species.scientific_name}`} role="option" aria-selected={isSelected}>
      <button
        type="button"
        onClick={() => onSelect(species)}
        aria-label={`${displayName}${species.common_name ? `, ${species.common_name}` : ''}${reviewFlag ? `, reviewed: ${reviewFlag}` : ''}`}
        className={[
          'group relative flex w-full items-start gap-2 px-3 py-2',
          'text-left transition-colors duration-100',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-400',
          isSelected
            ? 'bg-slate-700 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-blue-500'
            : 'hover:bg-slate-700/50',
        ].join(' ')}
      >
        {/* Text content */}
        <div className="min-w-0 flex-1">
          <p
            className={[
              'truncate text-xs font-medium italic leading-snug',
              isSelected ? 'text-slate-100' : 'text-slate-200',
            ].join(' ')}
          >
            {displayName}
          </p>
        </div>

        {/* Review flag dot */}
        {hasDot && (
          <span
            className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${dotClass}`}
            aria-label={`Review flag: ${reviewFlag}`}
            role="img"
          />
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — root component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const activeCategory    = useAppStore((s) => s.activeCategory);
  const selectedSpecies   = useAppStore((s) => s.selectedSpecies);
  const setActiveCategory = useAppStore((s) => s.setActiveCategory);
  const setSelectedSpecies = useAppStore((s) => s.setSelectedSpecies);
  const categories        = useAppStore((s) => s.categories);
  const getReviewFlag     = useAppStore((s) => s.getReviewFlag);

  const [query, setQuery] = useState('');

  // Reference to the scrollable list — used to scroll the selected item into view
  const listRef = useRef<HTMLUListElement>(null);

  // Reset search query when the active category changes
  useEffect(() => {
    setQuery('');
  }, [activeCategory]);

  // Scroll the selected species into view when it changes via external navigation
  // (e.g., keyboard prev/next arrows in ContentHeader)
  useEffect(() => {
    if (!selectedSpecies || !listRef.current) return;
    const selected = listRef.current.querySelector('[aria-selected="true"] button');
    if (selected instanceof HTMLElement) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedSpecies]);

  // Derive the filtered species list from the active category + search query
  const allSpecies = useMemo(
    () => categories[activeCategory],
    [categories, activeCategory],
  );

  const filteredSpecies = useMemo<Species[]>(() => {
    if (!query.trim()) return allSpecies;
    const lower = query.toLowerCase();
    return allSpecies.filter(
      (s) =>
        s.scientific_name.toLowerCase().includes(lower) ||
        s.common_name.toLowerCase().includes(lower),
    );
  }, [allSpecies, query]);

  // Keyboard navigation within the species list (up/down arrows)
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();

      const currentIndex = selectedSpecies
        ? filteredSpecies.findIndex(
            (s) => s.scientific_name === selectedSpecies.scientific_name,
          )
        : -1;

      let nextIndex: number;
      if (e.key === 'ArrowDown') {
        nextIndex =
          currentIndex < filteredSpecies.length - 1 ? currentIndex + 1 : currentIndex;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      }

      const next = filteredSpecies[nextIndex];
      if (next) {
        setSelectedSpecies(next);
      }
    },
    [filteredSpecies, selectedSpecies, setSelectedSpecies],
  );

  return (
    // The outer <aside> is provided by App.tsx — this component only fills it.
    <div className="flex h-full flex-col">

      {/* ------------------------------------------------------------------ */}
      {/* App branding                                                        */}
      {/* ------------------------------------------------------------------ */}
      <AppTitle />

      {/* ------------------------------------------------------------------ */}
      {/* Category tabs                                                       */}
      {/* ------------------------------------------------------------------ */}
      <CategoryTabs activeCategory={activeCategory} onSelect={setActiveCategory} />

      {/* ------------------------------------------------------------------ */}
      {/* Search input                                                        */}
      {/* ------------------------------------------------------------------ */}
      <SearchInput value={query} onChange={setQuery} />

      {/* ------------------------------------------------------------------ */}
      {/* Species count                                                       */}
      {/* ------------------------------------------------------------------ */}
      <SpeciesCount filtered={filteredSpecies.length} total={allSpecies.length} />

      {/* ------------------------------------------------------------------ */}
      {/* Species list — scrollable, keyboard-navigable                      */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="min-h-0 flex-1 overflow-hidden"
        aria-label={`${activeCategory} species list`}
      >
        <ul
          ref={listRef}
          role="listbox"
          aria-label={`${activeCategory} species`}
          aria-activedescendant={
            selectedSpecies ? `species-${selectedSpecies.scientific_name}` : undefined
          }
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          className="species-list-scroll h-full overflow-y-auto focus:outline-none"
        >
          {filteredSpecies.length > 0 ? (
            filteredSpecies.map((species) => {
              const isSelected =
                selectedSpecies?.scientific_name === species.scientific_name;
              const reviewFlag = getReviewFlag(activeCategory, species.scientific_name);

              return (
                <SpeciesListItem
                  key={species.scientific_name}
                  species={species}
                  isSelected={isSelected}
                  reviewFlag={reviewFlag}
                  onSelect={setSelectedSpecies}
                />
              );
            })
          ) : (
            <li className="px-4 py-6 text-center text-xs text-slate-500" role="status">
              No species match &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      </nav>

    </div>
  );
}
