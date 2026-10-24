import { ProjectInfo, ExportOptions, ExportJobStatus } from '@exporter/shared';
import { detectSlidesFromHtml } from './slideParser.js';

export const DEFAULT_API_URL = 'https://server-iota-two-31.vercel.app';

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('EXPORTER_API_URL');
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/$/, '');
      return clean.startsWith('http') && !clean.endsWith('/api') ? `${clean}/api` : clean;
    }
  }

  const env = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
  const raw = env || DEFAULT_API_URL;
  const clean = raw.replace(/\/$/, '');
  return clean.startsWith('http') && !clean.endsWith('/api') ? `${clean}/api` : clean;
}

export function setCustomApiUrl(url: string | null): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('EXPORTER_API_URL', url.trim());
    } else {
      localStorage.removeItem('EXPORTER_API_URL');
    }
  }
}

export async function checkServerHealth(): Promise<{
  ok: boolean;
  status: string;
  latencyMs: number;
  url: string;
  error?: string;
}> {
  const base = getBaseApiUrl();
  const healthUrl = `${base}/health`;
  const start = performance.now();
  try {
    const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(6000) });
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok) {
      const data = await res.json().catch(() => ({ status: 'ok' }));
      return { ok: true, status: data.status || 'ok', latencyMs, url: base };
    }
    return { ok: false, status: `HTTP ${res.status}`, latencyMs, url: base, error: `HTTP ${res.status}` };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, status: 'offline', latencyMs, url: base, error: err.message || 'Connection failed' };
  }
}

async function request<T>(endpoint: string, init?: RequestInit, fallbackError = 'API request failed'): Promise<T> {
  const base = getBaseApiUrl();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(
      `Cannot connect to backend server at ${url}. Please verify ${DEFAULT_API_URL} is online.`
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
        `Backend server returned HTML at ${url}. Please verify the API route is configured.`
      );
    }
    throw new Error(`${fallbackError} (${res.status})`);
  }

  if (!isJson) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Received HTML instead of JSON from ${url}.`);
    }
  }

  return (await res.json()) as T;
}

export const api = {
  getBaseUrl(): string {
    return getBaseApiUrl();
  },

  async loadWorkspaceCarousel(): Promise<ProjectInfo> {
    try {
      const data = await request<{ project: ProjectInfo }>(
        '/projects/load-workspace',
        { method: 'POST' },
        'Failed to load workspace carousel'
      );
      let project = data.project;

      // If slide detection returned 0 slides (e.g. serverless environment), parse entry HTML
      if (!project.detectedSlides || project.detectedSlides.length === 0) {
        project = await this.enrichSlideDetection(project);
      }
      return project;
    } catch (err: any) {
      console.warn('Direct load-workspace failed, falling back to bundled sample carousel:', err.message);
      // Fallback to bundled sample-carousel.html
      const sampleRes = await fetch('/sample-carousel.html');
      if (!sampleRes.ok) {
        throw new Error('Could not load sample carousel template.');
      }
      const sampleHtml = await sampleRes.text();
      const sampleFile = new File([sampleHtml], 'index.html', { type: 'text/html' });
      return this.uploadFiles([sampleFile], ['index.html']);
    }
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

    let project = data.project;

    // If server detection couldn't find slides (e.g. missing server chromium), detect via client DOM parser
    if (!project.detectedSlides || project.detectedSlides.length === 0) {
      project = await this.enrichSlideDetection(project);
    }

    return project;
  },

  async detectSlides(sessionId: string, entryHtml?: string, customSelector?: string): Promise<ProjectInfo> {
    let project: ProjectInfo;
    try {
      const data = await request<{ project: ProjectInfo }>(
        '/projects/detect-slides',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, entryHtml, customSelector }),
        },
        'Slide detection failed'
      );
      project = data.project;
    } catch {
      project = {
        sessionId,
        entryHtml: entryHtml || 'index.html',
        htmlFiles: [entryHtml || 'index.html'],
        detectedSlides: [],
        detectedSelector: customSelector || '',
        candidateSelectors: [],
        assetCount: 0,
        missingAssets: [],
        warnings: [],
      };
    }

    if (!project.detectedSlides || project.detectedSlides.length === 0 || customSelector) {
      project = await this.enrichSlideDetection(project, customSelector);
    }

    return project;
  },

  async enrichSlideDetection(project: ProjectInfo, customSelector?: string): Promise<ProjectInfo> {
    try {
      const fileUrl = this.getIframeUrl(project.sessionId, project.entryHtml);
      const res = await fetch(fileUrl);
      if (res.ok) {
        const html = await res.text();
        const clientDetected = detectSlidesFromHtml(html, customSelector || project.detectedSelector);
        if (clientDetected.detectedSlides.length > 0) {
          return {
            ...project,
            detectedSlides: clientDetected.detectedSlides,
            detectedSelector: clientDetected.detectedSelector,
            candidateSelectors:
              clientDetected.candidateSelectors.length > 0
                ? clientDetected.candidateSelectors
                : project.candidateSelectors,
            warnings: project.warnings.filter((w) => !w.includes("Executable doesn't exist")),
          };
        }
      }
    } catch (e) {
      console.warn('Client-side DOM slide detection fallback error:', e);
    }
    return project;
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
    const base = getBaseApiUrl();
    return `${base}/projects/sessions/${sessionId}/files/${entryHtml}`;
  },

  getSingleDownloadUrl(jobId: string, slideIndex: number): string {
    const base = getBaseApiUrl();
    return `${base}/downloads/jobs/${jobId}/slides/${slideIndex}`;
  },

  getSlidePreviewUrl(jobId: string, slideIndex: number): string {
    const base = getBaseApiUrl();
    return `${base}/downloads/jobs/${jobId}/slides/${slideIndex}/preview`;
  },

  getZipDownloadUrl(jobId: string): string {
    const base = getBaseApiUrl();
    return `${base}/downloads/jobs/${jobId}/zip`;
  },

  async downloadSelectedZip(jobId: string, slideIndices: number[]) {
    const base = getBaseApiUrl();
    const url = `${base}/downloads/jobs/${jobId}/selected-zip`;
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
