import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  WORKSPACE_ROOT: path.resolve(__dirname, '../../../../'),
  TEMP_DIR: path.resolve(__dirname, '../../temp'),
  SESSIONS_DIR: path.resolve(__dirname, '../../temp/sessions'),
  EXPORTS_DIR: path.resolve(__dirname, '../../temp/exports'),
  MAX_UPLOAD_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_FILES_COUNT: 500,
  MAX_DECOMPRESSED_SIZE_BYTES: 250 * 1024 * 1024, // 250MB
  RENDER_TIMEOUT_MS: 45000, // 45s per slide timeout
  JOB_EXPIRY_MS: 60 * 60 * 1000, // 1 hour cleanup
};
