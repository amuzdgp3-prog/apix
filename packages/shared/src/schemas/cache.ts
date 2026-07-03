import { z } from "zod";

// ==========================================
// Кэш аппарата (для техника)
// ==========================================

export const cachedMachineToySchema = z.strictObject({
  toyId: z.number().int().positive(),
  name: z.string(),
  price: z.number().min(0),
});
export type CachedMachineToy = z.infer<typeof cachedMachineToySchema>;

export const cachedMachineSchema = z.strictObject({
  number: z.number().int().positive(),
  address: z.string(),
  locationId: z.number().int().positive(),
  typeId: z.number().int().positive(),
  typeName: z.string(),
  status: z.string(),
  pricePerGame: z.number().min(0),
  hasPrizeCounter: z.boolean(),
  minServiceDays: z.number().int().positive().nullable().optional(),
  maxServiceDays: z.number().int().positive().nullable().optional(),
  toys: z.array(cachedMachineToySchema),
  technicianIds: z.array(z.number().int().positive()),
  updatedAt: z.string(),
});
export type CachedMachine = z.infer<typeof cachedMachineSchema>;

// ==========================================
// Кэш забытых аппаратов
// ==========================================

export const forgottenMachineSchema = z.strictObject({
  number: z.number().int().positive(),
  locationName: z.string(),
  lastServiceDate: z.string().nullable(),
  daysSinceLastService: z.number().int().positive().nullable(),
  maxServiceDays: z.number().int().positive().nullable(),
});
export type ForgottenMachine = z.infer<typeof forgottenMachineSchema>;
