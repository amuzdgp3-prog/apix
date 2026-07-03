import { pgTable, serial, integer, date, time, boolean, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { machinePlacements } from "./placements";
import { machines } from "./machines";
import { staff } from "./staff";
import { toys } from "./toys";

/**
 * Обслуживания (service)
 * DDL: lines 711-745
 *
 * Снапшоты цен (price_per_game, price_snapshot) фиксируются на момент обслуживания.
 * Вычисляемые поля (period_days, new_games, revenue, cost_of_toys, roi)
 * заполняются сервером при пересчёте цепочки.
 *
 * UNIQUE (placement_id, service_date) — одно обслуживание в день на placement.
 */
export const service = pgTable(
  "service",
  {
    id: serial("id").primaryKey(),
    placementId: integer("placement_id")
      .notNull()
      .references(() => machinePlacements.id),
    machineNumber: integer("machine_number").references(() => machines.number), // NULL если аппарат удалён
    staffId: integer("staff_id")
      .notNull()
      .references(() => staff.id),
    serviceDate: date("service_date").notNull(),
    serviceTime: time("service_time").notNull(),
    gameCounter: integer("game_counter").notNull(),
    prizeCounter: integer("prize_counter"),
    testGames: integer("test_games").notNull().default(0),
    isOperational: boolean("is_operational").notNull().default(true),

    comment: text("comment"),

    // Снапшоты цен на момент обслуживания
    pricePerGame: numeric("price_per_game", { precision: 10, scale: 2 }).notNull(),

    // Вычисляемые поля (заполняются сервером при пересчёте цепочки)
    beforeServiceId: integer("before_service_id").references((): any => service.id),
    periodDays: integer("period_days"),
    newGames: integer("new_games"),
    newPrizes: integer("new_prizes"),
    revenue: numeric("revenue", { precision: 12, scale: 2 }),
    costOfToys: numeric("cost_of_toys", { precision: 12, scale: 2 }),
    roi: numeric("roi", { precision: 8, scale: 4 }),

    // Фото
    photoCounterUrl: text("photo_counter_url"),
    photoBeforeUrl: text("photo_before_url"),
    photoAfterUrl: text("photo_after_url"),

    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniquePlacementDate: uniqueIndex("idx_service_placement_date").on(t.placementId, t.serviceDate),
  }),
);

/**
 * Расход игрушек по обслуживанию (toy_distribution)
 * DDL: lines 748-755
 *
 * total_cost = quantity * price_snapshot
 * GENERATED ALWAYS AS (...) STORED — Drizzle doesn't support generated columns natively.
 * We'll handle the calculation in application logic and mention it in migration notes.
 */
export const toyDistribution = pgTable("toy_distribution", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => service.id, { onDelete: "cascade" }),
  toyId: integer("toy_id")
    .notNull()
    .references(() => toys.id),
  quantity: integer("quantity").notNull().default(0),
  priceSnapshot: numeric("price_snapshot", { precision: 10, scale: 2 }).notNull(),
  // total_cost NUMERIC(10,2) GENERATED ALWAYS AS (quantity * price_snapshot) STORED
  // → Implemented as a regular column filled by application logic (Drizzle limitation)
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
});

export type ServiceInsert = typeof service.$inferInsert;
export type ServiceSelect = typeof service.$inferSelect;
export type ToyDistributionInsert = typeof toyDistribution.$inferInsert;
export type ToyDistributionSelect = typeof toyDistribution.$inferSelect;