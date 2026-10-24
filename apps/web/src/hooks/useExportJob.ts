import { useState, useEffect, useRef } from 'react';
import { ExportJobStatus, ExportOptions } from '@exporter/shared';
import { api } from '../services/api.js';
import { ClientRenderer } from '../services/clientRenderer.js';

export function useExportJob() {
  const [job, setJob] = useState<ExportJobStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<'browser' | 'server'>('browser');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startJob = (newJob: ExportJobStatus) => {
    setJob(newJob);
    setIsExporting(true);
    setError(null);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (!job || !isExporting || job.jobId.startsWith('client-')) {
      stopPolling();
      return;
    }

    if (job.state === 'completed' || job.state === 'failed') {
      setIsExporting(false);
      stopPolling();
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await api.getJobStatus(job.jobId);
        setJob(updated);
        if (updated.state === 'completed' || updated.state === 'failed') {
          setIsExporting(false);
          stopPolling();
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err.message || 'Error tracking export progress');
        stopPolling();
      }
    }, 800);

    return () => stopPolling();
  }, [job?.jobId, job?.state, isExporting]);

  const runExport = async (options: ExportOptions, iframe: HTMLIFrameElement | null) => {
    setIsExporting(true);
    setError(null);

    // Prefer high-performance 24/7 in-browser engine if iframe available or engineMode is browser
    if (iframe && (engineMode === 'browser' || !window.location.hostname.includes('localhost'))) {
      try {
        const resultJob = await ClientRenderer.renderSlides(iframe, options, (updated) => {
          setJob({ ...updated });
        });
        setJob(resultJob);
        setIsExporting(false);
        return;
      } catch (clientErr: any) {
        console.warn('In-browser render failed, attempting server export fallback:', clientErr);
      }
    }

    // Server-side export
    try {
      const serverJob = await api.startExport(options);
      startJob(serverJob);
    } catch (err: any) {
      // If server export failed (e.g. serverless environment), try client render as fallback
      if (iframe) {
        try {
          const resultJob = await ClientRenderer.renderSlides(iframe, options, (updated) => {
            setJob({ ...updated });
          });
          setJob(resultJob);
          setIsExporting(false);
          return;
        } catch (innerClientErr: any) {
          setError(innerClientErr.message || 'Export failed');
        }
      } else {
        setError(err.message || 'Failed to start export');
      }
      setIsExporting(false);
    }
  };

  const retrySlide = async (slideIndex: number, iframe?: HTMLIFrameElement | null) => {
    if (!job) return;

    if (job.jobId.startsWith('client-') && iframe) {
      try {
        const singleOption = {
          sessionId: job.sessionId,
          presetId: 'custom' as any,
          width: job.slides[0]?.width || 1080,
          height: job.slides[0]?.height || 1350,
          multiplier: 1 as any,
          fitMode: 'contain' as any,
          backgroundMode: 'original' as any,
          paddingPx: 0,
          animationMode: 'stable' as any,
          animationDelayMs: 0,
          slideSelector: '.slide',
          filenamePrefix: 'slide-',
          selectedSlideIndices: [slideIndex],
        };
        await ClientRenderer.renderSlides(iframe, singleOption, (updated) => {
          setJob((prev) => {
            if (!prev) return updated;
            const newSlides = [...prev.slides];
            const updatedSlide = updated.slides[0];
            const targetIdx = newSlides.findIndex((s) => s.index === slideIndex);
            if (targetIdx !== -1 && updatedSlide) {
              newSlides[targetIdx] = updatedSlide;
            }
            return { ...prev, slides: newSlides };
          });
        });
      } catch (err: any) {
        setError(err.message || 'Retry failed');
      }
      return;
    }

    try {
      const updated = await api.retrySlide(job.jobId, slideIndex);
      setJob(updated);
    } catch (err: any) {
      setError(err.message || 'Retry failed');
    }
  };

  const downloadSingle = (slideIndex: number, jobId: string, fileName: string) => {
    if (jobId.startsWith('client-') || ClientRenderer.getSlideBlob(slideIndex)) {
      ClientRenderer.downloadSlide(slideIndex);
    } else {
      const a = document.createElement('a');
      a.href = api.getSingleDownloadUrl(jobId, slideIndex);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const downloadAll = (jobId: string) => {
    if (jobId.startsWith('client-') || ClientRenderer.getZipBlob()) {
      ClientRenderer.downloadAllZip();
    } else {
      window.location.href = api.getZipDownloadUrl(jobId);
    }
  };

  const downloadSelected = async (jobId: string, indices: number[]) => {
    if (jobId.startsWith('client-') || indices.every((i) => ClientRenderer.getSlideBlob(i))) {
      await ClientRenderer.downloadSelectedZip(indices);
    } else {
      await api.downloadSelectedZip(jobId, indices);
    }
  };

  return {
    job,
    isExporting,
    error,
    engineMode,
    setEngineMode,
    runExport,
    startJob,
    retrySlide,
    downloadSingle,
    downloadAll,
    downloadSelected,
    setJob,
  };
}
