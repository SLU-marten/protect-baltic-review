// ---------------------------------------------------------------------------
// SpeciesInfo — displays essential model metadata for the selected species.
// Fields shown: scientific_name, common_name, flag, comment, mean_TSS_ensemble
// ---------------------------------------------------------------------------

import { useAppStore } from '@/store';
import type { Species } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: number | undefined | null, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(decimals);
}

// ---------------------------------------------------------------------------
// Modeller flag badge
// ---------------------------------------------------------------------------

function FlagBadge({ flag }: { flag: string }) {
  const normalised = flag?.toLowerCase().trim();

  const configs: Record<string, { bg: string; color: string; label: string }> = {
    green:  { bg: '#16A34A', color: '#ffffff', label: 'Green' },
    yellow: { bg: '#F59E0B', color: '#78350F', label: 'Yellow' },
    red:    { bg: '#DC2626', color: '#ffffff', label: 'Red' },
  };

  const cfg = configs[normalised];

  if (cfg) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
        aria-label={`Modeller flag: ${cfg.label}`}
      >
        {cfg.label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
      aria-label="Modeller flag: Not set"
    >
      Not set
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function SpeciesInfoContent({ species }: { species: Species }) {
  const tss = species.mean_TSS_ensemble;
  const displayName = species.scientific_name.replace(/\./g, ' ');

  return (
    <div className="p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Model Information
      </h2>

      {/* Species identity */}
      <div className="mb-4">
        <p className="text-base font-semibold italic text-slate-900">{displayName}</p>
        {species.common_name && (
          <p className="mt-0.5 text-sm text-slate-500">{species.common_name}</p>
        )}
      </div>

      {/* TSS */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-slate-500">TSS (Ensemble)</span>
        <span className="font-mono text-sm font-medium text-slate-900">{fmt(tss, 3)}</span>
      </div>

      {/* Modeller's comment (flag + text) */}
      <div>
        <span className="text-xs font-medium text-slate-700">Modeller&apos;s comment</span>
        <div className="mt-1.5 flex items-center gap-2">
          <FlagBadge flag={species.flag} />
        </div>
        {species.comment && species.comment.trim() ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            {species.comment.trim()}
          </p>
        ) : (
          <p className="mt-1.5 text-xs italic text-slate-400">No comment provided</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function SpeciesInfoEmpty() {
  return (
    <div className="p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Model Information
      </h2>
      <p className="text-sm italic text-slate-400">
        Select a species to view model information.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function SpeciesInfo() {
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);

  if (!selectedSpecies) {
    return <SpeciesInfoEmpty />;
  }

  return <SpeciesInfoContent species={selectedSpecies} />;
}
