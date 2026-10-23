import fs from 'fs';
import path from 'path';
import { ProjectImporter } from './projectImporter.js';

export class AssetResolver {
  static getAssetPath(sessionId: string, assetSubPath: string): string {
    const sessionDir = ProjectImporter.getSessionDir(sessionId);
    const decoded = decodeURIComponent(assetSubPath).replace(/^\/+/, '');
    const fullPath = path.resolve(sessionDir, decoded);

    if (!fullPath.startsWith(sessionDir)) {
      throw new Error('Access denied: Invalid asset path');
    }
    return fullPath;
  }

  static scanProjectAssets(sessionId: string, entryHtml: string): { assetCount: number; missingAssets: string[]; warnings: string[] } {
    const sessionDir = ProjectImporter.getSessionDir(sessionId);
    const htmlPath = path.join(sessionDir, entryHtml);

    if (!fs.existsSync(htmlPath)) {
      return { assetCount: 0, missingAssets: [entryHtml], warnings: [`Entry HTML not found: ${entryHtml}`] };
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const missingAssets: string[] = [];
    const warnings: string[] = [];
    let assetCount = 0;

    // Regex to match local resource references: src="...", href="..."
    const resourceRegex = /(?:src|href)=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = resourceRegex.exec(htmlContent)) !== null) {
      const url = match[1].trim();
      // Skip data: URIs, http://, https://, //, #, mailto:, javascript:
      if (
        url.startsWith('data:') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('//') ||
        url.startsWith('#') ||
        url.startsWith('mailto:') ||
        url.startsWith('javascript:')
      ) {
        continue;
      }

      assetCount++;
      const cleanUrl = url.split('?')[0].split('#')[0];
      const entryDir = path.dirname(htmlPath);
      const targetPath = path.resolve(entryDir, cleanUrl);

      if (!fs.existsSync(targetPath)) {
        missingAssets.push(cleanUrl);
        warnings.push(`Missing local asset: ${cleanUrl}`);
      }
    }

    // Also scan for url(...) references in <style> blocks
    const urlRegex = /url\(["']?([^"')]+)["']?\)/gi;
    while ((match = urlRegex.exec(htmlContent)) !== null) {
      const url = match[1].trim();
      if (
        url.startsWith('data:') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('//') ||
        url.startsWith('#')
      ) {
        continue;
      }
      assetCount++;
      const cleanUrl = url.split('?')[0].split('#')[0];
      const entryDir = path.dirname(htmlPath);
      const targetPath = path.resolve(entryDir, cleanUrl);

      if (!fs.existsSync(targetPath)) {
        if (!missingAssets.includes(cleanUrl)) {
          missingAssets.push(cleanUrl);
          warnings.push(`Missing CSS url asset: ${cleanUrl}`);
        }
      }
    }

    return { assetCount, missingAssets, warnings };
  }
}
