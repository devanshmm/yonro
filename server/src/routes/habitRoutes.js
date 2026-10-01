import { Router } from 'express';
import * as habitController from '../controllers/habitController.js';
import { validate } from '../middleware/validate.js';
import { idSchema } from '../validators/index.js';
import { historyQuerySchema, productivityDateSchema } from '../validators/productivitySchemas.js';
import { habitDefinitionSchema, habitUpdateSchema, habitEntrySchema, habitListQuerySchema } from '../validators/habitSchemas.js';

export const habitRouter = Router();
habitRouter.get('/', validate(habitListQuerySchema, 'query'), habitController.list);
habitRouter.post('/', validate(habitDefinitionSchema), habitController.create);
habitRouter.use('/:id', validate(idSchema, 'params'));
habitRouter.get('/:id', habitController.get);
habitRouter.patch('/:id', validate(habitUpdateSchema), habitController.update);
habitRouter.delete('/:id', habitController.remove);
habitRouter.post('/:id/entries', validate(habitEntrySchema), habitController.recordEntry);
habitRouter.get('/:id/entries', validate(historyQuerySchema, 'query'), habitController.entries);
habitRouter.get('/:id/analytics', validate(historyQuerySchema, 'query'), habitController.analytics);
habitRouter.delete(
  '/:id/entries/:productivityDate',
  validate(idSchema.extend({ productivityDate: productivityDateSchema }), 'params'),
  habitController.removeEntry,
);
