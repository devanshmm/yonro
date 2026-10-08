import { z } from 'zod';
export const leaderboardQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    period: z.enum(['weekly', 'monthly', 'all-time']).default('weekly'),
  })
  .strict();
export const xpHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().uuid().optional(),
  })
  .strict();
export const focusRunStartSchema = z
  .object({
    id: z.string().uuid(),
    targetSeconds: z.number().int().min(60).max(21600),
  })
  .strict();
export const focusRunActionSchema = z
  .object({ action: z.enum(['pause', 'resume', 'cancel']) })
  .strict();
