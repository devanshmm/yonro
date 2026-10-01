import { z } from 'zod';
import { IANAZone } from 'luxon';
import { productivityDateSchema as date } from './productivitySchemas.js';
export const idSchema = z.object({ id: z.string().uuid() });
const timezone = z.string().refine((s) => IANAZone.isValidZone(s), 'Use a valid IANA timezone');
export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,30}$/, 'Username needs 3–30 letters, numbers, or underscores'),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(8)
      .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'Password must be at most 72 bytes'),
    timezone: timezone.default('UTC'),
  })
  .strict();
export const loginSchema = z
  .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) })
  .strict();
const taskFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().min(1).max(50).default('Personal'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).default('TODO'),
  estimatedMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  productivityDate: date.optional(),
};
export const taskCreateSchema = z.object(taskFields).strict();
export const taskUpdateSchema = z
  .object(taskFields)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Provide a field to update');
export const taskQuerySchema = z.object({ date: date.optional() }).strict();
export const settingsSchema = z
  .object({
    dayStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'),
    timezone,
    profileVisibility: z.enum(['PRIVATE', 'PUBLIC']),
    showActivity: z.boolean(),
    showFocusTime: z.boolean(),
    showStreak: z.boolean(),
  })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Provide a setting to update');
export const focusSchema = z
  .object({
    id: z.string().uuid(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    durationSeconds: z.number().int().min(1).max(21600),
  })
  .strict()
  .superRefine((data, ctx) => {
    const start = Date.parse(data.startedAt),
      end = Date.parse(data.endedAt),
      now = Date.now();
    if (
      end <= start ||
      end > now + 5000 ||
      start > now ||
      end - start < data.durationSeconds * 1000 - 1000 ||
      end - start > 7 * 86400000
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Focus timestamps must cover the duration, end in the past, and span no more than 7 days',
      });
    }
  });
