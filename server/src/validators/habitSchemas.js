import { z } from 'zod';
import { productivityDateSchema } from './productivitySchemas.js';

const positiveNumber = z.number().finite().positive().max(1000000000);
const habitFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  type: z.enum(['BOOLEAN', 'NUMBER', 'DURATION', 'PERCENTAGE', 'COUNTER']),
  targetValue: positiveNumber,
  targetDirection: z.enum(['AT_LEAST', 'AT_MOST']).default('AT_LEAST'),
  unit: z.string().trim().min(1).max(40),
  active: z.boolean().default(true),
};

function validateTrackingDefinition(habit, context) {
  if (
    habit.type === 'BOOLEAN' &&
    (habit.targetValue !== 1 || habit.targetDirection !== 'AT_LEAST' || habit.unit !== 'completed')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['targetValue'],
      message: 'Boolean habits use target 1, unit completed, and AT_LEAST',
    });
  }
  if (habit.type === 'PERCENTAGE' && (habit.targetValue > 100 || habit.unit !== '%')) {
    context.addIssue({
      code: 'custom',
      path: ['targetValue'],
      message: 'Percentage targets must be at most 100 with unit %',
    });
  }
  if (['COUNTER', 'DURATION'].includes(habit.type) && !Number.isInteger(habit.targetValue)) {
    context.addIssue({
      code: 'custom',
      path: ['targetValue'],
      message: 'Counts and duration targets must be whole numbers',
    });
  }
  if (habit.type === 'DURATION' && habit.unit !== 'minutes') {
    context.addIssue({ code: 'custom', path: ['unit'], message: 'Duration habits use minutes' });
  }
}

export const habitDefinitionSchema = z
  .object(habitFields)
  .strict()
  .superRefine(validateTrackingDefinition);
export const habitUpdateSchema = z
  .object(habitFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide a field to update');
export const habitListQuerySchema = z
  .object({ scope: z.enum(['active', 'archived', 'all']).default('active') })
  .strict();
export const habitEntrySchema = z
  .object({
    value: z.number().finite().min(0).max(1000000000),
    productivityDate: productivityDateSchema.optional(),
  })
  .strict();

export function validateEntryValue(habit, value) {
  let schema = z.number().finite().min(0).max(1000000000);
  if (habit.type === 'BOOLEAN') {
    schema = z.union([z.literal(0), z.literal(1)]);
  } else if (habit.type === 'PERCENTAGE') {
    schema = schema.max(100);
  } else if (['COUNTER', 'DURATION'].includes(habit.type)) {
    schema = schema.int();
  }
  return z.object({ value: schema }).parse({ value }).value;
}
