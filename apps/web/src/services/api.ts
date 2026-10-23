import { ProjectInfo, ExportOptions, ExportJobStatus } from '@exporter/shared';

const API_BASE = '/api';

export const api = {
  async loadWorkspaceCarousel(): Promise<ProjectInfo> {
    const res = await fetch(`${API_BASE}/projects/load-workspace`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load workspace carousel');
    }
    const data = await res.json();
    return data.project;
  },

  async uploadFiles(files: File[], relativePaths?: string[]): Promise<ProjectInfo> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
      if (relativePaths && relativePaths[index]) {
        formData.append('relativePaths', relativePaths[index]);
      }
    });

    const res = await fetch(`${API_BASE}/projects/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload project files');
    }

    const data = await res.json();
    return data.project;
  },

  async detectSlides(sessionId: string, entryHtml?: string, customSelector?: string): Promise<ProjectInfo> {
    const res = await fetch(`${API_BASE}/projects/detect-slides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, entryHtml, customSelector }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Slide detection failed');
    }

    const data = await res.json();
    return data.project;
  },

  async startExport(options: ExportOptions): Promise<ExportJobStatus> {
    const res = await fetch(`${API_BASE}/exports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initiate export job');
    }

    const data = await res.json();
    return data.job;
  },

  async getJobStatus(jobId: string): Promise<ExportJobStatus> {
    const res = await fetch(`${API_BASE}/exports/${jobId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch job status');
    }
    const data = await res.json();
    return data.job;
  },

  async retrySlide(jobId: string, slideIndex: number): Promise<ExportJobStatus> {
    const res = await fetch(`${API_BASE}/exports/${jobId}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slideIndex }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retry slide');
    }

    const data = await res.json();
    return data.job;
  },

  getIframeUrl(sessionId: string, entryHtml: string): string {
    return `${API_BASE}/projects/sessions/${sessionId}/files/${entryHtml}`;
  },

  getSingleDownloadUrl(jobId: string, slideIndex: number): string {
    return `${API_BASE}/downloads/jobs/${jobId}/slides/${slideIndex}`;
  },

  getSlidePreviewUrl(jobId: string, slideIndex: number): string {
    return `${API_BASE}/downloads/jobs/${jobId}/slides/${slideIndex}/preview`;
  },

  getZipDownloadUrl(jobId: string): string {
    return `${API_BASE}/downloads/jobs/${jobId}/zip`;
  },

  async downloadSelectedZip(jobId: string, slideIndices: number[]) {
    const res = await fetch(`${API_BASE}/downloads/jobs/${jobId}/selected-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slideIndices }),
    });

    if (!res.ok) {
      throw new Error('Failed to download selected slides ZIP');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-slides-${jobId.slice(0, 8)}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
