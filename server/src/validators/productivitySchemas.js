import { z } from 'zod';
import { DateTime } from 'luxon';

export const productivityDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => DateTime.fromISO(value).isValid,
  'Use a valid date',
);

export const historyQuerySchema = z.object({
  days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(365)])).default(30),
}).strict();
