import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { service } from "../db/schema/services.js";
import type { db as dbType } from "../db/index.js";

/**
 * Пересчёт цепочки обслуживаний в рамках одного placement (ТЗ раздел 14).
 *
 * ПРАВИЛА:
 * - Пересчёт НИКОГДА не пересекает границу placement (архитектурное правило #2).
 * - Выполняется ТОЛЬКО на сервере (архитектурное правило #1).
 * - Использует SELECT FOR UPDATE для блокировки строк.
 *
 * @param tx - Drizzle транзакция (NodePgDatabase)
 * @param placementId - ID placement, для которого пересчитываем цепочку
 * @param startDate - Дата (YYYY-MM-DD), начиная с которой пересчитываем
 */
export async function recalcChain(
  tx: typeof dbType,
  placementId: number,
  startDate: string,
): Promise<void> {
  // 1. Получить все обслуживания placement начиная с startDate,
  //    упорядоченные по дате и времени (SELECT FOR UPDATE)
  const services = await tx
    .select()
    .from(service)
    .where(
      and(
        eq(service.placementId, placementId),
        gte(service.serviceDate, startDate),
      ),
    )
    .orderBy(asc(service.serviceDate), asc(service.serviceTime))
    .for("update");

  if (services.length === 0) return;

  // 2. Получить предыдущее обслуживание (строго до startDate)
  const [prevRow] = await tx
    .select()
    .from(service)
    .where(
      and(
        eq(service.placementId, placementId),
        lt(service.serviceDate, startDate),
      ),
    )
    .orderBy(desc(service.serviceDate), desc(service.serviceTime))
    .limit(1);

  let prev = prevRow ?? null;

  // 3. Пересчёт для каждого обслуживания в цепочке
  for (const current of services) {
    const updates: Partial<typeof current> = {};

    updates.beforeServiceId = prev?.id ?? null;

    if (prev) {
      // Период в днях (минимум 1)
      const daysDiff = daysBetween(prev.serviceDate, current.serviceDate);
      updates.periodDays = Math.max(1, daysDiff);

      // Новые игры: разница счётчиков минус тестовые игры текущего
      updates.newGames =
        current.gameCounter - prev.gameCounter - current.testGames;

      // Новые призы (если счётчики призов есть в обоих обслуживаниях)
      if (current.prizeCounter != null && prev.prizeCounter != null) {
        updates.newPrizes = current.prizeCounter - prev.prizeCounter;
      } else {
        updates.newPrizes = null;
      }

      // Выручка: только если предыдущий период был рабочим (не простой)
      if (prev.isOperational) {
        const rev = (updates.newGames ?? 0) * Number(current.pricePerGame);
        updates.revenue = String(rev);
      } else {
        updates.revenue = null; // период простоя
      }

      // ROI = выручка текущего / себестоимость предыдущего
      if (
        updates.revenue != null &&
        prev.costOfToys &&
        Number(prev.costOfToys) > 0
      ) {
        const roiVal =
          Number(updates.revenue) / Number(prev.costOfToys);
        updates.roi = String(Number(roiVal.toFixed(4)));
      } else {
        updates.roi = null;
      }
    } else {
      // Первое обслуживание на placement — вычисляемые поля = null
      updates.periodDays = null;
      updates.newGames = null;
      updates.newPrizes = null;
      updates.revenue = null;
      updates.roi = null;
    }

    await tx.update(service).set(updates).where(eq(service.id, current.id));

    // Обновляем prev для следующей итерации (мержим вычисленные поля)
    prev = { ...current, ...updates };
  }
}

/** Разница в днях между двумя датами (YYYY-MM-DD) */
function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round(
    Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24),
  );
}