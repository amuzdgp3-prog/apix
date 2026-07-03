import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProduction = NODE_ENV === "production";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value) {
    if (isProduction) {
      throw new Error(
        `Environment variable ${key} is required in production mode`
      );
    }
    if (fallback !== undefined) {
      console.warn(`⚠️  Using dev fallback for ${key}: ${fallback.slice(0, 8)}...`);
      return fallback;
    }
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

export const config = {
  NODE_ENV,
  SERVER_PORT: parseInt(requireEnv("SERVER_PORT", "3001"), 10),
  SERVER_HOST: requireEnv("SERVER_HOST", "0.0.0.0"),

  DATABASE_URL: requireEnv(
    "DATABASE_URL",
    "postgresql://apix:apix_password@localhost:5432/apix"
  ),

  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),

  MINIO_ENDPOINT: requireEnv("MINIO_ENDPOINT", "localhost"),
  MINIO_PORT: parseInt(requireEnv("MINIO_PORT", "9000"), 10),
  MINIO_ACCESS_KEY: requireEnv("MINIO_ACCESS_KEY", "minioadmin"),
  MINIO_SECRET_KEY: requireEnv("MINIO_SECRET_KEY", "minioadmin"),
  MINIO_BUCKET: requireEnv("MINIO_BUCKET", "apix-photos"),
  MINIO_USE_SSL: process.env.MINIO_USE_SSL === "true",
} as const;
