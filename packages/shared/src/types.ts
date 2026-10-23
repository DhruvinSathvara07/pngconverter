export type PresetId =
  | 'instagram-portrait'
  | 'instagram-square'
  | 'instagram-landscape'
  | 'instagram-story'
  | 'custom';

export interface InstagramPreset {
  id: PresetId;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  ratioValue: number;
  description: string;
  recommended?: boolean;
}

export type FitMode = 'contain' | 'cover' | 'crop';
export type ResolutionMultiplier = 1 | 2 | 3;
export type BackgroundMode = 'original' | 'transparent' | 'custom';
export type AnimationMode = 'stable' | 'delay' | 'timeline';

export interface SlideInfo {
  id: string;
  index: number;
  selector: string;
  label: string;
  originalWidth?: number;
  originalHeight?: number;
  originalAspectRatio?: number;
}

export interface CandidateSelector {
  selector: string;
  count: number;
  sampleLabels: string[];
}

export interface ProjectInfo {
  sessionId: string;
  entryHtml: string;
  htmlFiles: string[];
  detectedSlides: SlideInfo[];
  detectedSelector: string;
  candidateSelectors: CandidateSelector[];
  assetCount: number;
  missingAssets: string[];
  warnings: string[];
}

export interface ExportOptions {
  sessionId: string;
  presetId: PresetId;
  width: number;
  height: number;
  multiplier: ResolutionMultiplier;
  fitMode: FitMode;
  backgroundMode: BackgroundMode;
  customBackgroundColor?: string;
  paddingPx: number;
  animationMode: AnimationMode;
  animationDelayMs: number;
  timelineSeconds?: number;
  slideSelector: string;
  filenamePrefix: string;
  selectedSlideIndices: number[];
}

export type SlideStatus = 'pending' | 'rendering' | 'completed' | 'failed';

export interface ExportedSlideResult {
  slideId: string;
  index: number;
  fileName: string;
  status: SlideStatus;
  error?: string;
  downloadUrl?: string;
  previewUrl?: string;
  width: number;
  height: number;
  renderTimeMs?: number;
  fileSizeBytes?: number;
}

export type JobState = 'idle' | 'queued' | 'rendering' | 'completed' | 'failed';

export interface ExportJobStatus {
  jobId: string;
  sessionId: string;
  state: JobState;
  progress: number; // 0 - 100
  currentSlide: number;
  totalSlides: number;
  slides: ExportedSlideResult[];
  zipDownloadUrl?: string;
  error?: string;
  warnings: string[];
  startedAt?: number;
  completedAt?: number;
}
