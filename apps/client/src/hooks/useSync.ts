import { useCallback, useState } from "react";
import { db } from "../store/db";
import { api } from "../api/client";
import { useOnlineStatus } from "./useOnlineStatus";

export function useSync() {
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncPending = useCallback(async () => {
    if (!online) return;
    setSyncing(true);
    setLastError(null);

    try {
      // 1. Push pending operations
      const pending = await db.pending_operations.toArray();

      for (const op of pending) {
        try {
          const { type, entity, payload } = op;
          if (type === "create") {
            await api.post(`/${entity}`, payload);
          } else if (type === "update") {
            await api.put(`/${entity}/${payload.id}`, payload);
          } else if (type === "delete") {
            await api.delete(`/${entity}/${payload.id}`);
          }
          await db.pending_operations.delete(op.id!);
        } catch {
          // skip, will retry next sync
        }
      }

      // 2. Upload unsynced photos via multipart
      const unsyncedServices = await db.services
        .where("synced")
        .equals(0)
        .toArray();

      for (const svc of unsyncedServices) {
        try {
          // Photos already stored as base64 in IndexedDB — server handles
          await api.put(`/machines/${svc.machine_id}/services/${svc.id}`, svc);
          await db.services.update(svc.id, { synced: 1 });
        } catch {
          // retry next sync
        }
      }

      // 3. Pull fresh data
      const [machines, placements, locations, machineTypes, toys, staff] =
        await Promise.all([
          api.get<unknown[]>("/machines"),
          api.get<unknown[]>("/placements"),
          api.get<unknown[]>("/locations"),
          api.get<unknown[]>("/directories/machine-types"),
          api.get<unknown[]>("/directories/toys"),
          api.get<unknown[]>("/directories/staff"),
        ]);

      // Bulk-put into IndexedDB
      await db.transaction(
        "rw",
        [
          db.machines,
          db.placements,
          db.locations,
          db.machine_types,
          db.toys,
          db.staff,
        ],
        async () => {
          await db.machines.clear();
          await db.machines.bulkPut(machines as never[]);

          await db.placements.clear();
          await db.placements.bulkPut(placements as never[]);

          await db.locations.clear();
          await db.locations.bulkPut(locations as never[]);

          await db.machine_types.clear();
          await db.machine_types.bulkPut(machineTypes as never[]);

          await db.toys.clear();
          await db.toys.bulkPut(toys as never[]);

          await db.staff.clear();
          await db.staff.bulkPut(staff as never[]);
        },
      );
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [online]);

  return { syncing, lastError, syncPending };
}