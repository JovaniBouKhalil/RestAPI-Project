import express from 'express';
import cors from 'cors';
import notesRouter from './routes/notes.js';
import { logger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(logger);
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '64kb', strict: false }));

  app.get('/', (req, res) => {
    res.json({ name: 'Assignment 6 Notes API', notes: '/api/notes' });
  });
  app.use('/api/notes', notesRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
