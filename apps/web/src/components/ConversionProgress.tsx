import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { ExportJobStatus } from '@exporter/shared';

interface ConversionProgressProps {
  job: ExportJobStatus;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({ job }) => {
  if (job.state === 'idle') return null;

  return (
    <div className="bg-slate-900/80 border border-pink-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {job.state === 'rendering' || job.state === 'queued' ? (
            <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
          ) : job.state === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}

          <div>
            <h3 className="text-sm font-bold text-white">
              {job.state === 'queued' && 'Export Queued...'}
              {job.state === 'rendering' && `Rendering Slide ${job.currentSlide} of ${job.totalSlides}...`}
              {job.state === 'completed' && 'Export Complete!'}
              {job.state === 'failed' && 'Export Encountered Errors'}
            </h3>
            <p className="text-xs text-slate-400">
              {job.state === 'rendering'
                ? 'Playwright Chromium is generating pixel-perfect Instagram PNGs'
                : job.state === 'completed'
                ? 'All selected slides have been rendered and packaged'
                : 'Some slides could not be rendered'}
            </p>
          </div>
        </div>

        <span className="font-mono text-sm font-bold text-pink-400">{job.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
        <div
          className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 h-full rounded-full transition-all duration-300 shadow-sm shadow-pink-500/50"
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {/* Per slide progress badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {job.slides.map((s) => (
          <div
            key={s.slideId}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
              s.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : s.status === 'rendering'
                ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 animate-pulse'
                : s.status === 'failed'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-slate-950/60 text-slate-500 border-slate-800'
            }`}
          >
            {s.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            {s.status === 'rendering' && <Loader2 className="w-3 h-3 text-pink-400 animate-spin" />}
            {s.status === 'failed' && <AlertCircle className="w-3 h-3 text-rose-400" />}
            {s.status === 'pending' && <Clock className="w-3 h-3 text-slate-500" />}
            <span>{s.fileName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
