import { pgTable, bigserial, varchar, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { staff } from "./staff";

/**
 * Аудит (audit_log)
 * DDL: lines 761-770
 */
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: text("record_id").notNull(), // TEXT, not INT — may hold composite keys
  action: varchar("action", { length: 10 }).notNull(),
  // CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')) — not enforced in Drizzle, handled at app level
  userId: integer("user_id").references(() => staff.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
});

/**
 * Архив аудита (audit_log_archive)
 * DDL: lines 772-774
 * LIKE audit_log INCLUDING ALL — Drizzle limitation: we duplicate the structure.
 */
export const auditLogArchive = pgTable("audit_log_archive", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: text("record_id").notNull(),
  action: varchar("action", { length: 10 }).notNull(),
  userId: integer("user_id").references(() => staff.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
});

export type AuditLogInsert = typeof auditLog.$inferInsert;
export type AuditLogSelect = typeof auditLog.$inferSelect;
export type AuditLogArchiveInsert = typeof auditLogArchive.$inferInsert;
export type AuditLogArchiveSelect = typeof auditLogArchive.$inferSelect;