import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ProjectImporter } from '../services/projectImporter.js';
import { AssetResolver } from '../services/assetResolver.js';
import { SlideDetector } from '../services/slideDetector.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
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

// Endpoint 1: Upload ZIP, folder, or loose HTML/CSS/JS files
projectRouter.post(
  '/upload',
  upload.array('files'),
  async (req: Request, res: Response, next) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files were uploaded. Please select an HTML file, project ZIP, or folder.' });
      }

      const sessionId = ProjectImporter.createSession();
      let entryHtml = '';
      let htmlFiles: string[] = [];
      const warnings: string[] = [];

      // Separate ZIP archives from regular files
      const zipFiles = files.filter(
        (f) => f.originalname.toLowerCase().endsWith('.zip') || f.mimetype === 'application/zip'
      );
      const regularFiles = files.filter(
        (f) => !f.originalname.toLowerCase().endsWith('.zip') && f.mimetype !== 'application/zip'
      );

      // 1. Process ZIP archives if present
      for (const zipFile of zipFiles) {
        const zipResult = ProjectImporter.importZip(sessionId, zipFile.buffer);
        if (!entryHtml && zipResult.entryHtml) {
          entryHtml = zipResult.entryHtml;
        }
        htmlFiles.push(...zipResult.htmlFiles);
        warnings.push(...zipResult.warnings);
      }

      // 2. Process regular files if present
      if (regularFiles.length > 0) {
        const relPaths = req.body.relativePaths;
        const fileItems = regularFiles.map((f, i) => {
          let relPath: string | undefined;
          if (Array.isArray(relPaths)) {
            relPath = relPaths[i];
          } else if (typeof relPaths === 'string' && i === 0) {
            relPath = relPaths;
          }
          return {
            originalname: f.originalname,
            buffer: f.buffer,
            relativePath: relPath,
          };
        });

        const filesResult = ProjectImporter.importUploadedFiles(sessionId, fileItems);
        if (!entryHtml && filesResult.entryHtml) {
          entryHtml = filesResult.entryHtml;
        }
        htmlFiles.push(...filesResult.htmlFiles);
        warnings.push(...filesResult.warnings);
      }

      // Deduplicate discovered HTML files
      const sessionDir = ProjectImporter.getSessionDir(sessionId);
      htmlFiles = Array.from(new Set(htmlFiles));

      if (htmlFiles.length === 0) {
        htmlFiles = ProjectImporter.discoverHtmlFiles(sessionDir);
      }

      if (htmlFiles.length === 0) {
        throw new AppError('No HTML files (.html or .htm) found in the uploaded files. Please upload an HTML file or a project containing an entry HTML file.', 400);
      }

      if (!entryHtml || !htmlFiles.includes(entryHtml)) {
        entryHtml = ProjectImporter.selectDefaultEntry(htmlFiles);
      }

      // Automatically run slide detection and asset scanning safely
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

      console.log(`[Project] Uploaded session ${sessionId}: entry="${entryHtml}", ${htmlFiles.length} HTML files, ${slideResult.detectedSlides.length} slides detected`);

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

    console.log(`[Project] Loaded workspace session ${sessionId}: entry="${result.entryHtml}", ${slideResult.detectedSlides.length} slides detected`);

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

      console.log(`[Project] Re-detected session ${sessionId}: selector="${slideResult.detectedSelector}", ${slideResult.detectedSlides.length} slides`);

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
