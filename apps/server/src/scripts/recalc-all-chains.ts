/**
 * Разовый скрипт: пересчёт всех цепочек обслуживаний для всех placement.
 * Запуск: cd apps/server; npx tsx src/scripts/recalc-all-chains.ts
 *
 * Используется после заполнения cost_of_toys для исторических данных.
 */
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { service, machinePlacements } from "../db/schema/index.js";
import { recalcChain } from "../services/chainRecalc.js";

async function main() {
  console.log("🔄 Массовый пересчёт цепочек...\n");

  // Получить все placement_id
  const placements = await db
    .select({ id: machinePlacements.id })
    .from(machinePlacements);

  console.log(`  Найдено placement: ${placements.length}`);

  let successCount = 0;
  let errorCount = 0;

  for (const placement of placements) {
    // Найти минимальную дату обслуживания для этого placement
    const [firstService] = await db
      .select({ serviceDate: service.serviceDate })
      .from(service)
      .where(sql`${service.placementId} = ${placement.id}`)
      .orderBy(service.serviceDate)
      .limit(1);

    if (!firstService) {
      console.log(`  ⚠️ Placement ${placement.id}: нет обслуживаний, пропущен`);
      continue;
    }

    try {
      await recalcChain(db, placement.id, firstService.serviceDate);
      successCount++;
      if (successCount % 20 === 0) {
        console.log(`  ... ${successCount}/${placements.length}`);
      }
    } catch (e: any) {
      errorCount++;
      console.error(`  ❌ Placement ${placement.id}: ${e.message}`);
    }
  }

  console.log(`\n✅ Пересчитано цепочек: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Ошибок: ${errorCount}`);
  }

  // Проверить результат
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withROI: sql<number>`count(*) filter (where roi is not null)::int`,
      withRevenue: sql<number>`count(*) filter (where revenue is not null)::int`,
    })
    .from(service);

  console.log(`\n📊 Статистика после пересчёта:`);
  console.log(`  Всего обслуживаний: ${stats.total}`);
  console.log(`  С revenue: ${stats.withRevenue}`);
  console.log(`  С ROI: ${stats.withROI}`);

  process.exit(0);
}

main();