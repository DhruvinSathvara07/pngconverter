import React, { useState, useRef } from 'react';
import { UploadCloud, FolderArchive, FileCode, Sparkles, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { ProjectInfo } from '@exporter/shared';
import { api } from '../services/api.js';

interface ImportDropzoneProps {
  project: ProjectInfo | null;
  onProjectLoaded: (project: ProjectInfo) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  onError: (msg: string) => void;
}

export const ImportDropzone: React.FC<ImportDropzoneProps> = ({
  project,
  onProjectLoaded,
  isLoading,
  setIsLoading,
  onError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      setIsLoading(true);
      const items = e.dataTransfer.items;
      const files: File[] = [];
      const relativePaths: string[] = [];

      if (!items || items.length === 0) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const f = e.dataTransfer.files[i];
          files.push(f);
          relativePaths.push(f.name);
        }
      } else {
        const entries: any[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
            if (entry) {
              entries.push(entry);
            } else {
              const file = item.getAsFile();
              if (file) {
                files.push(file);
                relativePaths.push(file.name);
              }
            }
          }
        }

        const traverseEntry = async (entry: any, currentPath = ''): Promise<void> => {
          if (!entry) return;
          if (entry.isFile) {
            await new Promise<void>((resolve) => {
              entry.file(
                (file: File) => {
                  files.push(file);
                  relativePaths.push(currentPath ? `${currentPath}/${file.name}` : file.name);
                  resolve();
                },
                () => resolve()
              );
            });
          } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const readBatch = (): Promise<any[]> => {
              return new Promise((resolve) => {
                dirReader.readEntries(
                  (results: any[]) => resolve(results || []),
                  () => resolve([])
                );
              });
            };

            let batch: any[];
            do {
              batch = await readBatch();
              const dirPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              for (const child of batch) {
                await traverseEntry(child, dirPath);
              }
            } while (batch.length > 0);
          }
        };

        for (const entry of entries) {
          await traverseEntry(entry);
        }
      }

      if (files.length > 0) {
        await uploadFiles(files, relativePaths);
      } else {
        onError('No readable files were dropped.');
      }
    } catch (err: any) {
      onError(err.message || 'Failed to process dropped files');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFiles = async (files: File[], relativePaths?: string[]) => {
    setIsLoading(true);
    try {
      const proj = await api.uploadFiles(files, relativePaths);
      onProjectLoaded(proj);
    } catch (err: any) {
      onError(err.message || 'Failed to upload files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadWorkspaceCarousel = async () => {
    setIsLoading(true);
    try {
      const proj = await api.loadWorkspaceCarousel();
      onProjectLoaded(proj);
    } catch (err: any) {
      onError(err.message || 'Failed to load workspace carousel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntryChange = async (newEntry: string) => {
    if (!project) return;
    setIsLoading(true);
    try {
      const updated = await api.detectSlides(project.sessionId, newEntry);
      onProjectLoaded(updated);
    } catch (err: any) {
      onError(err.message || 'Failed to switch entry file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-pink-400" />
            1. Project Source
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Import your HTML file, project ZIP, or folder of HTML/CSS/JS assets
          </p>
        </div>

        {/* Quick action: Load Workspace Carousel */}
        <button
          type="button"
          onClick={handleLoadWorkspaceCarousel}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 text-pink-300 border border-pink-500/30 hover:border-pink-500/50 transition-all shadow-sm hover:shadow-pink-500/10 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          <span>Load Current Project (index.html)</span>
        </button>
      </div>

      {/* Drag & drop box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-pink-500 bg-pink-500/10 scale-[1.005]'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".html,.htm,.zip,.css,.js,.png,.jpg,.jpeg,.svg,.webp,.gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const filesArr = Array.from(e.target.files);
              uploadFiles(filesArr);
            }
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const filesArr = Array.from(e.target.files);
              const relPaths = filesArr.map((f) => f.webkitRelativePath || f.name);
              uploadFiles(filesArr, relPaths);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-pink-400">
            <FolderArchive className="w-6 h-6 text-pink-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">
              Drag & Drop your <span className="text-pink-400 font-semibold">HTML</span> or <span className="text-pink-400 font-semibold">ZIP file</span> here
            </p>
            <p className="text-xs text-slate-400">
              or click to browse from your computer
            </p>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Upload complete folder
            </button>
          </div>
        </div>
      </div>

      {/* Project Status Bar if loaded */}
      {project && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5" />
              <span>Project Loaded</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-slate-400">Entry:</span>
              {project.htmlFiles.length > 1 ? (
                <select
                  value={project.entryHtml}
                  onChange={(e) => handleEntryChange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-pink-500"
                >
                  {project.htmlFiles.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-mono font-medium text-slate-200">{project.entryHtml}</span>
              )}
            </div>

            <div className="text-slate-400">
              Assets: <strong className="text-slate-200">{project.assetCount}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadWorkspaceCarousel}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            title="Reload Project"
          >
            <RefreshCw className="w-3 h-3" />
            Reload
          </button>
        </div>
      )}

      {/* Warnings & missing assets */}
      {project && project.warnings.length > 0 && (
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Project Notice</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
            {project.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
