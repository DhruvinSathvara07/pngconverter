import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const baseTempDir = isVercel ? '/tmp/exporter' : path.resolve(__dirname, '../../temp');

export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  WORKSPACE_ROOT: path.resolve(__dirname, '../../../../'),
  TEMP_DIR: baseTempDir,
  SESSIONS_DIR: path.join(baseTempDir, 'sessions'),
  EXPORTS_DIR: path.join(baseTempDir, 'exports'),
  MAX_UPLOAD_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_FILES_COUNT: 500,
  MAX_DECOMPRESSED_SIZE_BYTES: 250 * 1024 * 1024, // 250MB
  RENDER_TIMEOUT_MS: 45000, // 45s per slide timeout
  JOB_EXPIRY_MS: 60 * 60 * 1000, // 1 hour cleanup
};

