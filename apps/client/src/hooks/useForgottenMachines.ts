import { useEffect, useState } from "react";
import { db, type StoredMachine } from "../store/db";
import { useLiveQuery } from "dexie-react-hooks";

// Machines without service for >30 days
export function useForgottenMachines(daysThreshold = 30): {
  machines: StoredMachine[];
  loading: boolean;
} {
  const [forgottenIds, setForgottenIds] = useState<string[]>([]);

  const services = useLiveQuery(() => db.services.toArray()) ?? [];

  useEffect(() => {
    const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

    // Group last service date per machine
    const lastServiceMap = new Map<string, number>();
    for (const svc of services) {
      const existing = lastServiceMap.get(svc.machine_id);
      const svcDate = new Date(svc.service_date).getTime();
      if (!existing || svcDate > existing) {
        lastServiceMap.set(svc.machine_id, svcDate);
      }
    }

    // All machine IDs ever serviced
    const allServicedIds = new Set(services.map((s) => s.machine_id));

    // Forgotten = last service > threshold
    const forgotten = Array.from(allServicedIds).filter((id) => {
      const last = lastServiceMap.get(id);
      return last && last < threshold;
    });

    setForgottenIds(forgotten);
  }, [services, daysThreshold]);

  const machines =
    useLiveQuery(
      () =>
        forgottenIds.length > 0
          ? db.machines
              .where("id")
              .anyOf(forgottenIds)
              .and((m) => m.archived === 0)
              .toArray()
          : Promise.resolve([] as StoredMachine[]),
      [forgottenIds],
    ) ?? [];

  return { machines, loading: false };
}