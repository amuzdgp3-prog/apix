import { z } from "zod";

// ==========================================
// Статус аппарата
// ==========================================

export const machineStatusSchema = z.enum(["active", "inactive"]);
export type MachineStatus = z.infer<typeof machineStatusSchema>;

// ==========================================
// Аппарат
// ==========================================

export const machineSchema = z.strictObject({
  number: z.number().int().positive(),
  locationId: z.number().int().positive(),
  typeId: z.number().int().positive(),
  status: machineStatusSchema,
  pricePerGame: z.number().min(0),
  hasPrizeCounter: z.boolean(),
  minServiceDays: z.number().int().positive().nullable(),
  maxServiceDays: z.number().int().positive().nullable(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Machine = z.infer<typeof machineSchema>;

export const machineCreateSchema = z.strictObject({
  number: z.number().int().positive(),
  locationId: z.number().int().positive(),
  typeId: z.number().int().positive(),
  status: machineStatusSchema.optional(),
  pricePerGame: z.number().min(0),
  hasPrizeCounter: z.boolean().optional(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
});
export type MachineCreate = z.infer<typeof machineCreateSchema>;

export const machineUpdateSchema = z.strictObject({
  locationId: z.number().int().positive().optional(),
  typeId: z.number().int().positive().optional(),
  status: machineStatusSchema.optional(),
  pricePerGame: z.number().min(0).optional(),
  hasPrizeCounter: z.boolean().optional(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
});
export type MachineUpdate = z.infer<typeof machineUpdateSchema>;

// ==========================================
// Сессия аппарата (placement)
// ==========================================

export const machinePlacementSchema = z.strictObject({
  id: z.number().int().positive(),
  machineNumber: z.number().int().positive(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  gameCounterInitial: z.number().int().min(0),
  prizeCounterInitial: z.number().int().min(0),
  createdBy: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
});
export type MachinePlacement = z.infer<typeof machinePlacementSchema>;

export const machinePlacementCreateSchema = z.strictObject({
  machineNumber: z.number().int().positive(),
  startedAt: z.string().datetime().optional(),
  gameCounterInitial: z.number().int().min(0).optional(),
  prizeCounterInitial: z.number().int().min(0).optional(),
  createdBy: z.number().int().positive().optional(),
});
export type MachinePlacementCreate = z.infer<typeof machinePlacementCreateSchema>;

// ==========================================
// Замена аппарата
// ==========================================

export const replaceMachineSchema = z.strictObject({
  newMachineNumber: z.number().int().positive(),
  gameCounterInitial: z.number().int().min(0),
  prizeCounterInitial: z.number().int().min(0),
});
export type ReplaceMachine = z.infer<typeof replaceMachineSchema>;

// ==========================================
// Индивидуальные игрушки аппарата
// ==========================================

export const machineToyActionSchema = z.enum(["add", "remove"]);
export type MachineToyAction = z.infer<typeof machineToyActionSchema>;

export const machineToySchema = z.strictObject({
  machineNumber: z.number().int().positive(),
  toyId: z.number().int().positive(),
  action: machineToyActionSchema,
});
export type MachineToy = z.infer<typeof machineToySchema>;

// ==========================================
// Привязка аппарата к маршруту
// ==========================================

export const machineRouteSchema = z.strictObject({
  machineNumber: z.number().int().positive(),
  routeId: z.number().int().positive(),
});
export type MachineRoute = z.infer<typeof machineRouteSchema>;

// ==========================================
// Привязка техника к аппарату
// ==========================================

export const machineTechnicianSchema = z.strictObject({
  machineNumber: z.number().int().positive(),
  staffId: z.number().int().positive(),
});
export type MachineTechnician = z.infer<typeof machineTechnicianSchema>;