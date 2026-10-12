import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  OTP_EXPIRY_MINS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5)),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SERVICE_SID: z.string().optional(),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_URL: z.string().optional().default(''),
});

// Parse variables
const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Invalid environment variables during startup:');
  console.error(JSON.stringify(envResult.error.format(), null, 2));
  throw new Error('Environment variable validation failed');
}

export const config = envResult.data;
export type Config = typeof config;
