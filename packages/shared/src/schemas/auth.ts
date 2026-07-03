import { z } from "zod";

// ==========================================
// Роли
// ==========================================

export const staffRoleSchema = z.enum(["technician", "admin"]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

// ==========================================
// Login
// ==========================================

export const loginRequestSchema = z.strictObject({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.strictObject({
  accessToken: z.string(),
  user: z.strictObject({
    id: z.number().int().positive(),
    fullName: z.string(),
    role: staffRoleSchema,
    cityId: z.number().int().positive().nullable(),
  }),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ==========================================
// Register (создание сотрудника админом)
// ==========================================

export const registerRequestSchema = z.strictObject({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(6),
  role: staffRoleSchema,
  cityId: z.number().int().positive().nullable().optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// ==========================================
// Refresh
// ==========================================

export const refreshResponseSchema = z.strictObject({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

// ==========================================
// Logout
// ==========================================

export const logoutResponseSchema = z.strictObject({
  success: z.literal(true),
});
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

// ==========================================
// JWT payload
// ==========================================

export const jwtPayloadSchema = z.strictObject({
  sub: z.number().int().positive(),
  role: staffRoleSchema,
  cityId: z.number().int().positive().nullable(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;