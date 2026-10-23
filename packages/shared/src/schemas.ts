import { z } from 'zod';

export const ExportOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  presetId: z.enum([
    'instagram-portrait',
    'instagram-square',
    'instagram-landscape',
    'instagram-story',
    'custom',
  ]),
  width: z.number().int().min(100).max(8000),
  height: z.number().int().min(100).max(8000),
  multiplier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  fitMode: z.enum(['contain', 'cover', 'crop']),
  backgroundMode: z.enum(['original', 'transparent', 'custom']),
  customBackgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional(),
  paddingPx: z.number().int().min(0).max(500),
  animationMode: z.enum(['stable', 'delay', 'timeline']),
  animationDelayMs: z.number().int().min(0).max(10000),
  timelineSeconds: z.number().min(0).max(60).optional(),
  slideSelector: z.string().min(1, 'Slide selector is required'),
  filenamePrefix: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Prefix must only contain alphanumeric characters, hyphens or underscores'),
  selectedSlideIndices: z.array(z.number().int().min(0)).min(1, 'At least one slide must be selected'),
});

export const DetectSlidesSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  entryHtml: z.string().optional(),
  customSelector: z.string().optional(),
});

export const RetrySlideSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  slideIndex: z.number().int().min(0),
});
