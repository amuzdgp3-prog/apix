import { z } from "zod";

export const auditActionSchema = z.enum([
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "soft_delete",
  "restore",
  "sync",
  "replace_machine",
  "change_password",
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditLogSchema = z.strictObject({
  id: z.number().int().positive(),
  staffId: z.number().int().positive(),
  action: auditActionSchema,
  entityType: z.string().max(50),
  entityId: z.number().int().positive().nullable(),
  changes: z.record(z.unknown()).nullable(),
  ipAddress: z.string().ip().nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;