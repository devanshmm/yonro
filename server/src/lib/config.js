import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).optional(),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid server configuration: ${result.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ')}`,
  );
export const config = {
  ...result.data,
  HOST: result.data.HOST ?? (result.data.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  TRUST_PROXY_HOPS: result.data.TRUST_PROXY_HOPS ?? (result.data.NODE_ENV === 'production' ? 1 : 0),
};
