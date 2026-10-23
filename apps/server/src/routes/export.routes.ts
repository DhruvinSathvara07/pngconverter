import { Router, Request, Response, NextFunction } from 'express';
import { ExportOptionsSchema, RetrySlideSchema } from '@exporter/shared';
import { validateBody } from '../middleware/validation.js';
import { ExportJobManager } from '../services/exportJobManager.js';
import { ProjectImporter } from '../services/projectImporter.js';

export const exportRouter = Router();

// Create export job
exportRouter.post('/', validateBody(ExportOptionsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = req.body;
    const sessionDir = ProjectImporter.getSessionDir(options.sessionId);
    const htmlFiles = ProjectImporter.discoverHtmlFiles(sessionDir);
    const entryHtml = ProjectImporter.selectDefaultEntry(htmlFiles);

    const jobStatus = ExportJobManager.createJob(options.sessionId, entryHtml, options);
    return res.status(202).json({ job: jobStatus });
  } catch (err) {
    next(err);
  }
});

// Get job status
exportRouter.get('/:jobId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = String(req.params.jobId);
    const jobStatus = ExportJobManager.getJob(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found or expired' });
    }

    return res.json({ job: jobStatus });
  } catch (err) {
    next(err);
  }
});

// Retry single failed slide
exportRouter.post('/:jobId/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = String(req.params.jobId);
    const slideIndex = parseInt(req.body.slideIndex, 10);

    if (isNaN(slideIndex)) {
      return res.status(400).json({ error: 'Invalid slideIndex' });
    }

    const jobStatus = await ExportJobManager.retrySlide(jobId, slideIndex);
    return res.json({ job: jobStatus });
  } catch (err) {
    next(err);
  }
});
