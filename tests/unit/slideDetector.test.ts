import { describe, it, expect } from 'vitest';
import { ProjectImporter } from '../../apps/server/src/services/projectImporter.js';
import { SlideDetector } from '../../apps/server/src/services/slideDetector.js';

describe('SlideDetector with Workspace Project', () => {
  it('should import the workspace carousel and detect all 6 slides', async () => {
    const sessionId = ProjectImporter.createSession();
    const result = ProjectImporter.importWorkspaceCarousel(sessionId);

    expect(result.entryHtml).toBe('index.html');
    expect(result.htmlFiles).toContain('index.html');

    const detection = await SlideDetector.detect(sessionId, result.entryHtml);

    // Verify .slide was identified
    expect(detection.detectedSelector).toBe('.slide');
    // Verify all 6 slides were detected
    expect(detection.detectedSlides.length).toBe(6);

    // Check slide labels
    const labels = detection.detectedSlides.map((s) => s.label);
    expect(labels).toContain('Skiper UI');
    expect(labels).toContain('Cult UI');

    ProjectImporter.cleanupSession(sessionId);
  }, 35000);
});
