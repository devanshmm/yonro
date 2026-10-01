import { z } from 'zod';
import { productivityDateSchema } from './productivitySchemas.js';

const goalFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  targetDate: productivityDateSchema.nullable().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
};
export const goalCreateSchema = z.object(goalFields).strict();
export const goalUpdateSchema = z.object(goalFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  'Provide a field to update',
);
export const goalListQuerySchema = z.object({ status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ALL']).default('ALL') }).strict();
const milestoneFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  completed: z.boolean().default(false),
};
export const milestoneCreateSchema = z.object(milestoneFields).strict();
export const milestoneUpdateSchema = z.object(milestoneFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  'Provide a field to update',
);
export const reorderMilestonesSchema = z.object({
  milestoneIds: z.array(z.string().uuid()).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    'Milestone IDs must be unique',
  ),
}).strict();
