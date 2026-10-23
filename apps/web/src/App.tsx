import React, { useState } from 'react';
import { Header } from './components/Header.js';
import { ImportDropzone } from './components/ImportDropzone.js';
import { SlideSelector } from './components/SlideSelector.js';
import { ExportSettingsPanel } from './components/ExportSettingsPanel.js';
import { PreviewWorkspace } from './components/PreviewWorkspace.js';
import { ConversionProgress } from './components/ConversionProgress.js';
import { ExportResults } from './components/ExportResults.js';
import { ImageModal } from './components/ImageModal.js';
import { useExportJob } from './hooks/useExportJob.js';
import { ProjectInfo, ExportOptions, SlideInfo } from '@exporter/shared';
import { api } from './services/api.js';
import { AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [selectedSlideIndices, setSelectedSlideIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });

  const { job, isExporting, startJob, retrySlide } = useExportJob();

  const [options, setOptions] = useState<ExportOptions>({
    sessionId: '',
    presetId: 'instagram-portrait',
    width: 1080,
    height: 1350,
    multiplier: 1,
    fitMode: 'contain',
    backgroundMode: 'original',
    paddingPx: 0,
    animationMode: 'stable',
    animationDelayMs: 0,
    slideSelector: '.slide',
    filenamePrefix: 'slide-',
    selectedSlideIndices: [],
  });

  const handleProjectLoaded = (newProject: ProjectInfo) => {
    setProject(newProject);
    setActiveSlideIndex(0);

    const allIndices = newProject.detectedSlides.map((s) => s.index);
    setSelectedSlideIndices(allIndices);

    setOptions((prev) => ({
      ...prev,
      sessionId: newProject.sessionId,
      slideSelector: newProject.detectedSelector || prev.slideSelector,
      selectedSlideIndices: allIndices,
    }));
  };

  const handleToggleSlide = (index: number) => {
    setSelectedSlideIndices((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
      setOptions((opt) => ({ ...opt, selectedSlideIndices: next }));
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!project) return;
    const all = project.detectedSlides.map((s) => s.index);
    setSelectedSlideIndices(all);
    setOptions((opt) => ({ ...opt, selectedSlideIndices: all }));
  };

  const handleDeselectAll = () => {
    setSelectedSlideIndices([]);
    setOptions((opt) => ({ ...opt, selectedSlideIndices: [] }));
  };

  const handleReorderSlides = (reordered: SlideInfo[]) => {
    if (!project) return;
    setProject({ ...project, detectedSlides: reordered });
    const newIndices = reordered.map((s) => s.index);
    setSelectedSlideIndices(newIndices);
    setOptions((opt) => ({ ...opt, selectedSlideIndices: newIndices }));
  };

  const handleApplyCustomSelector = async (customSelector: string) => {
    if (!project) return;
    setIsLoading(true);
    try {
      const updated = await api.detectSlides(project.sessionId, project.entryHtml, customSelector);
      handleProjectLoaded(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to detect with custom selector');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExport = async () => {
    if (!project) return;
    if (selectedSlideIndices.length === 0) {
      setErrorMessage('Please select at least one slide to export.');
      return;
    }

    const exportPayload: ExportOptions = {
      ...options,
      sessionId: project.sessionId,
      slideSelector: project.detectedSelector || options.slideSelector,
      selectedSlideIndices,
    };

    try {
      const createdJob = await api.startExport(exportPayload);
      startJob(createdJob);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start export');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Import, Slides, Settings */}
          <div className="lg:col-span-5 space-y-6">
            <ImportDropzone
              project={project}
              onProjectLoaded={handleProjectLoaded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onError={setErrorMessage}
            />

            {project && (
              <>
                <SlideSelector
                  slides={project.detectedSlides}
                  selectedIndices={selectedSlideIndices}
                  onToggleSlide={handleToggleSlide}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onReorderSlides={handleReorderSlides}
                  activeSlideIndex={activeSlideIndex}
                  onSelectPreviewSlide={setActiveSlideIndex}
                  detectedSelector={project.detectedSelector}
                  candidateSelectors={project.candidateSelectors}
                  onApplySelector={handleApplyCustomSelector}
                  isLoading={isLoading}
                />

                <ExportSettingsPanel
                  options={options}
                  onChangeOptions={setOptions}
                  onStartExport={handleStartExport}
                  isExporting={isExporting}
                  selectedCount={selectedSlideIndices.length}
                />
              </>
            )}
          </div>

          {/* Right Column: Preview, Progress, Export Results */}
          <div className="lg:col-span-7 space-y-6">
            <PreviewWorkspace
              sessionId={project?.sessionId || ''}
              entryHtml={project?.entryHtml || ''}
              slides={project?.detectedSlides || []}
              activeSlideIndex={activeSlideIndex}
              onSelectSlideIndex={setActiveSlideIndex}
              job={job}
              onOpenModal={(url, title) => setModalState({ isOpen: true, imageUrl: url, title })}
            />

            {job && job.state !== 'idle' && (
              <ConversionProgress job={job} />
            )}

            {job && (job.state === 'rendering' || job.state === 'completed' || job.state === 'failed') && (
              <ExportResults
                job={job}
                onRetrySlide={retrySlide}
                onOpenModal={(url, title) =>
                  setModalState({ isOpen: true, imageUrl: url, title })
                }
              />
            )}
          </div>
        </div>
      </main>

      {/* High-res Image Modal */}
      <ImageModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        imageUrl={modalState.imageUrl}
        title={modalState.title}
      />
    </div>
  );
};
