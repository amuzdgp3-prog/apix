import { z } from "zod";

// ==========================================
// Игрушка
// ==========================================

export const toySchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Toy = z.infer<typeof toySchema>;

export const toyCreateSchema = z.strictObject({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
});
export type ToyCreate = z.infer<typeof toyCreateSchema>;

export const toyUpdateSchema = z.strictObject({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
});
export type ToyUpdate = z.infer<typeof toyUpdateSchema>;

// ==========================================
// История цен на игрушки
// ==========================================

export const toyPriceHistorySchema = z.strictObject({
  id: z.number().int().positive(),
  toyId: z.number().int().positive(),
  price: z.number().min(0),
  validFrom: z.string().datetime(),
  createdBy: z.number().int().positive().nullable(),
});
export type ToyPriceHistory = z.infer<typeof toyPriceHistorySchema>;

// ==========================================
// Тип аппарата
// ==========================================

export const machineTypeSchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MachineType = z.infer<typeof machineTypeSchema>;

export const machineTypeCreateSchema = z.strictObject({
  name: z.string().min(1).max(100),
});
export type MachineTypeCreate = z.infer<typeof machineTypeCreateSchema>;

export const machineTypeUpdateSchema = z.strictObject({
  name: z.string().min(1).max(100).optional(),
});
export type MachineTypeUpdate = z.infer<typeof machineTypeUpdateSchema>;

// ==========================================
// Игрушки по типу аппарата (базовый набор)
// ==========================================

export const machineTypeToySchema = z.strictObject({
  machineTypeId: z.number().int().positive(),
  toyId: z.number().int().positive(),
});
export type MachineTypeToy = z.infer<typeof machineTypeToySchema>;