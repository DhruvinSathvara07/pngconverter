import React from 'react';
import { Layers, Sparkles, Instagram, CheckCircle2 } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-0.5 shadow-lg shadow-pink-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Carousel<span className="text-pink-400">PNG</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  PRO
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              High-resolution HTML-to-Instagram PNG conversion engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chromium Ready</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>Default: <strong className="text-slate-200">1080 × 1350</strong> (4:5)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
