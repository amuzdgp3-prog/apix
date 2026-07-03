import Dexie, { type Table } from "dexie";

// =============================
// Entities (flat, for offline)
// =============================

export interface StoredMachine {
  id: string;
  number: string;
  machine_type_id: string;
  placement_id: string;
  staff_id: string | null;
  parent_machine_id: string | null;
  comment: string | null;
  status: "active" | "inactive";
  archived: 0 | 1;
  created_at: string;
}

export interface StoredPlacement {
  id: string;
  machine_id: string;
  location_id: string;
  installed_at: string;
  replaced_at: string | null;
  reason: string | null;
  created_at: string;
}

export interface StoredLocation {
  id: string;
  name: string;
  address: string | null;
  route_id: string | null;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  created_at: string;
}

export interface StoredMachineType {
  id: string;
  name: string;
  model: string | null;
  price_per_play: number;
  exchange_rate: number;
  created_at: string;
}

export interface StoredToy {
  id: string;
  name: string;
  price: number;
  category: string | null;
  created_at: string;
}

export interface StoredStaff {
  id: string;
  name: string;
  role: "admin" | "technician";
  active: 0 | 1;
  created_at: string;
}

export interface StoredService {
  id: string;
  machine_id: string;
  staff_id: string;
  service_date: string;
  revenue: number | null;
  period_days: number | null;
  roi: number | null;
  comment: string | null;
  photos: string[]; // base64 thumbnails
  synced: 0 | 1;
  created_at: string;
}

export interface StoredToyDistribution {
  id: string;
  service_id: string;
  toy_id: string;
  price: number; // snapshot
  quantity: number;
  created_at: string;
}

export interface StoredAudit {
  id: string;
  machine_id: string;
  staff_id: string;
  audit_date: string;
  expected_revenue: number | null;
  actual_revenue: number | null;
  discrepancy: number | null;
  comment: string | null;
  synced: 0 | 1;
  created_at: string;
}

export interface PendingOperation {
  id?: number;
  type: "create" | "update" | "delete";
  entity: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// =============================
// Draft service (черновик обслуживания)
// =============================

/**
 * Черновик обслуживания, сохраняемый в IndexedDB.
 * Соответствует схеме DraftService из @apix/shared.
 */
export interface DraftService {
  /** UUID, генерируется на клиенте как локальный идентификатор */
  localId: string;
  machineNumber: number;
  /** Адрес машины (для отображения в списке черновиков) */
  machineAddress: string;
  serviceDate: string; // YYYY-MM-DD
  serviceTime: string; // HH:mm
  gameCounter: number;
  prizeCounter?: number;
  testGames: number;
  isOperational: boolean;
  comment?: string;
  /** JSON-строка с массивом SyncToy */
  toys: string;
  /** Фото как Blob (сохраняются в IndexedDB до отправки) */
  photoCounter?: Blob;
  photoBefore?: Blob;
  photoAfter?: Blob;
  /** Статус синхронизации */
  status: "pending" | "error";
  /** Ошибки валидации/сервера (если status === "error") */
  errors?: string[];
  createdAt: string; // ISO datetime
}

// =============================
// Database
// =============================

class ApixDB extends Dexie {
  machines!: Table<StoredMachine, string>;
  placements!: Table<StoredPlacement, string>;
  locations!: Table<StoredLocation, string>;
  machine_types!: Table<StoredMachineType, string>;
  toys!: Table<StoredToy, string>;
  staff!: Table<StoredStaff, string>;
  services!: Table<StoredService, string>;
  toy_distributions!: Table<StoredToyDistribution, string>;
  audits!: Table<StoredAudit, string>;
  pending_operations!: Table<PendingOperation, number>;
  drafts!: Table<DraftService, string>;

  constructor() {
    super("ApixDB");
    this.version(2).stores({
      machines: "id, number, machine_type_id, placement_id, status, archived",
      placements: "id, machine_id, location_id, installed_at",
      locations: "id, route_id",
      machine_types: "id",
      toys: "id, category",
      staff: "id, role, active",
      services: "id, machine_id, staff_id, service_date, synced",
      toy_distributions: "id, service_id, toy_id",
      audits: "id, machine_id, staff_id, audit_date, synced",
      pending_operations: "++id, entity, type",
      drafts: "localId, machineNumber, serviceDate, status",
    });
  }
}

export const db = new ApixDB();