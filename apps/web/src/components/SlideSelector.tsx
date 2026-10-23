import React, { useState } from 'react';
import { Layers, CheckSquare, Square, ChevronUp, ChevronDown, Search, Hash } from 'lucide-react';
import { SlideInfo, CandidateSelector } from '@exporter/shared';

interface SlideSelectorProps {
  slides: SlideInfo[];
  selectedIndices: number[];
  onToggleSlide: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onReorderSlides: (reordered: SlideInfo[]) => void;
  activeSlideIndex: number;
  onSelectPreviewSlide: (index: number) => void;
  detectedSelector: string;
  candidateSelectors: CandidateSelector[];
  onApplySelector: (selector: string) => void;
  isLoading: boolean;
}

export const SlideSelector: React.FC<SlideSelectorProps> = ({
  slides,
  selectedIndices,
  onToggleSlide,
  onSelectAll,
  onDeselectAll,
  onReorderSlides,
  activeSlideIndex,
  onSelectPreviewSlide,
  detectedSelector,
  candidateSelectors,
  onApplySelector,
  isLoading,
}) => {
  const [customSelectorInput, setCustomSelectorInput] = useState(detectedSelector || '');

  const moveSlide = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[currentIndex];
    newSlides[currentIndex] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    // Update indices
    const updated = newSlides.map((s, idx) => ({ ...s, index: idx }));
    onReorderSlides(updated);
  };

  const handleCustomSelectorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSelectorInput.trim()) {
      onApplySelector(customSelectorInput.trim());
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-400" />
            2. Carousel Slides
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detected <span className="text-pink-400 font-semibold">{slides.length}</span> slides (DOM order preserved)
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Select All
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Selector management */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 space-y-2">
        <form onSubmit={handleCustomSelectorSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
              CSS:
            </span>
            <input
              type="text"
              value={customSelectorInput}
              onChange={(e) => setCustomSelectorInput(e.target.value)}
              placeholder="e.g. .slide, .carousel-item"
              className="w-full pl-12 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !customSelectorInput.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Detect
          </button>
        </form>

        {/* Candidate Selector Badges */}
        {candidateSelectors.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">Found Candidates:</span>
            {candidateSelectors.map((c) => (
              <button
                key={c.selector}
                type="button"
                onClick={() => {
                  setCustomSelectorInput(c.selector);
                  onApplySelector(c.selector);
                }}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                  detectedSelector === c.selector
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                {c.selector} ({c.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slide list with reordering and checkbox selection */}
      {slides.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No slides detected. Try entering a custom CSS selector above.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
          {slides.map((slide, idx) => {
            const isSelected = selectedIndices.includes(slide.index);
            const isActive = activeSlideIndex === slide.index;

            return (
              <div
                key={slide.id || idx}
                onClick={() => onSelectPreviewSlide(slide.index)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-pink-500/10 border-pink-500/40 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSlide(slide.index);
                    }}
                    className="text-slate-400 hover:text-pink-400 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-pink-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {slide.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {slide.originalWidth} × {slide.originalHeight}px ({slide.originalAspectRatio}:1)
                    </p>
                  </div>
                </div>

                {/* Reordering buttons */}
                <div className="flex items-center space-x-1 pl-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSlide(idx, 'up');
                    }}
                    className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500"
                    title="Move up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === slides.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSlide(idx, 'down');
                    }}
                    className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500"
                    title="Move down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
