// Apix shared schemas and types
// Zod-схемы — единственный источник правды о форме данных.
// TypeScript-типы выводятся из них с помощью z.infer.

// ==========================================
// Auth
// ==========================================
export {
  staffRoleSchema,
  type StaffRole,
  loginRequestSchema,
  type LoginRequest,
  loginResponseSchema,
  type LoginResponse,
  registerRequestSchema,
  type RegisterRequest,
  refreshResponseSchema,
  type RefreshResponse,
  logoutResponseSchema,
  type LogoutResponse,
  jwtPayloadSchema,
  type JwtPayload,
} from "./schemas/auth";

// ==========================================
// Location / Routes
// ==========================================
export {
  locationSchema,
  type Location,
  locationCreateSchema,
  type LocationCreate,
  locationUpdateSchema,
  type LocationUpdate,
  locationTreeSchema,
  type LocationTree,
  routeSchema,
  type Route,
  routeCreateSchema,
  type RouteCreate,
  routeUpdateSchema,
  type RouteUpdate,
  routeLocationSchema,
  type RouteLocation,
} from "./schemas/location";

// ==========================================
// Machine
// ==========================================
export {
  machineStatusSchema,
  type MachineStatus,
  machineSchema,
  type Machine,
  machineCreateSchema,
  type MachineCreate,
  machineUpdateSchema,
  type MachineUpdate,
  machinePlacementSchema,
  type MachinePlacement,
  machinePlacementCreateSchema,
  type MachinePlacementCreate,
  replaceMachineSchema,
  type ReplaceMachine,
  machineToyActionSchema,
  type MachineToyAction,
  machineToySchema,
  type MachineToy,
  machineRouteSchema,
  type MachineRoute,
  machineTechnicianSchema,
  type MachineTechnician,
} from "./schemas/machine";

// ==========================================
// Toy / MachineType
// ==========================================
export {
  toySchema,
  type Toy,
  toyCreateSchema,
  type ToyCreate,
  toyUpdateSchema,
  type ToyUpdate,
  toyPriceHistorySchema,
  type ToyPriceHistory,
  machineTypeSchema,
  type MachineType,
  machineTypeCreateSchema,
  type MachineTypeCreate,
  machineTypeUpdateSchema,
  type MachineTypeUpdate,
  machineTypeToySchema,
  type MachineTypeToy,
} from "./schemas/toy";

// ==========================================
// Service / Draft / Sync
// ==========================================
export {
  toyDistributionSchema,
  type ToyDistribution,
  toyDistributionInsertSchema,
  type ToyDistributionInsert,
  serviceSchema,
  type Service,
  draftToySchema,
  type DraftToy,
  draftServiceStatusSchema,
  type DraftServiceStatus,
  draftServiceSchema,
  type DraftService,
  syncToySchema,
  syncRequestFieldsSchema,
  type SyncRequestFields,
  syncSuccessResponseSchema,
  type SyncSuccessResponse,
  syncErrorSchema,
  syncErrorResponseSchema,
  type SyncErrorResponse,
  syncResponseSchema,
  type SyncResponse,
  previewRequestSchema,
  type PreviewRequest,
  previewResponseSchema,
  type PreviewResponse,
} from "./schemas/service";

// ==========================================
// Staff
// ==========================================
export {
  staffRoleEnumSchema,
  type StaffRoleEnum,
  staffSchema,
  type Staff,
  staffCreateSchema,
  type StaffCreate,
  staffUpdateSchema,
  type StaffUpdate,
  staffChangePasswordSchema,
  type StaffChangePassword,
} from "./schemas/staff";

// ==========================================
// Audit
// ==========================================
export {
  auditActionSchema,
  type AuditAction,
  auditLogSchema,
  type AuditLog,
} from "./schemas/audit";

// ==========================================
// Cache
// ==========================================
export {
  cachedMachineToySchema,
  type CachedMachineToy,
  cachedMachineSchema,
  type CachedMachine,
  forgottenMachineSchema,
  type ForgottenMachine,
} from "./schemas/cache";