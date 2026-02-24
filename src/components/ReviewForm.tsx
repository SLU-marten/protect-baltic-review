import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store';
import type { FlagValue } from '@/types';
import { submitReviewToSheet } from '@/utils/google-sheets';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// FlagButton
// ---------------------------------------------------------------------------

const FLAG_STYLES: Record<NonNullable<FlagValue>, { active: string; idle: string }> = {
  red: {
    active: 'bg-[#DC2626] border-[#DC2626] text-white scale-105 shadow-md',
    idle: 'border-slate-300 text-slate-600 hover:border-[#DC2626] hover:text-[#DC2626] hover:bg-red-50',
  },
  yellow: {
    active: 'bg-[#F59E0B] border-[#F59E0B] text-amber-900 scale-105 shadow-md',
    idle: 'border-slate-300 text-slate-600 hover:border-[#F59E0B] hover:text-[#F59E0B] hover:bg-amber-50',
  },
  green: {
    active: 'bg-[#16A34A] border-[#16A34A] text-white scale-105 shadow-md',
    idle: 'border-slate-300 text-slate-600 hover:border-[#16A34A] hover:text-[#16A34A] hover:bg-green-50',
  },
};

function FlagButton({ value, label, description, selectedFlag, onSelect }: {
  value: NonNullable<FlagValue>;
  label: string;
  description: string;
  selectedFlag: FlagValue;
  onSelect: (flag: FlagValue) => void;
}) {
  const isSelected = selectedFlag === value;
  const styles = FLAG_STYLES[value];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${label}: ${description}`}
      onClick={() => onSelect(isSelected ? null : value)}
      className={[
        'flex min-h-[60px] min-w-[100px] flex-1 flex-col items-center justify-center',
        'rounded-md border-2 px-2 py-2 text-center transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        'select-none cursor-pointer',
        isSelected ? styles.active : styles.idle,
      ].join(' ')}
    >
      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className={`mt-0.5 text-[10px] leading-tight ${isSelected ? (value === 'yellow' ? 'text-amber-800/80' : 'text-white/80') : 'text-slate-400'}`}>
        {description}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ReviewForm
// ---------------------------------------------------------------------------

export function ReviewForm() {
  const reviewerName = useAppStore((s) => s.reviewerName);
  const setReviewerName = useAppStore((s) => s.setReviewerName);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const activeCategory = useAppStore((s) => s.activeCategory);
  const saveReview = useAppStore((s) => s.saveReview);
  const getReview = useAppStore((s) => s.getReview);

  const [flag, setFlag] = useState<FlagValue>(null);
  const [comment, setComment] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [existingTimestamp, setExistingTimestamp] = useState<string | null>(null);
  // Track whether the form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Load existing review when species changes
  useEffect(() => {
    if (!selectedSpecies) {
      setFlag(null);
      setComment('');
      setExistingTimestamp(null);
      setIsDirty(false);
      return;
    }

    const existing = getReview(activeCategory, selectedSpecies.scientific_name);
    if (existing) {
      setFlag(existing.flag);
      setComment(existing.comment);
      setExistingTimestamp(existing.timestamp);
    } else {
      setFlag(null);
      setComment('');
      setExistingTimestamp(null);
    }
    setIsDirty(false);
  }, [selectedSpecies?.scientific_name, activeCategory]); // getReview has stable identity in Zustand

  // Saved indicator
  const triggerSavedIndicator = useCallback(() => {
    setSavedIndicator(true);
    if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    savedIndicatorTimerRef.current = setTimeout(() => setSavedIndicator(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    };
  }, []);

  // Submit handler — sends review to Google Spreadsheet and records locally for sidebar dots
  async function handleSubmit() {
    if (!selectedSpecies) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitReviewToSheet({
        category: activeCategory,
        scientific_name: selectedSpecies.scientific_name,
        reviewer_name: reviewerName,
        flag: flag ?? '',
        comment,
      });

      // Record locally so the sidebar flag dot updates for this session
      saveReview(activeCategory, selectedSpecies.scientific_name, {
        reviewer_name: reviewerName,
        flag,
        comment,
      });

      setExistingTimestamp(new Date().toISOString());
      setIsDirty(false);
      triggerSavedIndicator();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Flag selection — marks dirty
  function handleFlagSelect(newFlag: FlagValue) {
    setFlag(newFlag);
    setIsDirty(true);
    if (newFlag !== null) {
      setTimeout(() => commentRef.current?.focus(), 0);
    }
  }

  // Arrow key navigation across flag buttons
  const flagOrder: NonNullable<FlagValue>[] = ['red', 'yellow', 'green'];

  function handleFlagGroupKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = flag !== null ? flagOrder.indexOf(flag) : -1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleFlagSelect(flagOrder[(currentIndex + 1) % flagOrder.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleFlagSelect(flagOrder[currentIndex > 0 ? currentIndex - 1 : flagOrder.length - 1]);
    }
  }

  // Comment change — marks dirty
  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
    setIsDirty(true);
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReviewerName(e.target.value);
  }

  const isDisabled = !selectedSpecies;
  const canSubmit = !isDisabled && !isSubmitting && reviewerName.trim().length >= 2 && (flag !== null || comment.trim().length > 0);

  return (
    <section className="flex flex-col gap-5 p-5" aria-label="Expert review form">
      {/* Section title + saved indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Expert Review
        </h2>
        <span
          aria-live="polite"
          aria-atomic="true"
          className={[
            'flex items-center gap-1 text-xs font-medium text-green-600 transition-opacity duration-300',
            savedIndicator ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8l3.5 3.5L13 4.5" />
          </svg>
          Submitted
        </span>
      </div>

      {/* Instructions */}
      <p className="text-xs leading-relaxed text-slate-500">
        Please mark species with an appropriate flag. Marking species with a <strong className="text-[#DC2626] font-semibold">red flag</strong> indicates
        that based on your expert judgement, the species should be removed and therefore not included in the product delivery,
        not published in the HELCOM Maps and Data Service, and not used in subsequent analyses in the project.
        Marking a species with a <strong className="text-[#F59E0B] font-semibold">yellow flag</strong> indicates that the map is of sufficient quality
        to be published but should be used with caution. Please add comments justifying your decision, particularly when
        marking species with a red flag.
      </p>

      {/* Reviewer Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reviewer-name" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
          </svg>
          Reviewer
        </label>
        <input
          id="reviewer-name"
          type="text"
          autoComplete="name"
          value={reviewerName}
          onChange={handleNameChange}
          placeholder="Your name..."
          minLength={2}
          className={[
            'w-full rounded-md border border-slate-300 bg-white px-3 py-2',
            'text-sm text-slate-900 placeholder:text-slate-400',
            'transition-colors duration-100 shadow-sm',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          ].join(' ')}
        />
      </div>

      {/* Assessment Flag */}
      <div className="flex flex-col gap-1.5">
        <span id="flag-group-label" className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Assessment Flag
        </span>
        <div
          role="radiogroup"
          aria-labelledby="flag-group-label"
          aria-disabled={isDisabled}
          onKeyDown={isDisabled ? undefined : handleFlagGroupKeyDown}
          className={['flex gap-2', isDisabled ? 'pointer-events-none opacity-40' : ''].join(' ')}
        >
          <FlagButton value="red" label="Red" description="Remove species (map highly inaccurate)" selectedFlag={flag} onSelect={handleFlagSelect} />
          <FlagButton value="yellow" label="Yellow" description="Keep species (but flag as somewhat inaccurate)" selectedFlag={flag} onSelect={handleFlagSelect} />
          <FlagButton value="green" label="Green" description="Keep species (map is sufficiently accurate)" selectedFlag={flag} onSelect={handleFlagSelect} />
        </div>
        {isDisabled && (
          <p className="text-[11px] text-slate-400">Select a species to enable the review form.</p>
        )}
      </div>

      {/* Comments */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-comments" className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Comments
        </label>
        <textarea
          id="review-comments"
          ref={commentRef}
          rows={4}
          value={comment}
          onChange={handleCommentChange}
          disabled={isDisabled}
          placeholder="Enter your review comments..."
          className={[
            'w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2',
            'text-sm leading-relaxed text-slate-900 placeholder:text-slate-400',
            'transition-colors duration-100 shadow-sm',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50',
            'min-h-[96px]',
          ].join(' ')}
        />
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={[
          'w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          canSubmit && isDirty
            ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
            : canSubmit
              ? 'bg-blue-600/80 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        {isSubmitting ? 'Submitting...' : isDirty ? 'Submit Review' : existingTimestamp ? 'Update Review' : 'Submit Review'}
      </button>

      {/* Submission error */}
      {submitError && (
        <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700" role="alert">
          {submitError}
        </p>
      )}

      {/* Last submitted timestamp */}
      {existingTimestamp && (
        <p className="text-[11px] text-slate-400" aria-live="polite">
          Last submitted: {formatTimestamp(existingTimestamp)}
        </p>
      )}
    </section>
  );
}
