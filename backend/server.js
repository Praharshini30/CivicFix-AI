/**
 * CivicFix-AI: Server Startup Entrypoint
 * Boots HTTP listener, ensures JSON storage is initialized, and handles shutdown.
 */

import 'dotenv/config';
import { app } from './src/app.js';
import { complaintStore } from './src/services/complaintStore.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Ensure persistence file data/complaints.json is initialized automatically
    await complaintStore.init();

    const server = app.listen(PORT, HOST, () => {
      console.log('====================================================');
      console.log(` CivicFix-AI Backend Server is running!`);
      console.log(` Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(` Listening on: http://localhost:${PORT}`);
      console.log(` Healthcheck : http://localhost:${PORT}/health`);
      console.log(` Storage     : ${complaintStore.filePath}`);
      console.log('====================================================');
    });

    const gracefulShutdown = signal => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] Closed HTTP listener. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Fatal startup failure:', err);
    process.exit(1);
  }
}

startServer();
