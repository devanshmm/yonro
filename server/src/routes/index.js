import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController.js';
import * as task from '../controllers/taskController.js';
import * as productivity from '../controllers/productivityController.js';
import * as settings from '../controllers/settingsController.js';
import * as focus from '../controllers/focusController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as v from '../validators/index.js';
import { habitRouter } from './habitRoutes.js';
import { goalRouter, milestoneRouter } from './goalRoutes.js';
import * as analytics from '../controllers/analyticsController.js';
import { historyQuerySchema } from '../validators/productivitySchemas.js';
import { z } from 'zod';
export const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Try again in 15 minutes.' } },
});
router.post('/auth/signup', authLimit, validate(v.signupSchema), auth.signup);
router.post('/auth/login', authLimit, validate(v.loginSchema), auth.login);
router.use(requireAuth);
router.get('/auth/me', auth.me);
router.post('/auth/logout', auth.logout);
router.get('/tasks', validate(v.taskQuerySchema, 'query'), task.list);
router.post('/tasks', validate(v.taskCreateSchema), task.create);
router.patch(
  '/tasks/:id',
  validate(v.idSchema, 'params'),
  validate(v.taskUpdateSchema),
  task.update,
);
router.delete('/tasks/:id', validate(v.idSchema, 'params'), task.remove);
router.post('/tasks/:id/complete', validate(v.idSchema, 'params'), task.complete);
router.post('/tasks/:id/uncomplete', validate(v.idSchema, 'params'), task.uncomplete);
router.get('/productivity/today', productivity.today);
router.get('/productivity/week', productivity.week);
router.get('/analytics/week', productivity.week);
router.get('/settings', settings.get);
router.patch('/settings', validate(v.settingsSchema), settings.update);
router.get('/focus/sessions', focus.list);
router.post('/focus/sessions', validate(v.focusSchema), focus.create);
router.use('/habits', habitRouter);
router.use('/goals', goalRouter);
router.use('/milestones', milestoneRouter);
router.get('/analytics/overview', analytics.overview);
router.get('/analytics/heatmap', validate(historyQuerySchema.extend({ days: z.coerce.number().int().min(1).max(365).default(365) }), 'query'), analytics.heatmap);
