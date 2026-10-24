import React, { useState, useRef } from 'react';
import { Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, RefreshCw, Image as ImageIcon, Code2 } from 'lucide-react';
import { SlideInfo, ExportJobStatus } from '@exporter/shared';
import { api } from '../services/api.js';

interface PreviewWorkspaceProps {
  sessionId: string;
  entryHtml: string;
  slides: SlideInfo[];
  activeSlideIndex: number;
  onSelectSlideIndex: (index: number) => void;
  job: ExportJobStatus | null;
  onOpenModal: (url: string, title: string) => void;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
}

export const PreviewWorkspace: React.FC<PreviewWorkspaceProps> = ({
  sessionId,
  entryHtml,
  slides,
  activeSlideIndex,
  onSelectSlideIndex,
  job,
  onOpenModal,
  iframeRef,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(0.55); // Default scale to fit nicely
  const [previewMode, setPreviewMode] = useState<'html' | 'png'>('html');
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const activeIframe = iframeRef || internalIframeRef;

  const activeSlide = slides[activeSlideIndex] || slides[0];
  const totalSlides = slides.length;

  const currentExportedSlide = job?.slides.find(
    (s) => s.index === activeSlide?.index && s.status === 'completed'
  );

  const iframeSrc = sessionId && entryHtml ? api.getIframeUrl(sessionId, entryHtml) : '';

  // Auto-scroll iframe to active slide
  React.useEffect(() => {
    try {
      const doc = activeIframe.current?.contentDocument;
      if (doc && activeSlide?.selector) {
        const els = doc.querySelectorAll(activeSlide.selector);
        const target = els[activeSlideIndex];
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    } catch {
      // cross-origin protection
    }
  }, [activeSlideIndex, activeSlide, activeIframe]);

  const handlePrev = () => {
    if (activeSlideIndex > 0) {
      onSelectSlideIndex(activeSlideIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeSlideIndex < totalSlides - 1) {
      onSelectSlideIndex(activeSlideIndex + 1);
    }
  };

  const handleReloadIframe = () => {
    if (activeIframe.current) {
      activeIframe.current.src = activeIframe.current.src;
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[580px]">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-pink-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Preview Workspace
          </h2>

          {/* Toggle HTML vs Exported PNG */}
          {currentExportedSlide && (
            <div className="flex items-center ml-2 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode('html')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  previewMode === 'html'
                    ? 'bg-slate-800 text-pink-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3 h-3" />
                Live HTML
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('png')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  previewMode === 'png'
                    ? 'bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3 h-3 text-pink-400" />
                Rendered PNG
              </button>
            </div>
          )}
        </div>

        {/* Zoom and actions */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-400 min-w-[45px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.2, +(z + 0.1).toFixed(2)))}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(0.55)}
            className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-[11px]"
            title="Reset Zoom"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={handleReloadIframe}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="Reload Preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main preview stage container */}
      <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl overflow-auto relative flex items-center justify-center p-6">
        {!iframeSrc ? (
          <div className="text-center text-slate-500 text-xs">
            Import an HTML project or load the existing carousel to see live preview
          </div>
        ) : previewMode === 'png' && currentExportedSlide ? (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="shadow-2xl shadow-pink-500/10 rounded-xl overflow-hidden border border-slate-700 relative group cursor-pointer"
            onClick={() =>
              onOpenModal(
                api.getSlidePreviewUrl(job!.jobId, currentExportedSlide.index),
                currentExportedSlide.fileName
              )
            }
          >
            <img
              src={api.getSlidePreviewUrl(job!.jobId, currentExportedSlide.index)}
              alt={currentExportedSlide.fileName}
              className="max-w-none block"
              style={{
                width: `${currentExportedSlide.width}px`,
                height: `${currentExportedSlide.height}px`,
              }}
            />
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                <Maximize2 className="w-3.5 h-3.5" />
                Click to inspect full resolution ({currentExportedSlide.width} × {currentExportedSlide.height}px)
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-white"
          >
            <iframe
              ref={activeIframe}
              src={iframeSrc}
              title="Carousel Live Preview"
              style={{
                width: '1080px',
                height: '1350px',
                border: 'none',
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          disabled={activeSlideIndex <= 0}
          onClick={handlePrev}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-semibold text-slate-200">
            Slide {activeSlideIndex + 1} of {totalSlides || 1}
          </span>
          {activeSlide && (
            <p className="text-[11px] text-pink-400 font-medium truncate max-w-[200px] sm:max-w-[300px]">
              {activeSlide.label}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={activeSlideIndex >= totalSlides - 1}
          onClick={handleNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
