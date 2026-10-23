import React, { useState } from 'react';
import { Download, Archive, CheckCircle2, AlertCircle, RefreshCw, Maximize2, FileCheck, CheckSquare, Square } from 'lucide-react';
import { ExportJobStatus } from '@exporter/shared';
import { api } from '../services/api.js';

interface ExportResultsProps {
  job: ExportJobStatus;
  onRetrySlide: (index: number) => void;
  onOpenModal: (url: string, title: string) => void;
}

export const ExportResults: React.FC<ExportResultsProps> = ({
  job,
  onRetrySlide,
  onOpenModal,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    job.slides.filter((s) => s.status === 'completed').map((s) => s.index)
  );
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

  const completedSlides = job.slides.filter((s) => s.status === 'completed');
  const failedSlides = job.slides.filter((s) => s.status === 'failed');

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleDownloadSelectedZip = async () => {
    if (selectedIndices.length === 0) return;
    setIsDownloadingSelected(true);
    try {
      await api.downloadSelectedZip(job.jobId, selectedIndices);
    } catch (err) {
      console.error('Download selected failed:', err);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Top Banner & Batch Download Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Export Results & Downloads</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
              {completedSlides.length} / {job.totalSlides} Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Download individual high-resolution PNGs or package them as a ZIP archive
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download all as ZIP */}
          {job.zipDownloadUrl && (
            <a
              href={api.getZipDownloadUrl(job.jobId)}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>Download All as ZIP</span>
            </a>
          )}

          {/* Download selected */}
          {completedSlides.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadSelectedZip}
              disabled={selectedIndices.length === 0 || isDownloadingSelected}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-pink-400" />
              <span>Download Selected ({selectedIndices.length})</span>
            </button>
          )}

          {/* Retry failed button */}
          {failedSlides.length > 0 && (
            <button
              type="button"
              onClick={() => failedSlides.forEach((s) => onRetrySlide(s.index))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Failed ({failedSlides.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Select All / Deselect All Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() =>
              setSelectedIndices(completedSlides.map((s) => s.index))
            }
            className="hover:text-slate-200"
          >
            Select All
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => setSelectedIndices([])}
            className="hover:text-slate-200"
          >
            Deselect All
          </button>
        </div>
        <span>{selectedIndices.length} of {completedSlides.length} selected for batch download</span>
      </div>

      {/* Grid of exported slides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {job.slides.map((slide) => {
          const isSelected = selectedIndices.includes(slide.index);
          const isDone = slide.status === 'completed';

          return (
            <div
              key={slide.slideId}
              className={`rounded-xl border overflow-hidden transition-all flex flex-col ${
                isDone
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 shadow-md'
                  : 'bg-rose-950/10 border-rose-900/30'
              }`}
            >
              {/* Image preview area */}
              <div className="relative aspect-[4/5] bg-slate-950/90 flex items-center justify-center overflow-hidden border-b border-slate-850 group">
                {isDone ? (
                  <>
                    <img
                      src={api.getSlidePreviewUrl(job.jobId, slide.index)}
                      alt={slide.fileName}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />

                    {/* Checkbox overlay */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(slide.index)}
                      className="absolute top-2.5 left-2.5 p-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-slate-300 hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-pink-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Inspect button overlay */}
                    <button
                      type="button"
                      onClick={() =>
                        onOpenModal(
                          api.getSlidePreviewUrl(job.jobId, slide.index),
                          slide.fileName
                        )
                      }
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    >
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                        <Maximize2 className="w-3.5 h-3.5 text-pink-400" />
                        Inspect High-Res
                      </span>
                    </button>
                  </>
                ) : slide.status === 'rendering' ? (
                  <div className="text-center p-4 text-xs text-pink-400 space-y-2">
                    <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto" />
                    <p>Rendering in browser...</p>
                  </div>
                ) : (
                  <div className="text-center p-4 text-xs text-rose-400 space-y-2">
                    <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
                    <p className="font-semibold">Rendering Failed</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{slide.error}</p>
                    <button
                      type="button"
                      onClick={() => onRetrySlide(slide.index)}
                      className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Card Footer details */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {slide.fileName}
                    </span>
                    {isDone && (
                      <span className="text-[11px] font-mono text-pink-400">
                        {slide.width} × {slide.height}px
                      </span>
                    )}
                  </div>

                  {isDone && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>{formatFileSize(slide.fileSizeBytes)}</span>
                      {slide.renderTimeMs && <span>{slide.renderTimeMs}ms</span>}
                    </div>
                  )}
                </div>

                {isDone && (
                  <a
                    href={api.getSingleDownloadUrl(job.jobId, slide.index)}
                    download={slide.fileName}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-pink-400" />
                    <span>Download PNG</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
