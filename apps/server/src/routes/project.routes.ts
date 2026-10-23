import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ProjectImporter } from '../services/projectImporter.js';
import { AssetResolver } from '../services/assetResolver.js';
import { SlideDetector } from '../services/slideDetector.js';
import { validateBody } from '../middleware/validation.js';
import { DetectSlidesSchema, ProjectInfo } from '@exporter/shared';
import { SERVER_CONFIG } from '../config/constants.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES,
    files: SERVER_CONFIG.MAX_FILES_COUNT,
  },
});

export const projectRouter = Router();

// Endpoint 1: Upload ZIP or files
projectRouter.post(
  '/upload',
  upload.array('files'),
  async (req: Request, res: Response, next) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files were uploaded' });
      }

      const sessionId = ProjectImporter.createSession();
      let entryHtml = '';
      let htmlFiles: string[] = [];
      const warnings: string[] = [];

      // Check if uploaded file is a ZIP archive
      const zipFile = files.find(
        (f) => f.originalname.toLowerCase().endsWith('.zip') || f.mimetype === 'application/zip'
      );

      if (zipFile && files.length === 1) {
        const result = ProjectImporter.importZip(sessionId, zipFile.buffer);
        entryHtml = result.entryHtml;
        htmlFiles = result.htmlFiles;
        warnings.push(...result.warnings);
      } else {
        const fileItems = files.map((f, i) => {
          // Check for relative path in body if sent via client form data
          const relPaths = req.body.relativePaths;
          const relPath = Array.isArray(relPaths) ? relPaths[i] : undefined;
          return {
            originalname: f.originalname,
            buffer: f.buffer,
            relativePath: relPath,
          };
        });

        const result = ProjectImporter.importUploadedFiles(sessionId, fileItems);
        entryHtml = result.entryHtml;
        htmlFiles = result.htmlFiles;
        warnings.push(...result.warnings);
      }

      // Automatically run slide detection and asset scanning
      const slideResult = await SlideDetector.detect(sessionId, entryHtml);
      const assetResult = AssetResolver.scanProjectAssets(sessionId, entryHtml);

      warnings.push(...slideResult.warnings);
      warnings.push(...assetResult.warnings);

      const projectInfo: ProjectInfo = {
        sessionId,
        entryHtml,
        htmlFiles,
        detectedSlides: slideResult.detectedSlides,
        detectedSelector: slideResult.detectedSelector,
        candidateSelectors: slideResult.candidateSelectors,
        assetCount: assetResult.assetCount,
        missingAssets: assetResult.missingAssets,
        warnings,
      };

      return res.json({ project: projectInfo });
    } catch (err) {
      next(err);
    }
  }
);

// Endpoint 2: Import workspace carousel (index.html) directly
projectRouter.post('/load-workspace', async (req: Request, res: Response, next) => {
  try {
    const sessionId = ProjectImporter.createSession();
    const result = ProjectImporter.importWorkspaceCarousel(sessionId);

    const slideResult = await SlideDetector.detect(sessionId, result.entryHtml);
    const assetResult = AssetResolver.scanProjectAssets(sessionId, result.entryHtml);

    const warnings = [...result.warnings, ...slideResult.warnings, ...assetResult.warnings];

    const projectInfo: ProjectInfo = {
      sessionId,
      entryHtml: result.entryHtml,
      htmlFiles: result.htmlFiles,
      detectedSlides: slideResult.detectedSlides,
      detectedSelector: slideResult.detectedSelector,
      candidateSelectors: slideResult.candidateSelectors,
      assetCount: assetResult.assetCount,
      missingAssets: assetResult.missingAssets,
      warnings,
    };

    return res.json({ project: projectInfo });
  } catch (err) {
    next(err);
  }
});

// Endpoint 3: Re-detect slides (with custom entry HTML or custom selector)
projectRouter.post(
  '/detect-slides',
  validateBody(DetectSlidesSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { sessionId, entryHtml, customSelector } = req.body;
      const sessionDir = ProjectImporter.getSessionDir(sessionId);
      const targetEntry = entryHtml || 'index.html';

      const slideResult = await SlideDetector.detect(sessionId, targetEntry, customSelector);
      const assetResult = AssetResolver.scanProjectAssets(sessionId, targetEntry);

      const warnings = [...slideResult.warnings, ...assetResult.warnings];

      const htmlFiles = ProjectImporter.discoverHtmlFiles(sessionDir);

      const projectInfo: ProjectInfo = {
        sessionId,
        entryHtml: targetEntry,
        htmlFiles,
        detectedSlides: slideResult.detectedSlides,
        detectedSelector: slideResult.detectedSelector,
        candidateSelectors: slideResult.candidateSelectors,
        assetCount: assetResult.assetCount,
        missingAssets: assetResult.missingAssets,
        warnings,
      };

      return res.json({ project: projectInfo });
    } catch (err) {
      next(err);
    }
  }
);

// Endpoint 4: Serve session files safely for preview iframe and assets
projectRouter.get('/sessions/:sessionId/files/*', (req: Request, res: Response, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    const subPath = String((req.params as any)[0] || '');
    const filePath = AssetResolver.getAssetPath(sessionId, subPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Asset not found');
    }

    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});
