import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export class ZipPackagingService {
  static async createZipFromFiles(
    files: Array<{ filePath: string; zipFileName: string }>
  ): Promise<Buffer> {
    const zip = new JSZip();

    for (const file of files) {
      if (fs.existsSync(file.filePath)) {
        const data = fs.readFileSync(file.filePath);
        zip.file(file.zipFileName, data);
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return zipBuffer;
  }
}
