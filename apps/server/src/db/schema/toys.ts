import {
  pgTable,
  serial,
  varchar,
  numeric,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { timestamps } from "./crud-base";
import { staff } from "./staff";

// Forward reference for toys table (used in self-referencing foreign keys)
// We declare the table first with its columns, then add references.

/**
 * Игрушки (toys)
 * DDL: lines 569-576
 */
export const toys = pgTable("toys", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  ...timestamps,
});

/**
 * История цен на игрушки (toy_price_history)
 * DDL: lines 578-585
 */
export const toyPriceHistory = pgTable("toy_price_history", {
  id: serial("id").primaryKey(),
  toyId: integer("toy_id")
    .notNull()
    .references(() => toys.id),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer("created_by").references(() => staff.id),
});

/**
 * Игрушки по типу аппарата (machine_type_toys) — базовый набор
 * DDL: lines 587-592
 */
export const machineTypeToys = pgTable(
  "machine_type_toys",
  {
    machineTypeId: integer("machine_type_id")
      .notNull()
      .references(() => machineTypes.id, { onDelete: "cascade" }),
    toyId: integer("toy_id")
      .notNull()
      .references(() => toys.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.machineTypeId, t.toyId] }),
  }),
);

// Lazy import to avoid circular dependency with machine-types
import { machineTypes } from "./machine-types";

export type ToyInsert = typeof toys.$inferInsert;
export type ToySelect = typeof toys.$inferSelect;
export type ToyPriceHistoryInsert = typeof toyPriceHistory.$inferInsert;
export type ToyPriceHistorySelect = typeof toyPriceHistory.$inferSelect;
export type MachineTypeToysInsert = typeof machineTypeToys.$inferInsert;
export type MachineTypeToysSelect = typeof machineTypeToys.$inferSelect;