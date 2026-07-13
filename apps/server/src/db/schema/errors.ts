import { pgTable, bigserial, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * Журнал ошибок сервера (server_errors)
 * Хранит все критические ошибки для последующего анализа
 */
export const serverErrors = pgTable("server_errors", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  level: varchar("level", { length: 20 }).notNull().default("error"), // error | warn | fatal
  message: text("message").notNull(),
  stack: text("stack"),
  context: jsonb("context"), // request path, method, user info, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServerErrorInsert = typeof serverErrors.$inferInsert;
export type ServerErrorSelect = typeof serverErrors.$inferSelect;