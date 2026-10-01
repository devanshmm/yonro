import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid server configuration: ${result.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ')}`,
  );
export const config = result.data;
