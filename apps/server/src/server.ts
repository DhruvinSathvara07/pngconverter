import express from 'express';
import cors from 'cors';
import { projectRouter } from './routes/project.routes.js';
import { exportRouter } from './routes/export.routes.js';
import { downloadRouter } from './routes/download.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ExportJobManager } from './services/exportJobManager.js';
import { ProjectImporter } from './services/projectImporter.js';

export function createServer() {
  ProjectImporter.initDirs();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Root status endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Instagram Carousel Exporter API',
      status: 'active',
      uptime: process.uptime(),
      healthEndpoint: '/api/health',
      time: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Mount API routers
  app.use('/api/projects', projectRouter);
  app.use('/api/exports', exportRouter);
  app.use('/api/downloads', downloadRouter);

  // Central error handling
  app.use(errorHandler);

  // Schedule periodic cleanup of expired jobs (only in long-running server mode)
  if (!process.env.VERCEL) {
    setInterval(() => {
      ExportJobManager.cleanupExpiredJobs();
    }, 10 * 60 * 1000);
  }

  return app;
}
