import { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { authenticate } from "../plugins/auth.js";

import { previewRequestSchema, previewResponseSchema } from "@apix/shared";
import { zSchema } from "../utils/zod-json-schema.js";
import { db } from "../db/index.js";
import { machinePlacements } from "../db/schema/placements.js";
import { service } from "../db/schema/services.js";
import { machines } from "../db/schema/machines.js";
import { toys } from "../db/schema/toys.js";

/**
 * Preview routes — раздел ТЗ 13.10: Предварительный расчёт цепочки.
 *
 * POST /api/preview — предварительный расчёт финансовых показателей
 * без сохранения в БД. Выполняется с мобильного клиента перед отправкой /api/sync.
 */

const tags = ["Preview"];

/** Разница в днях между двумя датами (YYYY-MM-DD) */
function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round(Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export async function previewRoutes(app: FastifyInstance) {
  /**
   * POST /api/preview
   * ТЗ 13.10.1: Принимает данные обслуживания (без фото),
   * находит последнее обслуживание этого placement и вычисляет:
   * - newGames (разница счётчиков)
   * - revenue (newGames × pricePerGame)
   * - costOfToys (сумма цен игрушек по текущему справочнику)
   * - roi ((revenue - costOfToys) / costOfToys × 100%)
   * - periodDays (дней с прошлого обслуживания или с начала placement)
   * - avgGamesPerDay (newGames / periodDays)
   */
  app.post(
    "/api/preview",
    {
      preValidation: [authenticate],
      schema: {
        tags,
        body: zSchema(previewRequestSchema),
        response: {
          200: zSchema(previewResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const { machineNumber, serviceDate, gameCounter, testGames, toys: requestToys } =
        request.body as typeof previewRequestSchema._type;

      // 1. Найти активный placement
      const [placement] = await db
        .select()
        .from(machinePlacements)
        .where(
          and(
            eq(machinePlacements.machineNumber, machineNumber),
            isNull(machinePlacements.endedAt),
          ),
        )
        .limit(1);

      if (!placement) {
        return reply.status(404).send({
          error: "No active placement found for this machine number",
        });
      }

      // 2. Найти последнее обслуживание в этом placement
      const [lastService] = await db
        .select()
        .from(service)
        .where(eq(service.placementId, placement.id))
        .orderBy(desc(service.serviceDate), desc(service.serviceTime))
        .limit(1);

      // 3. Получить цену игры
      const [machine] = await db
        .select({ pricePerGame: machines.pricePerGame })
        .from(machines)
        .where(eq(machines.number, machineNumber));

      const pricePerGame = machine ? Number(machine.pricePerGame) : 0;

      // 4. Вычислить newGames
      const prevCounter = lastService?.gameCounter ?? placement.gameCounterInitial;
      const newGames = gameCounter - prevCounter;

      // 5. Вычислить periodDays
      const prevDateStr =
        lastService?.serviceDate ?? placement.startedAt.toISOString().slice(0, 10);
      const periodDays = daysBetween(prevDateStr, serviceDate);

      // 6. Вычислить revenue
      const revenue = newGames * pricePerGame;

      // 7. Вычислить costOfToys (по текущим ценам из справочника)
      let costOfToys = 0;
      if (requestToys.length > 0) {
        const toyIds = requestToys.map((t) => t.toyId);
        const toyPrices = await db
          .select({ id: toys.id, price: toys.price })
          .from(toys)
          .where(inArray(toys.id, toyIds));

        const priceMap = new Map(toyPrices.map((t) => [t.id, Number(t.price)]));

        for (const t of requestToys) {
          const price = priceMap.get(t.toyId) ?? 0;
          costOfToys += price * t.quantity;
        }
      }

      // 8. Вычислить ROI
      const roi =
        costOfToys > 0 ? Math.round(((revenue - costOfToys) / costOfToys) * 10000) / 100 : null;

      // 9. Вычислить avgGamesPerDay
      const avgGamesPerDay = periodDays > 0 ? Math.round((newGames / periodDays) * 100) / 100 : null;

      return {
        newGames,
        periodDays: periodDays > 0 ? periodDays : null,
        avgGamesPerDay,
        revenue,
        costOfToys,
        roi,
      };
    },
  );
}