import { pgTable, serial, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./crud-base";
import { locations } from "./locations";

/**
 * Сотрудники (staff)
 * DDL: lines 594-605
 */
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(), // bcrypt
  role: varchar("role", { length: 20 }).notNull(),
  // role CHECK (role IN ('technician', 'admin')) — not enforced in Drizzle, handled at app level
  cityId: integer("city_id").references((): any => locations.id),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * Refresh токены (refresh_tokens)
 * DDL: lines 607-615
 */
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type StaffInsert = typeof staff.$inferInsert;
export type StaffSelect = typeof staff.$inferSelect;
export type RefreshTokenInsert = typeof refreshTokens.$inferInsert;
export type RefreshTokenSelect = typeof refreshTokens.$inferSelect;
