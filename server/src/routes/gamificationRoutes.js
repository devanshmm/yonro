import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/gamificationController.js';
import { leaderboardQuerySchema, xpHistoryQuerySchema } from '../validators/gamificationSchemas.js';
import { z } from 'zod';

export const gamificationRouter = Router();
gamificationRouter.get('/me', controller.me);
gamificationRouter.get('/xp-history', validate(xpHistoryQuerySchema, 'query'), controller.history);
gamificationRouter.get('/achievements', controller.achievements);
export const leaderboardRouter = Router();
leaderboardRouter.get(
  '/:metric',
  validate(
    z.object({ metric: z.enum(['weekly', 'monthly', 'all-time', 'tasks', 'focus', 'streaks']) }),
    'params',
  ),
  validate(leaderboardQuerySchema, 'query'),
  controller.leaderboard,
);
