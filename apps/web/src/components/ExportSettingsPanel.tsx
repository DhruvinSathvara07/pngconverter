import React from 'react';
import { Settings, Sliders, AlertTriangle, Play, Sparkles, Image as ImageIcon } from 'lucide-react';
import {
  ExportOptions,
  INSTAGRAM_PRESETS,
  InstagramPreset,
  PresetId,
  FitMode,
  ResolutionMultiplier,
  BackgroundMode,
  AnimationMode,
} from '@exporter/shared';

interface ExportSettingsPanelProps {
  options: ExportOptions;
  onChangeOptions: (updated: ExportOptions) => void;
  onStartExport: () => void;
  isExporting: boolean;
  selectedCount: number;
}

export const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({
  options,
  onChangeOptions,
  onStartExport,
  isExporting,
  selectedCount,
}) => {
  const selectedPreset = INSTAGRAM_PRESETS.find((p) => p.id === options.presetId) || INSTAGRAM_PRESETS[0];

  const handlePresetChange = (preset: InstagramPreset) => {
    onChangeOptions({
      ...options,
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
    });
  };

  const handleMultiplierChange = (multiplier: ResolutionMultiplier) => {
    onChangeOptions({
      ...options,
      multiplier,
    });
  };

  const finalWidth = options.width * options.multiplier;
  const finalHeight = options.height * options.multiplier;
  const targetAspect = (options.width / options.height).toFixed(2);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Settings className="w-4 h-4 text-pink-400" />
          3. Instagram Export Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Choose export dimensions, resolution multiplier, and background fit
        </p>
      </div>

      {/* Preset selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300 block">Preset Dimensions</label>
        <div className="grid grid-cols-2 gap-2">
          {INSTAGRAM_PRESETS.map((preset) => {
            const isSelected = options.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-pink-500/15 border-pink-500/50 shadow-sm shadow-pink-500/10'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-pink-300' : 'text-slate-200'}`}>
                    {preset.name}
                  </span>
                  {preset.recommended && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {preset.width} × {preset.height} px ({preset.aspectRatio})
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom width and height inputs if custom selected */}
        {options.presetId === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Custom Width (px)</label>
              <input
                type="number"
                min="100"
                max="8000"
                value={options.width}
                onChange={(e) =>
                  onChangeOptions({ ...options, width: parseInt(e.target.value, 10) || 1080 })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Custom Height (px)</label>
              <input
                type="number"
                min="100"
                max="8000"
                value={options.height}
                onChange={(e) =>
                  onChangeOptions({ ...options, height: parseInt(e.target.value, 10) || 1350 })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Resolution Multiplier & Exact Dimension Output */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300 block">Resolution Multiplier</label>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as ResolutionMultiplier[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMultiplierChange(m)}
              className={`py-2 px-3 rounded-xl border text-center font-mono text-xs font-semibold transition-all ${
                options.multiplier === m
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                  : 'bg-slate-950/40 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {m}x {m === 1 ? '(Standard)' : m === 2 ? '(Retina HD)' : '(Ultra 4K)'}
            </button>
          ))}
        </div>

        {/* Dimension display badge */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Exact Output Canvas:</span>
          <span className="font-mono font-bold text-pink-400">
            {finalWidth} × {finalHeight} px
          </span>
        </div>
      </div>

      {/* Fit Mode */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">Fit Mode</label>
          <span className="text-[11px] text-slate-500">Aspect ratio: {targetAspect}:1</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['contain', 'cover', 'crop'] as FitMode[]).map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => onChangeOptions({ ...options, fitMode: fit })}
              className={`py-2 px-2.5 rounded-xl border text-center text-xs capitalize font-medium transition-all ${
                options.fitMode === fit
                  ? 'bg-pink-500/15 text-pink-300 border-pink-500/50'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {fit}
            </button>
          ))}
        </div>

        {options.fitMode === 'crop' && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Warning: Crop mode will trim slide edges that exceed the {targetAspect}:1 ratio.</span>
          </div>
        )}
      </div>

      {/* Background Options */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300 block">Canvas Background</label>
        <div className="grid grid-cols-3 gap-2">
          {(['original', 'transparent', 'custom'] as BackgroundMode[]).map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => onChangeOptions({ ...options, backgroundMode: bg })}
              className={`py-2 px-2.5 rounded-xl border text-center text-xs capitalize font-medium transition-all ${
                options.backgroundMode === bg
                  ? 'bg-pink-500/15 text-pink-300 border-pink-500/50'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {bg}
            </button>
          ))}
        </div>

        {options.backgroundMode === 'custom' && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="color"
              value={options.customBackgroundColor || '#000000'}
              onChange={(e) =>
                onChangeOptions({ ...options, customBackgroundColor: e.target.value })
              }
              className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={options.customBackgroundColor || '#000000'}
              onChange={(e) =>
                onChangeOptions({ ...options, customBackgroundColor: e.target.value })
              }
              className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 uppercase"
            />
          </div>
        )}
      </div>

      {/* Padding slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-medium text-slate-300">Inner Padding</label>
          <span className="font-mono text-slate-400">{options.paddingPx}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="120"
          step="5"
          value={options.paddingPx}
          onChange={(e) =>
            onChangeOptions({ ...options, paddingPx: parseInt(e.target.value, 10) || 0 })
          }
          className="w-full accent-pink-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
        />
      </div>

      {/* Animation & Timeline settings */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-medium text-slate-300 block">Animation Capture Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {(['stable', 'delay', 'timeline'] as AnimationMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeOptions({ ...options, animationMode: mode })}
              className={`py-1.5 px-2 rounded-lg border text-center text-xs capitalize font-medium transition-all ${
                options.animationMode === mode
                  ? 'bg-slate-800 text-pink-300 border-pink-500/50'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {mode === 'stable' ? 'Stable (Default)' : mode === 'delay' ? 'Delay' : 'Timeline'}
            </button>
          ))}
        </div>

        {options.animationMode === 'delay' && (
          <div className="pt-1">
            <label className="text-[11px] text-slate-400 block mb-1">Wait Delay (ms)</label>
            <input
              type="number"
              min="0"
              max="10000"
              step="100"
              value={options.animationDelayMs}
              onChange={(e) =>
                onChangeOptions({ ...options, animationDelayMs: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
            />
          </div>
        )}
      </div>

      {/* Filename Prefix */}
      <div className="space-y-1 pt-1">
        <label className="text-[11px] text-slate-400 block">Filename Prefix</label>
        <input
          type="text"
          value={options.filenamePrefix}
          onChange={(e) => onChangeOptions({ ...options, filenamePrefix: e.target.value })}
          placeholder="slide-"
          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
        />
        <p className="text-[10px] text-slate-500">Output files: {options.filenamePrefix}01.png, {options.filenamePrefix}02.png...</p>
      </div>

      {/* Primary Convert Button */}
      <div className="pt-3">
        <button
          type="button"
          onClick={onStartExport}
          disabled={isExporting || selectedCount === 0}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:via-rose-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Rendering Slides ({selectedCount})...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-pink-200" />
              <span>Convert to PNG ({selectedCount} Slides)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
