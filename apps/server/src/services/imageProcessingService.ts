import sharp from 'sharp';
import { ExportOptions } from '@exporter/shared';

export class ImageProcessingService {
  static async processSlideImage(
    rawBuffer: Buffer,
    options: Pick<ExportOptions, 'width' | 'height' | 'multiplier' | 'fitMode' | 'backgroundMode' | 'customBackgroundColor' | 'paddingPx'>
  ): Promise<{
    buffer: Buffer;
    actualWidth: number;
    actualHeight: number;
    fileSizeBytes: number;
  }> {
    const targetWidth = options.width * options.multiplier;
    const targetHeight = options.height * options.multiplier;
    const padding = (options.paddingPx || 0) * options.multiplier;

    // Determine canvas background color
    let canvasBg: sharp.RGBA = { r: 0, g: 0, b: 0, alpha: 0 };
    if (options.backgroundMode === 'custom' && options.customBackgroundColor) {
      canvasBg = this.parseHexColor(options.customBackgroundColor);
    } else if (options.backgroundMode === 'transparent') {
      canvasBg = { r: 0, g: 0, b: 0, alpha: 0 };
    }

    const availableWidth = Math.max(1, targetWidth - padding * 2);
    const availableHeight = Math.max(1, targetHeight - padding * 2);

    let sharpFit: keyof sharp.FitEnum = 'contain';
    if (options.fitMode === 'cover') {
      sharpFit = 'cover';
    } else if (options.fitMode === 'crop') {
      sharpFit = 'inside';
    }

    // Step 1: Resize raw image to fit inside available space
    const resized = await sharp(rawBuffer)
      .resize({
        width: availableWidth,
        height: availableHeight,
        fit: sharpFit,
        background: canvasBg,
        position: 'center',
      })
      .png()
      .toBuffer();

    const resizedMeta = await sharp(resized).metadata();
    const resW = resizedMeta.width || availableWidth;
    const resH = resizedMeta.height || availableHeight;

    // Step 2: Composite onto target canvas with exact dimensions
    const left = Math.round((targetWidth - resW) / 2);
    const top = Math.round((targetHeight - resH) / 2);

    // Create background canvas
    const baseCanvas = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: canvasBg,
      },
    })
      .composite([
        {
          input: resized,
          top: Math.max(0, top),
          left: Math.max(0, left),
        },
      ])
      .png()
      .toBuffer();

    // Verify exact dimensions
    const finalMeta = await sharp(baseCanvas).metadata();
    if (finalMeta.width !== targetWidth || finalMeta.height !== targetHeight) {
      throw new Error(
        `Dimension verification failed: Expected ${targetWidth}x${targetHeight}, got ${finalMeta.width}x${finalMeta.height}`
      );
    }

    return {
      buffer: baseCanvas,
      actualWidth: finalMeta.width,
      actualHeight: finalMeta.height,
      fileSizeBytes: baseCanvas.length,
    };
  }

  private static parseHexColor(hex: string): sharp.RGBA {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return { r, g, b, alpha: 1 };
    }
    if (clean.length === 8) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      const alpha = parseInt(clean.substring(6, 8), 16) / 255;
      return { r, g, b, alpha };
    }
    return { r: 255, g: 255, b: 255, alpha: 1 };
  }
}
