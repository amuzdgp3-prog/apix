import { z } from "zod";

// ==========================================
// Роль персонала
// ==========================================

export const staffRoleEnumSchema = z.enum(["admin", "technician"]);
export type StaffRoleEnum = z.infer<typeof staffRoleEnumSchema>;

// ==========================================
// Сотрудник (соответствует БД-схеме staff)
// ==========================================

export const staffSchema = z.strictObject({
  id: z.number().int().positive(),
  email: z.string().email().max(255),
  fullName: z.string().min(1).max(255),
  password: z.string().min(1),
  role: staffRoleEnumSchema,
  cityId: z.number().int().positive().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Staff = z.infer<typeof staffSchema>;

export const staffCreateSchema = z.strictObject({
  email: z.string().email().max(255),
  password: z.string().min(6).max(100),
  fullName: z.string().min(1).max(255),
  role: staffRoleEnumSchema,
  cityId: z.number().int().positive().nullable().optional(),
});
export type StaffCreate = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z.strictObject({
  email: z.string().email().max(255).optional(),
  fullName: z.string().min(1).max(255).optional(),
  role: staffRoleEnumSchema.optional(),
  cityId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type StaffUpdate = z.infer<typeof staffUpdateSchema>;

export const staffChangePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});
export type StaffChangePassword = z.infer<typeof staffChangePasswordSchema>;

