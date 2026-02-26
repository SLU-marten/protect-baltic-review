// ---------------------------------------------------------------------------
// MapViewer — PNG habitat-distribution map viewer with zoom & pan
//
// Renders a pre-converted high-resolution PNG via a plain <img> element.
// All zoom/pan is handled via CSS transform — no canvas, no PDF parsing.
// This gives instant, lag-free zoom with crisp rendering at every level.
// ---------------------------------------------------------------------------

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppStore } from '@/store';
import { CATEGORY_CONFIG_MAP } from '@/utils/category-config';
import { getPngPath } from '@/utils/csv-loader';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 50.0;
const ZOOM_STEP = 0.25;
// PNGs were rendered at 6x scale — divide by this to get logical CSS dimensions
const PNG_SCALE = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// ZoomControls — floating toolbar
// ---------------------------------------------------------------------------

interface ZoomControlsProps {
  scale: number;
  minZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

function ZoomControls({
  scale,
  minZoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onFullscreen,
  isFullscreen,
}: ZoomControlsProps) {
  const pct = Math.round(scale * 100);
  const btnBase =
    'flex h-7 w-7 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div
      className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur-sm"
      aria-label="Map controls"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" className={btnBase} onClick={onZoomOut} disabled={scale <= minZoom} aria-label="Zoom out" title="Zoom out">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5" /><line x1="10.5" y1="10.5" x2="14.5" y2="14.5" /><line x1="4" y1="6.5" x2="9" y2="6.5" />
        </svg>
      </button>

      <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums text-slate-700 select-none" aria-live="polite" aria-atomic="true" aria-label={`Zoom level ${pct} percent`}>
        {pct}%
      </span>

      <button type="button" className={btnBase} onClick={onZoomIn} disabled={scale >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5" /><line x1="10.5" y1="10.5" x2="14.5" y2="14.5" /><line x1="6.5" y1="4" x2="6.5" y2="9" /><line x1="4" y1="6.5" x2="9" y2="6.5" />
        </svg>
      </button>

      <div className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden="true" />

      <button type="button" className={btnBase} onClick={onFit} aria-label="Fit map to view" title="Fit to view">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="1 5 1 1 5 1" /><polyline points="11 1 15 1 15 5" /><polyline points="15 11 15 15 11 15" /><polyline points="5 15 1 15 1 11" />
        </svg>
      </button>

      <div className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden="true" />

      <button type="button" className={btnBase} onClick={onFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {isFullscreen ? (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="5 1 5 5 1 5" /><polyline points="11 1 11 5 15 5" /><polyline points="15 11 11 11 11 15" /><polyline points="1 11 5 11 5 15" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="1 6 1 1 6 1" /><polyline points="10 1 15 1 15 6" /><polyline points="15 10 15 15 10 15" /><polyline points="6 15 1 15 1 10" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadingOverlay
// ---------------------------------------------------------------------------

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-50" role="status" aria-label="Loading map">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-500">Loading map...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapLegend — static color legend, same for all species
// ---------------------------------------------------------------------------

const LEGEND_ITEMS = [
  { color: '#FFFFFF', border: '#D1D5DB', label: 'Absent (high confidence)' },
  { color: '#FFFFB3', border: '#D1D5DB', label: 'Absent (low confidence)' },
  { color: '#F4A460', border: '#D1D5DB', label: 'Present (low confidence)' },
  { color: '#8B0000', border: '#8B0000', label: 'Present (high confidence)' },
] as const;

function MapLegend() {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: item.color, border: `1px solid ${item.border}` }}
            aria-hidden="true"
          />
          <span className="text-[11px] text-slate-600 whitespace-nowrap">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorOverlay
// ---------------------------------------------------------------------------

function ErrorOverlay({ speciesName, onRetry }: { speciesName: string; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-50 px-6" role="alert">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-red-200 bg-white p-6 shadow-sm text-center">
        <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-sm font-semibold text-slate-800">Failed to load map</p>
        <p className="text-xs text-slate-500 italic">{speciesName.replace(/\./g, ' ')}</p>
        <button type="button" onClick={onRetry} className="mt-1 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:bg-blue-800">
          Retry
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyPlaceholder
// ---------------------------------------------------------------------------

function EmptyPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-400">No species selected</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapViewer — main component
// ---------------------------------------------------------------------------

export function MapViewer() {
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const activeCategory = useAppStore((s) => s.activeCategory);

  const imgUrl = useMemo<string | null>(() => {
    if (!selectedSpecies) return null;
    const config = CATEGORY_CONFIG_MAP[activeCategory];
    if (!config) return null;
    return getPngPath(config, selectedSpecies.scientific_name);
  }, [selectedSpecies, activeCategory]);

  // ---- State ---------------------------------------------------------------
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [retryCounter, setRetryCounter] = useState(0);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Natural image dimensions (CSS pixels)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  // ---- Refs ----------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const wheelEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragRef = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number }>({
    active: false, startX: 0, startY: 0, originX: 0, originY: 0,
  });
  const transformRef = useRef<Transform>(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Keep imgSize in a ref so helpers can read the latest value without re-creating callbacks
  const imgSizeRef = useRef(imgSize);
  useEffect(() => { imgSizeRef.current = imgSize; }, [imgSize]);

  // ---- getFitScale: the minimum zoom that fills the viewport ---------------
  const getFitScale = useCallback((): number => {
    const sz = imgSizeRef.current;
    if (!containerRef.current || !sz) return MIN_ZOOM;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    return Math.min(cw / sz.w, ch / sz.h);
  }, []);

  // ---- computeFitTransform -------------------------------------------------
  const computeFitTransform = useCallback((): Transform => {
    const sz = imgSizeRef.current;
    if (!containerRef.current || !sz) return { x: 0, y: 0, scale: 1 };

    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const scale = Math.min(cw / sz.w, ch / sz.h);
    const x = (cw - sz.w * scale) / 2;
    const y = (ch - sz.h * scale) / 2;
    return { x, y, scale };
  }, []);

  // ---- clampPan: constrain so the image always covers the viewport ---------
  const clampPan = useCallback((t: Transform): Transform => {
    const sz = imgSizeRef.current;
    if (!containerRef.current || !sz) return t;

    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const imgW = sz.w * t.scale;
    const imgH = sz.h * t.scale;

    let { x, y } = t;

    if (imgW <= cw) {
      // Image narrower than viewport — center horizontally
      x = (cw - imgW) / 2;
    } else {
      // Clamp: left edge <= 0, right edge >= cw
      x = Math.min(0, Math.max(cw - imgW, x));
    }

    if (imgH <= ch) {
      // Image shorter than viewport — center vertically
      y = (ch - imgH) / 2;
    } else {
      // Clamp: top edge <= 0, bottom edge >= ch
      y = Math.min(0, Math.max(ch - imgH, y));
    }

    return { ...t, x, y };
  }, []);

  // Fit to view when image loads
  useLayoutEffect(() => {
    if (status === 'ready' && imgSize) {
      setTransform(computeFitTransform());
    }
  }, [status, imgSize, computeFitTransform]);

  // ---- Image load ----------------------------------------------------------
  useEffect(() => {
    if (!imgUrl) {
      setStatus('idle');
      setImgSize(null);
      return;
    }
    setStatus('loading');
  }, [imgUrl, retryCounter]);

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const logicalW = img.naturalWidth / PNG_SCALE;
    const logicalH = img.naturalHeight / PNG_SCALE;
    setImgSize((prev) => {
      if (prev && prev.w === logicalW && prev.h === logicalH) return prev;
      return { w: logicalW, h: logicalH };
    });
    setStatus('ready');
  }, []);

  const handleImgError = useCallback(() => {
    setStatus('error');
  }, []);

  // ---- Zoom helpers --------------------------------------------------------
  const applyZoom = useCallback(
    (nextOrFn: number | ((prev: number) => number), focalX?: number, focalY?: number) => {
      setTransform((prev) => {
        const raw = typeof nextOrFn === 'function' ? nextOrFn(prev.scale) : nextOrFn;
        const minZoom = getFitScale();
        const clamped = clamp(raw, minZoom, MAX_ZOOM);
        if (clamped === prev.scale) return prev;

        let next: Transform;
        if (focalX !== undefined && focalY !== undefined) {
          const worldX = (focalX - prev.x) / prev.scale;
          const worldY = (focalY - prev.y) / prev.scale;
          next = { scale: clamped, x: focalX - worldX * clamped, y: focalY - worldY * clamped };
        } else if (containerRef.current) {
          const cx = containerRef.current.clientWidth / 2;
          const cy = containerRef.current.clientHeight / 2;
          const worldX = (cx - prev.x) / prev.scale;
          const worldY = (cy - prev.y) / prev.scale;
          next = { scale: clamped, x: cx - worldX * clamped, y: cy - worldY * clamped };
        } else {
          next = { ...prev, scale: clamped };
        }

        return clampPan(next);
      });
    },
    [getFitScale, clampPan],
  );

  const handleZoomIn = useCallback(() => {
    applyZoom((cur) => cur + (cur < 2 ? ZOOM_STEP : cur * 0.2));
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom((cur) => cur - (cur < 2 ? ZOOM_STEP : cur * 0.2));
  }, [applyZoom]);

  const handleFit = useCallback(() => {
    setTransform(computeFitTransform());
  }, [computeFitTransform]);

  // ---- Mouse wheel zoom ----------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || status !== 'ready') return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();

      // Disable CSS transition for instant response during wheel zoom
      if (wrapperRef.current) wrapperRef.current.style.transition = 'none';
      if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
      wheelEndTimerRef.current = setTimeout(() => {
        if (wrapperRef.current) wrapperRef.current.style.transition = '';
      }, 200);

      const rect = container!.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1 : -1;

      applyZoom(
        (cur) => cur + delta * (cur < 2 ? 0.15 : cur * 0.08),
        focalX, focalY,
      );
    }

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
    };
  }, [status, applyZoom]);

