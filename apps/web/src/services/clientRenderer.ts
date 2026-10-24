import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ExportOptions, ExportJobStatus, ExportedSlideResult } from '@exporter/shared';

export interface RenderProgressUpdate {
  job: ExportJobStatus;
}

export class ClientRenderer {
  private static activeJob: ExportJobStatus | null = null;
  private static slideBlobs: Map<number, { blob: Blob; url: string; fileName: string }> = new Map();
  private static zipBlob: Blob | null = null;
  private static zipUrl: string | null = null;

  static getSlideBlob(index: number) {
    return this.slideBlobs.get(index);
  }

  static getZipBlob() {
    return this.zipBlob;
  }

  static getZipUrl() {
    return this.zipUrl;
  }

  static async renderSlides(
    iframeElement: HTMLIFrameElement,
    options: ExportOptions,
    onProgress: (status: ExportJobStatus) => void
  ): Promise<ExportJobStatus> {
    const jobId = `client-${Date.now()}`;
    const startTime = Date.now();
    this.slideBlobs.clear();
    if (this.zipUrl) {
      URL.revokeObjectURL(this.zipUrl);
      this.zipUrl = null;
    }
    this.zipBlob = null;

    const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Preview workspace document not accessible. Please ensure project is loaded.');
    }

    const slideElements = Array.from(iframeDoc.querySelectorAll(options.slideSelector));
    if (slideElements.length === 0) {
      throw new Error(`No slide elements found matching selector: "${options.slideSelector}"`);
    }

    // Wait for fonts to be ready in iframe
    try {
      if ((iframeDoc as any).fonts && (iframeDoc as any).fonts.ready) {
        await (iframeDoc as any).fonts.ready;
      }
    } catch {
      // fonts.ready fallback
    }

