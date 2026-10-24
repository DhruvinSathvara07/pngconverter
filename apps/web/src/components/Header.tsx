import React, { useState, useEffect } from 'react';
import { Layers, Instagram, CheckCircle2, Server, Zap, Settings2 } from 'lucide-react';
import { checkServerHealth, getBaseApiUrl } from '../services/api.js';
import { ApiStatusModal } from './ApiStatusModal.js';

export const Header: React.FC = () => {
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    ok: boolean;
    latencyMs: number;
    url: string;
  }>({
    ok: true,
    latencyMs: 120,
    url: getBaseApiUrl(),
  });

  const checkHealth = async () => {
    const res = await checkServerHealth();
    setServerStatus({
      ok: res.ok,
      latencyMs: res.latencyMs,
      url: res.url,
    });
  };

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
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
                    24/7 PRO
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                High-resolution HTML-to-Instagram PNG conversion engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Live 24/7 Server API Status Button */}
            <button
              type="button"
              onClick={() => setIsApiModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-pink-500/40 text-slate-200 transition-all cursor-pointer shadow-sm group"
              title="Click to inspect 24/7 API Server"
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      serverStatus.ok ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      serverStatus.ok ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <Server className="w-3.5 h-3.5 text-pink-400" />
                <span className="hidden sm:inline font-mono text-[11px] text-slate-300">
                  server-iota-two-31.vercel.app
                </span>
                <span className="sm:hidden font-mono text-[11px] text-slate-300">API 24/7</span>
              </div>

              {serverStatus.ok && (
                <span className="hidden md:flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  <Zap className="w-2.5 h-2.5" />
                  {serverStatus.latencyMs}ms
                </span>
              )}

              <Settings2 className="w-3 h-3 text-slate-400 group-hover:text-pink-400 transition-colors" />
            </button>

            {/* Ready Badge */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ultra-HD 24/7 Engine</span>
            </div>

            {/* Default Dimensions */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>Default: <strong className="text-slate-200">1080 × 1350</strong> (4:5)</span>
            </div>
          </div>
        </div>
      </header>

      <ApiStatusModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        onServerUpdated={checkHealth}
      />
    </>
  );
};
