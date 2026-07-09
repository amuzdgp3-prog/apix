import type { Config } from "drizzle-kit";

// NOTE: We do NOT import "dotenv/config" here.
// In production Docker, env vars come from docker-compose (environment + env_file).
// Importing dotenv/config would override process.env with .env file values,
// which doesn't exist in the production container.

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://apix:apix_password@postgres:5432/apix",
  },
} satisfies Config;
