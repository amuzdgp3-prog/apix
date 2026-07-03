import { timestamp } from "drizzle-orm/pg-core";

/**
 * Reusable column helpers for tables with created_at / updated_at.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};