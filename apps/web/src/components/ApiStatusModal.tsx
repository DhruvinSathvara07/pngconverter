import React, { useState, useEffect } from 'react';
import { Server, Activity, CheckCircle2, AlertCircle, RefreshCw, X, Globe, Zap, ExternalLink } from 'lucide-react';
import { getBaseApiUrl, setCustomApiUrl, checkServerHealth, DEFAULT_API_URL } from '../services/api.js';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUpdated: () => void;
}

export const ApiStatusModal: React.FC<ApiStatusModalProps> = ({ isOpen, onClose, onServerUpdated }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [healthStatus, setHealthStatus] = useState<{
    ok: boolean;
    status: string;
    latencyMs: number;
    url: string;
    error?: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getBaseApiUrl();
      setCurrentUrl(active);
      setCustomInput(active.replace(/\/api$/, ''));
      runHealthCheck();
    }
  }, [isOpen]);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkServerHealth();
      setHealthStatus(res);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = () => {
    const input = customInput.trim();
    if (!input) {
      setCustomApiUrl(null);
    } else {
      setCustomApiUrl(input);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onServerUpdated();
    runHealthCheck();
  };

  const handleResetDefault = () => {
    setCustomApiUrl(null);
    setCustomInput(DEFAULT_API_URL);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onServerUpdated();
    runHealthCheck();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Server className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                24/7 Cloud API Configuration
              </h3>
              <p className="text-xs text-slate-400">Backend Server Health & Endpoint Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Active Status Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-pink-400" />
                Live Connection Status
              </span>
              <button
                type="button"
                onClick={runHealthCheck}
                disabled={isChecking}
                className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Test Ping</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    healthStatus?.ok
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-sm font-bold text-white">
                  {healthStatus?.ok ? 'Connected (24/7 Online)' : isChecking ? 'Pinging server...' : 'Unreachable'}
                </span>
              </div>

              {healthStatus?.ok && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <Zap className="w-3 h-3" />
                  <span>{healthStatus.latencyMs} ms</span>
                </div>
              )}
            </div>

            <div className="text-xs font-mono text-slate-400 break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span>{healthStatus?.url || currentUrl}</span>
              <a
                href={`${(healthStatus?.url || currentUrl).replace(/\/$/, '')}/health`}
                target="_blank"
                rel="noreferrer"
                className="text-pink-400 hover:text-pink-300 ml-2"
                title="Open health endpoint in browser"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Configuration Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Server API Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://server-iota-two-31.vercel.app"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white transition-all shadow-md shadow-pink-500/20 cursor-pointer"
              >
                Apply
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Default Cloud API:</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-pink-400 hover:underline cursor-pointer"
              >
                Reset to {DEFAULT_API_URL.replace('https://', '')}
              </button>
            </div>
          </div>

          {/* Success banner */}
          {saveSuccess && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>API configuration updated successfully!</span>
            </div>
          )}

          {/* Info Badge */}
          <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-pink-400" />
              Always-on 24/7 Server Architecture
            </p>
            <p className="text-[11px] text-slate-400">
              The frontend continuously links with your deployed Vercel API (<code className="text-pink-300">server-iota-two-31.vercel.app</code>) for project sessions, multi-file uploads, and live status. Exports run in high-definition 24/7 without timeout limits.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
