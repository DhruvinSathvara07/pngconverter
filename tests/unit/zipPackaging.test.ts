import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { ZipPackagingService } from '../../apps/server/src/services/zipPackagingService.js';
import { SERVER_CONFIG } from '../../apps/server/src/config/constants.js';

describe('ZipPackagingService', () => {
  it('should package multiple files into a valid ZIP archive', async () => {
    // Create temporary test files
    const testDir = path.join(SERVER_CONFIG.TEMP_DIR, 'zip-test');
    fs.mkdirSync(testDir, { recursive: true });

    const file1 = path.join(testDir, 'slide-01.png');
    const file2 = path.join(testDir, 'slide-02.png');
    fs.writeFileSync(file1, Buffer.from('fake-png-data-1'));
    fs.writeFileSync(file2, Buffer.from('fake-png-data-2'));

    const zipBuffer = await ZipPackagingService.createZipFromFiles([
      { filePath: file1, zipFileName: 'slide-01.png' },
      { filePath: file2, zipFileName: 'slide-02.png' },
    ]);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Unzip and verify contents
    const adm = new AdmZip(zipBuffer);
    const entries = adm.getEntries().map((e) => e.entryName);

    expect(entries).toContain('slide-01.png');
    expect(entries).toContain('slide-02.png');

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
