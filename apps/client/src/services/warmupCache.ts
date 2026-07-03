// =============================
// Прогрев кэша — фоновая загрузка справочников после логина
// =============================
import { api } from "../api/client";
import { db } from "../store/db";
import type {
  StoredLocation,
  StoredMachineType,
  StoredToy,
  StoredStaff,
} from "../store/db";

interface DirectoriesResponse {
  locations: {
    id: number;
    name: string;
    parentId: number | null;
    nodeType: string | null;
    minServiceDays: number | null;
    maxServiceDays: number | null;
    createdAt: string;
  }[];
  machineTypes: {
    id: number;
    name: string;
    createdAt: string;
  }[];
  toys: {
    id: number;
    name: string;
    price: number;
    createdAt: string;
  }[];
  staff: {
    id: number;
    email: string;
    fullName: string;
    role: string;
    cityId: number | null;
    isActive: boolean;
    createdAt: string;
  }[];
}

/**
 * Фоновый прогрев кэша: загружает все справочники через /api/cache/directories
 * и сохраняет в IndexedDB. Не бросает ошибок наружу — при неудаче просто
 * логирует в консоль, не мешая работе приложения.
 */
export async function warmupCache(): Promise<void> {
  try {
    const data = await api.get<DirectoriesResponse>("/cache/directories");

    // Сохраняем локации
    const locations: StoredLocation[] = data.locations.map((l) => ({
      id: String(l.id),
      name: l.name,
      address: null,
      route_id: null,
      coordinates_lat: null,
      coordinates_lng: null,
      created_at: l.createdAt,
    }));
    await db.locations.bulkPut(locations);

    // Сохраняем типы аппаратов
    const machineTypes: StoredMachineType[] = data.machineTypes.map((mt) => ({
      id: String(mt.id),
      name: mt.name,
      model: null,
      price_per_play: 0,
      exchange_rate: 0,
      created_at: mt.createdAt,
    }));
    await db.machine_types.bulkPut(machineTypes);

    // Сохраняем игрушки
    const toys: StoredToy[] = data.toys.map((t) => ({
      id: String(t.id),
      name: t.name,
      price: t.price,
      category: null,
      created_at: t.createdAt,
    }));
    await db.toys.bulkPut(toys);

    // Сохраняем сотрудников
    const staffList: StoredStaff[] = data.staff.map((s) => ({
      id: String(s.id),
      name: s.fullName,
      role: s.role as "admin" | "technician",
      active: s.isActive ? (1 as const) : (0 as const),
      created_at: s.createdAt,
    }));
    await db.staff.bulkPut(staffList);

    console.log(
      `[warmupCache] Кэш прогрет: ${locations.length} локаций, ${machineTypes.length} типов, ${toys.length} игрушек, ${staffList.length} сотрудников`,
    );
  } catch (err) {
    // Тихая ошибка — не мешаем работе приложения
    console.warn("[warmupCache] Не удалось прогреть кэш:", err);
  }
}