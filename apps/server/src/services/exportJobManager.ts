import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExportJobStatus, ExportOptions, ExportedSlideResult } from '@exporter/shared';
import { SERVER_CONFIG } from '../config/constants.js';
import { BrowserRenderingService } from './browserRenderingService.js';
import { ImageProcessingService } from './imageProcessingService.js';
import { ZipPackagingService } from './zipPackagingService.js';

interface StoredJob {
  status: ExportJobStatus;
  options: ExportOptions;
  entryHtml: string;
  outputDir: string;
  createdAt: number;
}

export class ExportJobManager {
  private static jobs: Map<string, StoredJob> = new Map();

  static createJob(
    sessionId: string,
    entryHtml: string,
    options: ExportOptions
  ): ExportJobStatus {
    const jobId = uuidv4();
    const outputDir = path.join(SERVER_CONFIG.EXPORTS_DIR, jobId);
    fs.mkdirSync(outputDir, { recursive: true });

    const warnings: string[] = [];
    const targetAspect = options.width / options.height;

    if (options.fitMode === 'crop') {
      warnings.push('Crop mode will trim slide edges that exceed target aspect ratio.');
    }

    const slides: ExportedSlideResult[] = options.selectedSlideIndices.map((slideIndex, idx) => {
      const paddedNum = String(idx + 1).padStart(2, '0');
      const fileName = `${options.filenamePrefix}${paddedNum}.png`;
      return {
        slideId: `slide-${slideIndex + 1}`,
        index: slideIndex,
        fileName,
        status: 'pending',
        width: options.width * options.multiplier,
        height: options.height * options.multiplier,
      };
    });

    const jobStatus: ExportJobStatus = {
      jobId,
      sessionId,
      state: 'queued',
      progress: 0,
      currentSlide: 0,
      totalSlides: slides.length,
      slides,
      warnings,
      startedAt: Date.now(),
    };

    const stored: StoredJob = {
      status: jobStatus,
      options,
      entryHtml,
      outputDir,
      createdAt: Date.now(),
    };

    this.jobs.set(jobId, stored);

    // Run async background processing
    this.processJob(jobId).catch((err) => {
      console.error(`Export job ${jobId} failed:`, err);
    });

    return jobStatus;
  }

  static getJob(jobId: string): ExportJobStatus | null {
    const stored = this.jobs.get(jobId);
    return stored ? stored.status : null;
  }

  static getJobFiles(jobId: string): { outputDir: string; status: ExportJobStatus } | null {
    const stored = this.jobs.get(jobId);
    if (!stored) return null;
    return { outputDir: stored.outputDir, status: stored.status };
  }

