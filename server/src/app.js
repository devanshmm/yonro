import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './lib/config.js';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/errors.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use((req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== config.CLIENT_ORIGIN
  )
    return next(new AppError(403, 'This origin is not allowed'));
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers['sec-fetch-site'] === 'cross-site'
  )
    return next(new AppError(403, 'Cross-site requests are not allowed'));
  next();
});
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use(
  '/api',
  (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  },
  router,
);
app.use((_req, _res, next) => next(new AppError(404, 'Route not found')));
app.use(errorHandler);
