import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url().default("postgresql://postgres:roms@localhost:5432/roms?schema=public"),
  JWT_SECRET: z.string().min(16).default("roms-hpc-jwt-super-secret-production-key-change-me"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  REDIS_URL: z.string().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174,http://localhost:5175"),
  NOTIFICATION_SERVICE_URL: z.string().optional(),
  INTEGRATION_SERVICE_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  APP_URL: z.string().default("http://192.168.70.50:8080"),
  INVENTORY_DISPATCH_EMAIL: z.string().optional(),
}).refine(
  (data) => {
    if (data.NODE_ENV === "production") {
      const isDefault = data.JWT_SECRET === "roms-hpc-jwt-super-secret-production-key-change-me";
      return !isDefault && data.JWT_SECRET.length >= 32;
    }
    return true;
  },
  {
    message: "Production deployment must set a strong, non-default JWT_SECRET of at least 32 characters.",
    path: ["JWT_SECRET"],
  }
);

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
