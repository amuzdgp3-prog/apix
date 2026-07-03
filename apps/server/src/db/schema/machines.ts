import { pgTable, integer, varchar, numeric, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { timestamps } from "./crud-base";
import { locations } from "./locations";
import { machineTypes } from "./machine-types";
import { toys } from "./toys";
import { routes } from "./locations";
import { staff } from "./staff";

/**
 * Аппараты (machines)
 * DDL: lines 655-667
 * Note: number is INT PRIMARY KEY (no auto-increment — number on the physical case)
 */
export const machines = pgTable("machines", {
  number: integer("number").primaryKey(),
  locationId: integer("location_id")
    .notNull()
    .references(() => locations.id),
  typeId: integer("type_id")
    .notNull()
    .references(() => machineTypes.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // CHECK (status IN ('active', 'inactive')) — not enforced in Drizzle, handled at app level
  pricePerGame: numeric("price_per_game", { precision: 10, scale: 2 }).notNull(),
  hasPrizeCounter: boolean("has_prize_counter").notNull().default(true),
  minServiceDays: integer("min_service_days"),
  maxServiceDays: integer("max_service_days"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
});

/**
 * Индивидуальные игрушки аппарата (machine_toys)
 * DDL: lines 669-675
 */
export const machineToys = pgTable(
  "machine_toys",
  {
    machineNumber: integer("machine_number")
      .notNull()
      .references(() => machines.number, { onDelete: "cascade" }),
    toyId: integer("toy_id")
      .notNull()
      .references(() => toys.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 10 }).notNull(),
    // CHECK (action IN ('add', 'remove'))
  },
  (t) => ({
    pk: primaryKey({ columns: [t.machineNumber, t.toyId] }),
  }),
);

/**
 * Привязка аппаратов к маршрутам (machine_routes)
 * DDL: lines 677-682
 */
export const machineRoutes = pgTable(
  "machine_routes",
  {
    machineNumber: integer("machine_number")
      .notNull()
      .references(() => machines.number, { onDelete: "cascade" }),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.machineNumber, t.routeId] }),
  }),
);

/**
 * Привязка техников к аппаратам (machine_technicians)
 * DDL: lines 684-689
 */
export const machineTechnicians = pgTable(
  "machine_technicians",
  {
    machineNumber: integer("machine_number")
      .notNull()
      .references(() => machines.number, { onDelete: "cascade" }),
    staffId: integer("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.machineNumber, t.staffId] }),
  }),
);

export type MachineInsert = typeof machines.$inferInsert;
export type MachineSelect = typeof machines.$inferSelect;
export type MachineToysInsert = typeof machineToys.$inferInsert;
export type MachineToysSelect = typeof machineToys.$inferSelect;
export type MachineRoutesInsert = typeof machineRoutes.$inferInsert;
export type MachineRoutesSelect = typeof machineRoutes.$inferSelect;
export type MachineTechnicianInsert = typeof machineTechnicians.$inferInsert;
export type MachineTechnicianSelect = typeof machineTechnicians.$inferSelect;