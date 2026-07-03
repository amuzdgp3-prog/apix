import { pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./crud-base";

/**
 * Типы аппаратов (machine_types)
 * DDL: section 11, lines 562-567
 */
export const machineTypes = pgTable("machine_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  ...timestamps,
});

/** Type for inserting a new machine type */
export type MachineTypeInsert = typeof machineTypes.$inferInsert;
/** Type for selecting a machine type row */
export type MachineTypeSelect = typeof machineTypes.$inferSelect;