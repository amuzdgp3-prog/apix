import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { machines } from "./machines";
import { staff } from "./staff";

/**
 * Сессии аппарата на точке (machine_placements)
 * DDL: lines 695-705
 *
 * Один placement = один физический аппарат на одной точке.
 * Замена аппарата закрывает старый placement и создаёт новый.
 * Все обслуживания привязаны к placement_id.
 */
export const machinePlacements = pgTable("machine_placements", {
  id: serial("id").primaryKey(),
  machineNumber: integer("machine_number")
    .notNull()
    .references(() => machines.number),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }), // NULL = текущая сессия
  gameCounterInitial: integer("game_counter_initial").notNull().default(0),
  prizeCounterInitial: integer("prize_counter_initial").notNull().default(0),
  createdBy: integer("created_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MachinePlacementInsert = typeof machinePlacements.$inferInsert;
export type MachinePlacementSelect = typeof machinePlacements.$inferSelect;