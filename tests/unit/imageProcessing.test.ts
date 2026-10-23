import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { ImageProcessingService } from '../../apps/server/src/services/imageProcessingService.js';

describe('ImageProcessingService', () => {
  it('should process and verify exact 1080x1350 image output', async () => {
    // Generate a simple test image
    const rawImage = await sharp({
      create: {
        width: 800,
        height: 1000,
        channels: 4,
        background: { r: 255, g: 100, b: 150, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await ImageProcessingService.processSlideImage(rawImage, {
      width: 1080,
      height: 1350,
      multiplier: 1,
      fitMode: 'contain',
      backgroundMode: 'custom',
      customBackgroundColor: '#111827',
      paddingPx: 20,
    });

    expect(result.actualWidth).toBe(1080);
    expect(result.actualHeight).toBe(1350);
    expect(result.buffer).toBeInstanceOf(Buffer);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1350);
    expect(meta.format).toBe('png');
  });

  it('should scale accurately with 2x resolution multiplier', async () => {
    const rawImage = await sharp({
      create: {
        width: 400,
        height: 500,
        channels: 4,
        background: { r: 50, g: 150, b: 250, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await ImageProcessingService.processSlideImage(rawImage, {
      width: 1080,
      height: 1350,
      multiplier: 2,
      fitMode: 'cover',
      backgroundMode: 'transparent',
      paddingPx: 0,
    });

    expect(result.actualWidth).toBe(2160);
    expect(result.actualHeight).toBe(2700);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(2160);
    expect(meta.height).toBe(2700);
  });
});
