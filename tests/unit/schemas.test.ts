import { describe, it, expect } from 'vitest';
import { ExportOptionsSchema, DetectSlidesSchema } from '@exporter/shared';

describe('Validation Schemas', () => {
  it('should validate valid default export options', () => {
    const valid = {
      sessionId: 'test-session-123',
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
      selectedSlideIndices: [0, 1, 2],
    };

    const parsed = ExportOptionsSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid multiplier or negative padding', () => {
    const invalid = {
      sessionId: 'test-session-123',
      presetId: 'instagram-portrait',
      width: 1080,
      height: 1350,
      multiplier: 4, // Invalid: only 1, 2, 3 allowed
      fitMode: 'contain',
      backgroundMode: 'original',
      paddingPx: -10, // Invalid: min 0
      animationMode: 'stable',
      animationDelayMs: 0,
      slideSelector: '.slide',
      filenamePrefix: 'slide-',
      selectedSlideIndices: [0],
    };

    const parsed = ExportOptionsSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('should reject empty selectedSlideIndices', () => {
    const invalid = {
      sessionId: 'test-session-123',
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
      selectedSlideIndices: [], // Must have at least 1
    };

    const parsed = ExportOptionsSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('should validate DetectSlidesSchema', () => {
    const valid = {
      sessionId: 'session-abc',
      entryHtml: 'index.html',
      customSelector: '.carousel-slide',
    };

    const parsed = DetectSlidesSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
