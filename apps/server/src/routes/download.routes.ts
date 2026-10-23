import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ExportJobManager } from '../services/exportJobManager.js';
import { ZipPackagingService } from '../services/zipPackagingService.js';

export const downloadRouter = Router();

// Download individual PNG file
downloadRouter.get('/jobs/:jobId/slides/:slideIndex', (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = String(req.params.jobId);
    const slideIndex = String(req.params.slideIndex);
    const jobInfo = ExportJobManager.getJobFiles(jobId);

    if (!jobInfo) {
      return res.status(404).send('Export job not found');
    }

    const idx = parseInt(slideIndex, 10);
    const slide = jobInfo.status.slides.find((s) => s.index === idx);

    if (!slide || slide.status !== 'completed') {
      return res.status(404).send('Slide image not found or not yet completed');
    }

    const filePath = path.join(jobInfo.outputDir, slide.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File missing on disk');
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${slide.fileName}"`);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// View slide preview inline
downloadRouter.get('/jobs/:jobId/slides/:slideIndex/preview', (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = String(req.params.jobId);
    const slideIndex = String(req.params.slideIndex);
    const jobInfo = ExportJobManager.getJobFiles(jobId);

    if (!jobInfo) {
      return res.status(404).send('Export job not found');
    }

    const idx = parseInt(slideIndex, 10);
    const slide = jobInfo.status.slides.find((s) => s.index === idx);

    if (!slide || slide.status !== 'completed') {
      return res.status(404).send('Slide image not found');
    }

    const filePath = path.join(jobInfo.outputDir, slide.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File missing on disk');
    }

    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// Download all PNGs as ZIP
downloadRouter.get('/jobs/:jobId/zip', (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = String(req.params.jobId);
    const jobInfo = ExportJobManager.getJobFiles(jobId);

    if (!jobInfo) {
      return res.status(404).send('Export job not found');
    }

    const zipPath = path.join(jobInfo.outputDir, 'carousel-export.zip');
    if (!fs.existsSync(zipPath)) {
      return res.status(404).send('ZIP file not found');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="instagram-carousel-${jobId.slice(0, 8)}.zip"`);
    return res.sendFile(zipPath);
  } catch (err) {
    next(err);
  }
});

// Download selected PNGs as ZIP
downloadRouter.post('/jobs/:jobId/selected-zip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobId = String(req.params.jobId);
    const { slideIndices } = req.body;

    if (!Array.isArray(slideIndices) || slideIndices.length === 0) {
      return res.status(400).send('Must provide an array of slideIndices');
    }

    const jobInfo = ExportJobManager.getJobFiles(jobId);
    if (!jobInfo) {
      return res.status(404).send('Export job not found');
    }

    const selectedFiles = jobInfo.status.slides
      .filter((s) => slideIndices.includes(s.index) && s.status === 'completed')
      .map((s) => ({
        filePath: path.join(jobInfo.outputDir, s.fileName),
        zipFileName: s.fileName,
      }));

    if (selectedFiles.length === 0) {
      return res.status(400).send('None of the selected slides are completed');
    }

    const zipBuffer = await ZipPackagingService.createZipFromFiles(selectedFiles);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="selected-slides-${jobId.slice(0, 8)}.zip"`);
    return res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
});
