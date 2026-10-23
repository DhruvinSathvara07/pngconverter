import { createServer } from './server.js';
import { SERVER_CONFIG } from './config/constants.js';

const app = createServer();

const server = app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`🚀 Exporter backend API listening on http://localhost:${SERVER_CONFIG.PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server terminated gracefully');
  });
});
