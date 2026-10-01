import { Router } from 'express';
import * as goalController from '../controllers/goalController.js';
import { validate } from '../middleware/validate.js';
import { idSchema } from '../validators/index.js';
import { goalCreateSchema, goalUpdateSchema, goalListQuerySchema, milestoneCreateSchema, milestoneUpdateSchema, reorderMilestonesSchema } from '../validators/goalSchemas.js';

export const goalRouter = Router();
goalRouter.get('/', validate(goalListQuerySchema, 'query'), goalController.list);
goalRouter.post('/', validate(goalCreateSchema), goalController.create);
goalRouter.use('/:id', validate(idSchema, 'params'));
goalRouter.get('/:id', goalController.get);
goalRouter.patch('/:id', validate(goalUpdateSchema), goalController.update);
goalRouter.delete('/:id', goalController.remove);
goalRouter.post('/:id/milestones', validate(milestoneCreateSchema), goalController.createMilestone);
goalRouter.put('/:id/milestones/order', validate(reorderMilestonesSchema), goalController.reorderMilestones);

export const milestoneRouter = Router();
milestoneRouter.use('/:id', validate(idSchema, 'params'));
milestoneRouter.patch('/:id', validate(milestoneUpdateSchema), goalController.updateMilestone);
milestoneRouter.delete('/:id', goalController.removeMilestone);
milestoneRouter.post('/:id/complete', goalController.completeMilestone);
