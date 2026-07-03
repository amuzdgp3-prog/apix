import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://apix:apix_password@localhost:5432/apix",
  },
} satisfies Config;
