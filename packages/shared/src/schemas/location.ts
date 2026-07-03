import { z } from "zod";

// ==========================================
// Локация (дерево произвольной глубины)
// ==========================================

export const locationSchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  parentId: z.number().int().positive().nullable(),
  nodeType: z.string().max(50).nullable(),
  minServiceDays: z.number().int().positive().nullable(),
  maxServiceDays: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Location = z.infer<typeof locationSchema>;

export const locationCreateSchema = z.strictObject({
  name: z.string().min(1).max(255),
  parentId: z.number().int().positive().nullable().optional(),
  nodeType: z.string().max(50).nullable().optional(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
});
export type LocationCreate = z.infer<typeof locationCreateSchema>;

export const locationUpdateSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  nodeType: z.string().max(50).nullable().optional(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
});
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

export const locationTreeSchema = z.array(locationSchema);
export type LocationTree = z.infer<typeof locationTreeSchema>;

// ==========================================
// Маршрут
// ==========================================

export const routeSchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  minServiceDays: z.number().int().positive().nullable(),
  maxServiceDays: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Route = z.infer<typeof routeSchema>;

export const routeCreateSchema = z.strictObject({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
});
export type RouteCreate = z.infer<typeof routeCreateSchema>;

export const routeUpdateSchema = z.strictObject({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
});
export type RouteUpdate = z.infer<typeof routeUpdateSchema>;

// ==========================================
// Точка маршрута (упорядоченный список)
// ==========================================

export const routeLocationSchema = z.strictObject({
  routeId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  sortOrder: z.number().int().min(0),
});
export type RouteLocation = z.infer<typeof routeLocationSchema>;