  private static async processJob(jobId: string) {
    const stored = this.jobs.get(jobId);
    if (!stored) return;

    const { status, options, entryHtml, outputDir } = stored;
    status.state = 'rendering';

    let successCount = 0;

    for (let i = 0; i < status.slides.length; i++) {
      const slideResult = status.slides[i];
      status.currentSlide = i + 1;
      slideResult.status = 'rendering';

      const startTime = Date.now();

      try {
        // Render slide in isolated Chromium browser context
        const rawBuffer = await BrowserRenderingService.renderSlide(
          status.sessionId,
          entryHtml,
          slideResult.index,
          options
        );

        // Process through Sharp (resizing, canvas composite, dimension verification)
        const processed = await ImageProcessingService.processSlideImage(rawBuffer, options);

        const outPath = path.join(outputDir, slideResult.fileName);
        fs.writeFileSync(outPath, processed.buffer);

        slideResult.status = 'completed';
        slideResult.width = processed.actualWidth;
        slideResult.height = processed.actualHeight;
        slideResult.fileSizeBytes = processed.fileSizeBytes;
        slideResult.renderTimeMs = Date.now() - startTime;
        slideResult.downloadUrl = `/api/downloads/jobs/${jobId}/slides/${slideResult.index}`;
        slideResult.previewUrl = `/api/downloads/jobs/${jobId}/slides/${slideResult.index}/preview`;

        successCount++;
      } catch (err: any) {
        console.error(`Error rendering slide index ${slideResult.index}:`, err);
        slideResult.status = 'failed';
        slideResult.error = err.message || 'Rendering failed';
      }

      status.progress = Math.round(((i + 1) / status.totalSlides) * 100);
    }

    // Generate ZIP file if any slides succeeded
    if (successCount > 0) {
      try {
        const completedFiles = status.slides
          .filter((s) => s.status === 'completed')
          .map((s) => ({
            filePath: path.join(outputDir, s.fileName),
            zipFileName: s.fileName,
          }));

        const zipBuffer = await ZipPackagingService.createZipFromFiles(completedFiles);
        const zipPath = path.join(outputDir, 'carousel-export.zip');
        fs.writeFileSync(zipPath, zipBuffer);

        status.zipDownloadUrl = `/api/downloads/jobs/${jobId}/zip`;
      } catch (zipErr) {
        console.error('Failed to create export ZIP archive:', zipErr);
        status.warnings.push('Failed to bundle ZIP archive, individual PNGs are available.');
      }
    }

    status.completedAt = Date.now();
    status.state = successCount > 0 ? 'completed' : 'failed';
    if (successCount === 0) {
      status.error = 'All slides failed to render. Please check your HTML or selectors.';
    }
  }

  static async retrySlide(jobId: string, slideIndex: number): Promise<ExportJobStatus> {
    const stored = this.jobs.get(jobId);
    if (!stored) throw new Error('Job not found');

    const { status, options, entryHtml, outputDir } = stored;
    const slideResult = status.slides.find((s) => s.index === slideIndex);
    if (!slideResult) throw new Error(`Slide ${slideIndex} not found in job`);

    slideResult.status = 'rendering';
    slideResult.error = undefined;
    const startTime = Date.now();

    try {
      const rawBuffer = await BrowserRenderingService.renderSlide(
        status.sessionId,
        entryHtml,
        slideResult.index,
        options
      );

      const processed = await ImageProcessingService.processSlideImage(rawBuffer, options);
      const outPath = path.join(outputDir, slideResult.fileName);
      fs.writeFileSync(outPath, processed.buffer);

      slideResult.status = 'completed';
      slideResult.width = processed.actualWidth;
      slideResult.height = processed.actualHeight;
      slideResult.fileSizeBytes = processed.fileSizeBytes;
      slideResult.renderTimeMs = Date.now() - startTime;
      slideResult.downloadUrl = `/api/downloads/jobs/${jobId}/slides/${slideResult.index}`;
      slideResult.previewUrl = `/api/downloads/jobs/${jobId}/slides/${slideResult.index}/preview`;

      // Re-generate ZIP file
      const completedFiles = status.slides
        .filter((s) => s.status === 'completed')
        .map((s) => ({
          filePath: path.join(outputDir, s.fileName),
          zipFileName: s.fileName,
        }));

      const zipBuffer = await ZipPackagingService.createZipFromFiles(completedFiles);
      const zipPath = path.join(outputDir, 'carousel-export.zip');
      fs.writeFileSync(zipPath, zipBuffer);
      status.zipDownloadUrl = `/api/downloads/jobs/${jobId}/zip`;
    } catch (err: any) {
      slideResult.status = 'failed';
      slideResult.error = err.message || 'Retry failed';
    }

    return status;
  }

  static cleanupExpiredJobs() {
    const now = Date.now();
    for (const [jobId, stored] of this.jobs.entries()) {
      if (now - stored.createdAt > SERVER_CONFIG.JOB_EXPIRY_MS) {
        try {
          if (fs.existsSync(stored.outputDir)) {
            fs.rmSync(stored.outputDir, { recursive: true, force: true });
          }
        } catch {}
        this.jobs.delete(jobId);
      }
    }
  }
}