    // Wait for all images inside iframe
    const imgs = Array.from(iframeDoc.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = img.onerror = resolve;
        });
      })
    );

    // If delay specified
    if (options.animationMode === 'delay' && options.animationDelayMs > 0) {
      await new Promise((r) => setTimeout(r, Math.min(options.animationDelayMs, 5000)));
    }

    const targetWidth = options.width * options.multiplier;
    const targetHeight = options.height * options.multiplier;

    const slides: ExportedSlideResult[] = options.selectedSlideIndices.map((slideIndex, idx) => {
      const paddedNum = String(idx + 1).padStart(2, '0');
      const fileName = `${options.filenamePrefix}${paddedNum}.png`;
      return {
        slideId: `slide-${slideIndex + 1}`,
        index: slideIndex,
        fileName,
        status: 'pending',
        width: targetWidth,
        height: targetHeight,
      };
    });

    const jobStatus: ExportJobStatus = {
      jobId,
      sessionId: options.sessionId,
      state: 'rendering',
      progress: 0,
      currentSlide: 0,
      totalSlides: slides.length,
      slides,
      warnings: [],
      startedAt: startTime,
    };

    this.activeJob = jobStatus;
    onProgress({ ...jobStatus });

    const zip = new JSZip();

    for (let i = 0; i < options.selectedSlideIndices.length; i++) {
      const slideIndex = options.selectedSlideIndices[i];
      const targetElement = slideElements[slideIndex] as HTMLElement;

      jobStatus.currentSlide = i + 1;
      jobStatus.slides[i].status = 'rendering';
      onProgress({ ...jobStatus });

      const slideStart = performance.now();

      try {
        if (!targetElement) {
          throw new Error(`Slide element at index ${slideIndex} not found`);
        }

        // Get computed background
        const computedStyle = iframeDoc.defaultView?.getComputedStyle(targetElement);
        let bgColor = '#ffffff';
        if (options.backgroundMode === 'custom' && options.customBackgroundColor) {
          bgColor = options.customBackgroundColor;
        } else if (options.backgroundMode === 'original' && computedStyle) {
          bgColor = computedStyle.backgroundColor || '#ffffff';
        }

        // Capture element to high-res PNG
        const elementPngDataUrl = await toPng(targetElement, {
          quality: 1,
          pixelRatio: options.multiplier || 1,
          backgroundColor: options.backgroundMode === 'transparent' ? undefined : bgColor,
          skipFonts: false,
          cacheBust: true,
        });

        // Load into HTMLImageElement for canvas fitting
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to decode captured slide'));
          img.src = elementPngDataUrl;
        });

        // Draw onto exact target resolution canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context creation failed');
        }

        // Fill background
        if (options.backgroundMode !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // Calculate fit mode
        const pad = (options.paddingPx || 0) * options.multiplier;
        const availWidth = targetWidth - pad * 2;
        const availHeight = targetHeight - pad * 2;

        let drawW = availWidth;
        let drawH = availHeight;
        let drawX = pad;
        let drawY = pad;

        const imgAspect = img.width / img.height;
        const availAspect = availWidth / availHeight;

        if (options.fitMode === 'contain') {
          if (imgAspect > availAspect) {
            drawW = availWidth;
            drawH = availWidth / imgAspect;
            drawY = pad + (availHeight - drawH) / 2;
          } else {
            drawH = availHeight;
            drawW = availHeight * imgAspect;
            drawX = pad + (availWidth - drawW) / 2;
          }
        } else if (options.fitMode === 'cover') {
          if (imgAspect > availAspect) {
            drawH = availHeight;
            drawW = availHeight * imgAspect;
            drawX = pad + (availWidth - drawW) / 2;
          } else {
            drawW = availWidth;
            drawH = availWidth / imgAspect;
            drawY = pad + (availHeight - drawH) / 2;
          }
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Convert canvas to blob
        const blob: Blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
        });

        const blobUrl = URL.createObjectURL(blob);
        const fileName = jobStatus.slides[i].fileName;

        this.slideBlobs.set(slideIndex, { blob, url: blobUrl, fileName });
        zip.file(fileName, blob);

        const renderTimeMs = Math.round(performance.now() - slideStart);

        jobStatus.slides[i].status = 'completed';
        jobStatus.slides[i].previewUrl = blobUrl;
        jobStatus.slides[i].downloadUrl = blobUrl;
        jobStatus.slides[i].fileSizeBytes = blob.size;
        jobStatus.slides[i].renderTimeMs = renderTimeMs;
      } catch (err: any) {
        jobStatus.slides[i].status = 'failed';
        jobStatus.slides[i].error = err.message || 'Capture failed';
      }

      jobStatus.progress = Math.round(((i + 1) / options.selectedSlideIndices.length) * 100);
      onProgress({ ...jobStatus });
    }

    // Generate ZIP
    try {
      this.zipBlob = await zip.generateAsync({ type: 'blob' });
      this.zipUrl = URL.createObjectURL(this.zipBlob);
      jobStatus.zipDownloadUrl = this.zipUrl;
    } catch (zipErr) {
      console.warn('Failed to generate ZIP archive:', zipErr);
    }

    const anySuccess = jobStatus.slides.some((s) => s.status === 'completed');
    jobStatus.state = anySuccess ? 'completed' : 'failed';
    jobStatus.completedAt = Date.now();
    this.activeJob = jobStatus;

    onProgress({ ...jobStatus });
    return jobStatus;
  }

  static downloadSlide(slideIndex: number) {
    const item = this.slideBlobs.get(slideIndex);
    if (item) {
      saveAs(item.blob, item.fileName);
    }
  }

  static downloadAllZip(filename = 'instagram-carousel.zip') {
    if (this.zipBlob) {
      saveAs(this.zipBlob, filename);
    }
  }

  static async downloadSelectedZip(indices: number[], filename = 'selected-slides.zip') {
    const zip = new JSZip();
    for (const idx of indices) {
      const item = this.slideBlobs.get(idx);
      if (item) {
        zip.file(item.fileName, item.blob);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, filename);
  }
}
