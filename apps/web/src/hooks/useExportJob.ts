import { useState, useEffect, useRef } from 'react';
import { ExportJobStatus } from '@exporter/shared';
import { api } from '../services/api.js';

export function useExportJob() {
  const [job, setJob] = useState<ExportJobStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!job || !isExporting) {
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

  const retrySlide = async (slideIndex: number) => {
    if (!job) return;
    try {
      const updated = await api.retrySlide(job.jobId, slideIndex);
      setJob(updated);
    } catch (err: any) {
      setError(err.message || 'Retry failed');
    }
  };

  return {
    job,
    isExporting,
    error,
    startJob,
    retrySlide,
    setJob,
  };
}
