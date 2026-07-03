import { pgTable, serial, varchar, integer, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { timestamps } from "./crud-base";

/**
 * Локации (дерево произвольной глубины)
 * DDL: lines 621-630
 */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: integer("parent_id").references((): any => locations.id),
  nodeType: varchar("node_type", { length: 50 }), // 'city', 'district', 'mall', 'point', etc.
  minServiceDays: integer("min_service_days"),
  maxServiceDays: integer("max_service_days"),
  ...timestamps,
});

/**
 * Маршруты (routes)
 * DDL: lines 632-641
 */
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  minServiceDays: integer("min_service_days"),
  maxServiceDays: integer("max_service_days"),
  ...timestamps,
});

/**
 * Точки маршрута (route_locations) — упорядоченный список
 * DDL: lines 643-649
 */
export const routeLocations = pgTable(
  "route_locations",
  {
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.routeId, t.locationId] }),
  }),
);

export type LocationInsert = typeof locations.$inferInsert;
export type LocationSelect = typeof locations.$inferSelect;
export type RouteInsert = typeof routes.$inferInsert;
export type RouteSelect = typeof routes.$inferSelect;
export type RouteLocationInsert = typeof routeLocations.$inferInsert;
export type RouteLocationSelect = typeof routeLocations.$inferSelect;