  // ---- Pointer (drag/pan) --------------------------------------------------
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      originX: transformRef.current.x, originY: transformRef.current.y,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    setTransform((prev) => clampPan({
      ...prev,
      x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
    }));
  }, [clampPan]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // ---- Fullscreen ----------------------------------------------------------
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { void el.requestFullscreen(); }
    else { void document.exitFullscreen(); }
  }, []);

  useEffect(() => {
    function onFsc() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFsc);
    return () => document.removeEventListener('fullscreenchange', onFsc);
  }, []);

  useEffect(() => {
    if (status === 'ready') {
      const id = requestAnimationFrame(() => setTransform(computeFitTransform()));
      return () => cancelAnimationFrame(id);
    }
  }, [isFullscreen, status, computeFitTransform]);

  // ---- Keyboard zoom -------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || status !== 'ready') return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); applyZoom((cur) => cur + (cur < 2 ? ZOOM_STEP : cur * 0.2)); }
      else if (e.key === '-') { e.preventDefault(); applyZoom((cur) => cur - (cur < 2 ? ZOOM_STEP : cur * 0.2)); }
      else if (e.key === '0') { e.preventDefault(); setTransform(computeFitTransform()); }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [status, applyZoom, computeFitTransform]);

  // ---- Retry ---------------------------------------------------------------
  const handleRetry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  // ---- Render --------------------------------------------------------------
  if (!selectedSpecies) return <EmptyPlaceholder />;

  const cssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-100 focus:outline-none"
      tabIndex={0}
      aria-label={`Habitat distribution map for ${selectedSpecies.scientific_name.replace(/\./g, ' ')}`}
      style={{ cursor: status === 'ready' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      onPointerDown={status === 'ready' ? handlePointerDown : undefined}
      onPointerMove={status === 'ready' ? handlePointerMove : undefined}
      onPointerUp={status === 'ready' ? handlePointerUp : undefined}
      onPointerCancel={status === 'ready' ? handlePointerUp : undefined}
    >
      {/* Image container — transformed for pan/zoom */}
      <div
        ref={wrapperRef}
        aria-hidden={status !== 'ready'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: cssTransform,
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          willChange: 'transform',
          userSelect: 'none',
        }}
      >
        {imgUrl && (
          <img
            ref={imgRef}
            key={imgUrl + retryCounter}
            src={imgUrl}
            alt={`Habitat distribution map for ${selectedSpecies.scientific_name.replace(/\./g, ' ')}`}
            onLoad={handleImgLoad}
            onError={handleImgError}
            draggable={false}
            style={{
              display: 'block',
              width: imgSize ? imgSize.w : undefined,
              height: imgSize ? imgSize.h : undefined,
              imageRendering: transform.scale > 2 ? 'pixelated' : 'auto',
            }}
          />
        )}
      </div>

      {/* Overlays */}
      {status === 'loading' && <LoadingOverlay />}
      {status === 'error' && <ErrorOverlay speciesName={selectedSpecies.scientific_name} onRetry={handleRetry} />}

      {/* Legend + Zoom controls */}
      {status === 'ready' && (
        <>
          <MapLegend />
          <ZoomControls
            scale={transform.scale}
            minZoom={getFitScale()}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={handleFit}
            onFullscreen={handleFullscreen}
            isFullscreen={isFullscreen}
          />
        </>
      )}
    </div>
  );
}
