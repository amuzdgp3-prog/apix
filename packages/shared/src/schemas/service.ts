import { z } from "zod";

// ==========================================
// Дата и время обслуживания
// ==========================================

const serviceDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const serviceTimeRegex = /^\d{2}:\d{2}$/;

// ==========================================
// Игрушка в обслуживании
// ==========================================

export const toyDistributionSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  toyId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0),
  priceSnapshot: z.number().min(0),
  totalCost: z.number().min(0),
});
export type ToyDistribution = z.infer<typeof toyDistributionSchema>;

export const toyDistributionInsertSchema = z.strictObject({
  toyId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0),
  priceSnapshot: z.number().min(0),
});
export type ToyDistributionInsert = z.infer<typeof toyDistributionInsertSchema>;

// ==========================================
// Обслуживание (полная запись)
// ==========================================

export const serviceSchema = z.strictObject({
  id: z.coerce.number().int().positive(),
  placementId: z.coerce.number().int().positive(),
  machineNumber: z.coerce.number().int().positive().nullable(),
  staffId: z.coerce.number().int().positive(),
  serviceDate: z.string().regex(serviceDateRegex),
  serviceTime: z.string().regex(serviceTimeRegex),
  gameCounter: z.coerce.number().int().min(0),
  prizeCounter: z.coerce.number().int().min(0).nullable(),
  testGames: z.coerce.number().int().min(0),
  isOperational: z.boolean(),
  comment: z.string().nullable(),

  // Снапшот цены игры
  pricePerGame: z.number().min(0),

  // Вычисляемые поля
  beforeServiceId: z.coerce.number().int().positive().nullable(),
  periodDays: z.coerce.number().int().positive().nullable(),
  newGames: z.coerce.number().int().min(0).nullable(),
  newPrizes: z.coerce.number().int().min(0).nullable(),
  revenue: z.number().nullable(),
  costOfToys: z.number().min(0).nullable(),
  roi: z.number().nullable(),
  revenueAttributionStaffId: z.coerce.number().int().positive().nullable(),
  revenuePerDay: z.number().nullable(),
  isMixedPeriod: z.boolean().nullable(),

  // Фото
  photoCounterUrl: z.string().url().nullable(),
  photoBeforeUrl: z.string().url().nullable(),
  photoAfterUrl: z.string().url().nullable(),

  syncedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type Service = z.infer<typeof serviceSchema>;

// ==========================================
// Игрушка в черновике
// ==========================================

export const draftToySchema = z.strictObject({
  toyId: z.coerce.number().int().positive(),
  toyName: z.string().min(1),
  quantity: z.coerce.number().int().min(0),
  priceSnapshot: z.number().min(0),
});
export type DraftToy = z.infer<typeof draftToySchema>;

// ==========================================
// Черновик обслуживания (IndexedDB)
// ==========================================

export const draftServiceStatusSchema = z.enum(["pending", "error"]);
export type DraftServiceStatus = z.infer<typeof draftServiceStatusSchema>;

export const draftServiceSchema = z.strictObject({
  id: z.coerce.number().int().positive().optional(),
  localId: z.string().uuid(),
  machineNumber: z.coerce.number().int().positive(),
  machineAddress: z.string().min(1),
  serviceDate: z.string().regex(serviceDateRegex),
  serviceTime: z.string().regex(serviceTimeRegex),
  gameCounter: z.coerce.number().int().min(0),
  prizeCounter: z.coerce.number().int().min(0).optional(),
  testGames: z.coerce.number().int().min(0),
  isOperational: z.boolean(),
  comment: z.string().optional(),
  toys: z.array(draftToySchema),
  photoCounter: z.instanceof(Blob).optional(),
  photoBefore: z.instanceof(Blob).optional(),
  photoAfter: z.instanceof(Blob).optional(),
  status: draftServiceStatusSchema,
  errors: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
});
export type DraftService = z.infer<typeof draftServiceSchema>;

// ==========================================
// Запрос синхронизации (POST /api/sync)
// ==========================================

export const syncToySchema = z.strictObject({
  toyId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0),
});

export const syncRequestFieldsSchema = z.strictObject({
  localId: z.string().uuid(),
  machineNumber: z.coerce.number().int().positive(),
  serviceDate: z.string().regex(serviceDateRegex),
  serviceTime: z.string().regex(serviceTimeRegex),
  gameCounter: z.coerce.number().int().min(0),
  prizeCounter: z.coerce.number().int().min(0).optional(),
  testGames: z.coerce.number().int().min(0),
  isOperational: z
    .string()
    .transform((v) => v === "true")
    .pipe(z.boolean()),
  comment: z.string().optional(),
  toys: z.string(), // JSON-строка: SyncToy[]
});
export type SyncRequestFields = z.infer<typeof syncRequestFieldsSchema>;

// ==========================================
// Ответ синхронизации
// ==========================================

export const syncSuccessResponseSchema = z.strictObject({
  success: z.literal(true),
  recordId: z.coerce.number().int().positive(),
  calculations: z.strictObject({
    newGames: z.coerce.number().int().min(0),
    revenue: z.number(),
    costOfToys: z.number().min(0),
    roi: z.number().nullable(),
    periodDays: z.coerce.number().int().positive(),
  }),
});
export type SyncSuccessResponse = z.infer<typeof syncSuccessResponseSchema>;

export const syncErrorSchema = z.strictObject({
  field: z.string(),
  message: z.string(),
});

export const syncErrorResponseSchema = z.strictObject({
  success: z.literal(false),
  errors: z.array(syncErrorSchema),
});
export type SyncErrorResponse = z.infer<typeof syncErrorResponseSchema>;

export const syncResponseSchema = z.discriminatedUnion("success", [
  syncSuccessResponseSchema,
  syncErrorResponseSchema,
]);
export type SyncResponse = z.infer<typeof syncResponseSchema>;

// ==========================================
// Предварительный расчёт (POST /api/preview)
// ==========================================

export const previewRequestSchema = z.strictObject({
  machineNumber: z.coerce.number().int().positive(),
  serviceDate: z.string().regex(serviceDateRegex),
  gameCounter: z.coerce.number().int().min(0),
  testGames: z.coerce.number().int().min(0),
  toys: z.array(syncToySchema),
});
export type PreviewRequest = z.infer<typeof previewRequestSchema>;

export const previewResponseSchema = z.strictObject({
  newGames: z.number().int(),
  periodDays: z.number().int().nullable(),
  avgGamesPerDay: z.number().nullable(),
  revenue: z.number().nullable(),
  costOfToys: z.number().min(0),
  roi: z.number().nullable(),
});
export type PreviewResponse = z.infer<typeof previewResponseSchema>;
