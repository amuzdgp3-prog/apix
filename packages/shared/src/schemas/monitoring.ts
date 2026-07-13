import { z } from "zod";

/** Уровень ошибки */
export const errorLevelSchema = z.enum(["error", "warn", "fatal"]);
export type ErrorLevel = z.infer<typeof errorLevelSchema>;

/** Запись об ошибке сервера */
export const serverErrorSchema = z.object({
  id: z.number().int().positive(),
  level: errorLevelSchema,
  message: z.string(),
  stack: z.string().nullable(),
  context: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type ServerError = z.infer<typeof serverErrorSchema>;

/** Системная метрика */
export const systemMetricSchema = z.object({
  cpu: z.object({
    usagePercent: z.number().min(0).max(100),
    cores: z.number().int().positive(),
  }),
  memory: z.object({
    totalMB: z.number().positive(),
    usedMB: z.number().positive(),
    usagePercent: z.number().min(0).max(100),
    processMB: z.number().positive(),
  }),
  disk: z.object({
    totalGB: z.number().positive(),
    freeGB: z.number().positive(),
    usagePercent: z.number().min(0).max(100),
  }),
  uptime: z.object({
    processSeconds: z.number().nonnegative(),
    systemSeconds: z.number().nonnegative(),
  }),
  node: z.object({
    version: z.string(),
    env: z.string(),
    pid: z.number().int().positive(),
  }),
});
export type SystemMetric = z.infer<typeof systemMetricSchema>;

/** Статус зависимостей (БД, MinIO) */
export const dependencyStatusSchema = z.object({
  postgres: z.enum(["connected", "disconnected", "error"]),
  minio: z.enum(["connected", "disconnected", "error"]),
});
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

/** Полный ответ /api/monitoring/metrics */
export const monitoringMetricsResponseSchema = z.object({
  timestamp: z.string().datetime(),
  system: systemMetricSchema,
  dependencies: dependencyStatusSchema,
  containers: z.array(z.object({
    name: z.string(),
    status: z.string(),
    uptime: z.string().optional(),
  })).optional(),
  recentErrors: z.array(serverErrorSchema),
});
export type MonitoringMetricsResponse = z.infer<typeof monitoringMetricsResponseSchema>;

/** Запрос списка ошибок */
export const getErrorsQuerySchema = z.object({
  level: errorLevelSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type GetErrorsQuery = z.infer<typeof getErrorsQuerySchema>;

/** Ответ списка ошибок */
export const getErrorsResponseSchema = z.object({
  items: z.array(serverErrorSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export type GetErrorsResponse = z.infer<typeof getErrorsResponseSchema>;