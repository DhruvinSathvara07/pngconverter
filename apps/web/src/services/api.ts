import { ProjectInfo, ExportOptions, ExportJobStatus } from '@exporter/shared';

const ENV_API = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const API_BASE = ENV_API.startsWith('http') && !ENV_API.endsWith('/api') ? `${ENV_API}/api` : ENV_API;

async function request<T>(endpoint: string, init?: RequestInit, fallbackError = 'API request failed'): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(
      `Cannot connect to backend server at ${url}. If deployed on Vercel, please set VITE_API_URL in Environment Variables.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `${fallbackError} (${res.status})`);
    }
    const text = await res.text().catch(() => '');
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        `Backend server not reachable at ${url}. Please configure VITE_API_URL in Vercel to point to your backend API.`
      );
    }
    throw new Error(`${fallbackError} (${res.status})`);
  }

  if (!isJson) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(
        `Received HTML instead of JSON from ${url}. Please verify VITE_API_URL points to the backend server.`
      );
    }
  }

  return (await res.json()) as T;
}

export const api = {
  async loadWorkspaceCarousel(): Promise<ProjectInfo> {
    const data = await request<{ project: ProjectInfo }>(
      '/projects/load-workspace',
      { method: 'POST' },
      'Failed to load workspace carousel'
    );
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

    const data = await request<{ project: ProjectInfo }>(
      '/projects/upload',
      { method: 'POST', body: formData },
      'Failed to upload project files'
    );
    return data.project;
  },

  async detectSlides(sessionId: string, entryHtml?: string, customSelector?: string): Promise<ProjectInfo> {
    const data = await request<{ project: ProjectInfo }>(
      '/projects/detect-slides',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, entryHtml, customSelector }),
      },
      'Slide detection failed'
    );
    return data.project;
  },

  async startExport(options: ExportOptions): Promise<ExportJobStatus> {
    const data = await request<{ job: ExportJobStatus }>(
      '/exports',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      },
      'Failed to initiate export job'
    );
    return data.job;
  },

  async getJobStatus(jobId: string): Promise<ExportJobStatus> {
    const data = await request<{ job: ExportJobStatus }>(
      `/exports/${jobId}`,
      undefined,
      'Failed to fetch job status'
    );
    return data.job;
  },

  async retrySlide(jobId: string, slideIndex: number): Promise<ExportJobStatus> {
    const data = await request<{ job: ExportJobStatus }>(
      `/exports/${jobId}/retry`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIndex }),
      },
      'Failed to retry slide'
    );
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
    const url = `${API_BASE}/downloads/jobs/${jobId}/selected-zip`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIndices }),
      });
    } catch {
      throw new Error(`Cannot reach backend at ${url} to download selected slides.`);
    }

    if (!res.ok) {
      throw new Error(`Failed to download selected slides ZIP (${res.status})`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `selected-slides-${jobId.slice(0, 8)}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  },
};
