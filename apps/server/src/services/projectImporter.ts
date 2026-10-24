import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { SERVER_CONFIG } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';

export class ProjectImporter {
  static initDirs() {
    if (!fs.existsSync(SERVER_CONFIG.TEMP_DIR)) {
      fs.mkdirSync(SERVER_CONFIG.TEMP_DIR, { recursive: true });
    }
    if (!fs.existsSync(SERVER_CONFIG.SESSIONS_DIR)) {
      fs.mkdirSync(SERVER_CONFIG.SESSIONS_DIR, { recursive: true });
    }
    if (!fs.existsSync(SERVER_CONFIG.EXPORTS_DIR)) {
      fs.mkdirSync(SERVER_CONFIG.EXPORTS_DIR, { recursive: true });
    }
  }

  static createSession(): string {
    this.initDirs();
    const sessionId = uuidv4();
    const sessionDir = path.join(SERVER_CONFIG.SESSIONS_DIR, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    return sessionId;
  }

  static getSessionDir(sessionId: string): string {
    const dir = path.join(SERVER_CONFIG.SESSIONS_DIR, sessionId);
    const resolved = path.resolve(dir);
    if (!resolved.startsWith(SERVER_CONFIG.SESSIONS_DIR)) {
      throw new AppError('Access denied: Invalid session path', 403);
    }
    return resolved;
  }

  static importZip(sessionId: string, zipBuffer: Buffer): { entryHtml: string; htmlFiles: string[]; warnings: string[] } {
    const sessionDir = this.getSessionDir(sessionId);
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (err: any) {
      throw new AppError(
        `Invalid or corrupted ZIP archive: ${err.message || 'Unable to decompress archive'}`,
        400
      );
    }

    let zipEntries: AdmZip.IZipEntry[];
    try {
      zipEntries = zip.getEntries();
    } catch (err: any) {
      throw new AppError(`Failed to read ZIP entries: ${err.message}`, 400);
    }

    let totalDecompressedSize = 0;
    const warnings: string[] = [];

    if (zipEntries.length > SERVER_CONFIG.MAX_FILES_COUNT) {
      throw new AppError(`Archive exceeds maximum allowed file count (${SERVER_CONFIG.MAX_FILES_COUNT})`, 400);
    }

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName;
      // Skip macOS resource fork and metadata files
      if (
        entryName.startsWith('__MACOSX/') ||
        entryName.includes('/__MACOSX/') ||
        path.basename(entryName).startsWith('._') ||
        path.basename(entryName) === '.DS_Store'
      ) {
        continue;
      }

      totalDecompressedSize += entry.header.size;
      if (totalDecompressedSize > SERVER_CONFIG.MAX_DECOMPRESSED_SIZE_BYTES) {
        throw new AppError('Archive exceeds maximum decompressed size limit (250MB)', 400);
      }

      // Security: Strip leading drive letter / slash, then sanitize and check Zip Slip
      const cleanName = entryName.replace(/^([a-zA-Z]:)?[\\\/]+/, '');
      const normalizedPath = path.normalize(cleanName).replace(/^(\.\.[\/\\])+/, '');
      if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        warnings.push(`Skipped suspicious path in archive: ${entryName}`);
        continue;
      }

      const destPath = path.join(sessionDir, normalizedPath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.writeFileSync(destPath, entry.getData());
    }

    const htmlFiles = this.discoverHtmlFiles(sessionDir);
    if (htmlFiles.length === 0) {
      throw new AppError('No HTML files (.html or .htm) found in uploaded archive.', 400);
    }

    const entryHtml = this.selectDefaultEntry(htmlFiles);
    return { entryHtml, htmlFiles, warnings };
  }

  static importUploadedFiles(
    sessionId: string,
    files: Array<{ originalname: string; buffer: Buffer; relativePath?: string }>
  ): { entryHtml: string; htmlFiles: string[]; warnings: string[] } {
    const sessionDir = this.getSessionDir(sessionId);
    const warnings: string[] = [];

    for (const file of files) {
      const rawPath = file.relativePath || file.originalname;
      // Skip macOS metadata files
      if (
        rawPath.startsWith('__MACOSX/') ||
        rawPath.includes('/__MACOSX/') ||
        path.basename(rawPath).startsWith('._') ||
        path.basename(rawPath) === '.DS_Store'
      ) {
        continue;
      }

      // Strip leading slashes/drive letters
      const cleanName = rawPath.replace(/^([a-zA-Z]:)?[\\\/]+/, '');
      const normalizedPath = path.normalize(cleanName).replace(/^(\.\.[\/\\])+/, '');
      if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        warnings.push(`Skipped invalid file path: ${rawPath}`);
        continue;
      }

      const destPath = path.join(sessionDir, normalizedPath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.writeFileSync(destPath, file.buffer);
    }

    const htmlFiles = this.discoverHtmlFiles(sessionDir);
    if (htmlFiles.length === 0) {
      throw new AppError('No HTML files (.html or .htm) found in uploaded files.', 400);
    }

    const entryHtml = this.selectDefaultEntry(htmlFiles);
    return { entryHtml, htmlFiles, warnings };
  }

  static importWorkspaceCarousel(sessionId: string): { entryHtml: string; htmlFiles: string[]; warnings: string[] } {
    const sessionDir = this.getSessionDir(sessionId);
    const sourceHtml = path.join(SERVER_CONFIG.WORKSPACE_ROOT, 'index.html');

    if (!fs.existsSync(sourceHtml)) {
      throw new AppError('Workspace index.html not found', 404);
    }

    // Copy original index.html into session directory (preserving original completely)
    const destHtml = path.join(sessionDir, 'index.html');
    fs.copyFileSync(sourceHtml, destHtml);

    return {
      entryHtml: 'index.html',
      htmlFiles: ['index.html'],
      warnings: [],
    };
  }

  static discoverHtmlFiles(dir: string, baseDir: string = dir): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
      // Ignore hidden/system folders
      if (file === '__MACOSX' || file === '.git' || file === 'node_modules' || file.startsWith('._') || file === '.DS_Store') {
        continue;
      }

      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.discoverHtmlFiles(filePath, baseDir));
      } else {
        const ext = path.extname(file).toLowerCase();
        if ((ext === '.html' || ext === '.htm') && !file.startsWith('._')) {
          const rel = path.relative(baseDir, filePath);
          results.push(rel.split(path.sep).join('/'));
        }
      }
    }
    return results;
  }

  static selectDefaultEntry(htmlFiles: string[]): string {
    // Filter out any metadata files
    const validHtml = htmlFiles.filter((f) => !path.basename(f).startsWith('._') && !f.includes('__MACOSX'));
    const candidates = validHtml.length > 0 ? validHtml : htmlFiles;

    // Prefer root index.html or index.htm
    const rootIndex = candidates.find((f) => f.toLowerCase() === 'index.html' || f.toLowerCase() === 'index.htm');
    if (rootIndex) return rootIndex;

    // Prefer any file ending with index.html
    const anyIndex = candidates.find((f) => f.toLowerCase().endsWith('index.html') || f.toLowerCase().endsWith('/index.html'));
    if (anyIndex) return anyIndex;

    // Otherwise pick the shortest path HTML
    return [...candidates].sort((a, b) => a.length - b.length)[0];
  }

  static cleanupSession(sessionId: string) {
    try {
      const sessionDir = path.join(SERVER_CONFIG.SESSIONS_DIR, sessionId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Failed to cleanup session ${sessionId}:`, err);
    }
  }
}
