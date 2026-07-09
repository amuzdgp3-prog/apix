import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { zSchema } from "../utils/zod-json-schema.js";
import { db } from "../db/index.js";
import { machines } from "../db/schema/machines.js";
import { machinePlacements } from "../db/schema/placements.js";
import { service } from "../db/schema/services.js";
import { locations } from "../db/schema/locations.js";
import { machineTypes } from "../db/schema/machine-types.js";
import { toys } from "../db/schema/toys.js";
import { staff } from "../db/schema/staff.js";
import { machineTechnicians, machineRoutes as machineRoutesTable, machineToys } from "../db/schema/machines.js";
import { machineTypeToys } from "../db/schema/toys.js";
import { authenticate } from "../plugins/auth.js";

const tags = ["Machines"];

export async function machineRoutes(app: FastifyInstance) {
  // GET /api/machines/:number/qr — данные для QR-кода аппарата
  app.get(
    "/api/machines/:number/qr",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);
      const [m] = await db
        .select({
          number: machines.number,
          typeName: machineTypes.name,
          locationName: locations.name,
          status: machines.status,
        })
        .from(machines)
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .where(and(eq(machines.number, machineNumber), isNull(machines.deletedAt)))
        .limit(1);

      if (!m) {
        return reply.status(404).send({ error: "Аппарат не найден" });
      }

      const protocol = request.protocol;
      const host = request.hostname;
      const qrUrl = `${protocol}://${host}/service/${m.number}`;

      return reply.send({
        machineNumber: m.number,
        typeName: m.typeName,
        locationName: m.locationName,
        status: m.status,
        qrUrl,
      });
    },
  );

  // PUT /api/machines/:number/status — toggle active/inactive
  app.put(
    "/api/machines/:number/status",
    {
      schema: {
        params: zSchema(z.strictObject({ number: z.string() })),
        body: zSchema(z.strictObject({ status: z.enum(["active", "inactive"]) })),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);
      const { status } = request.body as { status: "active" | "inactive" };
      await db.update(machines).set({ status, updatedAt: new Date() }).where(eq(machines.number, machineNumber));
      return reply.send({ ok: true, status });
    },
  );

  app.get(
    "/api/machines",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const allMachines = await db.select().from(machines);
      return reply.send(allMachines);
    },
  );

  app.get(
    "/api/machines/:number",
    {
      schema: {
        params: zSchema(z.strictObject({ number: z.string() })),
        response: {
          200: zSchema(
            z.strictObject({
              number: z.number().int().positive(),
              typeName: z.string(),
              locationName: z.string(),
              status: z.string(),
              pricePerGame: z.number(),
              hasPrizeCounter: z.boolean(),
              minServiceDays: z.number().int().positive().nullable(),
              maxServiceDays: z.number().int().positive().nullable(),
              toys: z.array(z.strictObject({ id: z.number(), name: z.string(), price: z.number() })),
              technicians: z.array(z.string()),
              routes: z.array(z.string()),
               services: z.array(
                 z.strictObject({
                   id: z.number().int().positive(),
                   serviceDate: z.string(),
                   gameCounter: z.number().int(),
                   newGames: z.number().int().nullable(),
                   revenue: z.number().nullable(),
                   roi: z.number().nullable(),
                   isOperational: z.boolean(),
                   staffName: z.string(),
                   photos: z.strictObject({ counter: z.string().nullish(), before: z.string().nullish(), after: z.string().nullish() }),
                 }),
               ),
               stats: z.strictObject({
                 totalServices: z.number().int(),
                 revenue30d: z.number(),
                 avgRoi: z.number().nullable(),
               }),
               roiTrend: z.array(z.strictObject({ date: z.string(), roi: z.number() })),
            }),
          ),
        },
      },
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);

      const [m] = await db
        .select({
          number: machines.number,
          typeId: machines.typeId,
          typeName: machineTypes.name,
          locationName: locations.name,
          status: machines.status,
          pricePerGame: machines.pricePerGame,
          hasPrizeCounter: machines.hasPrizeCounter,
          minServiceDays: machines.minServiceDays,
          maxServiceDays: machines.maxServiceDays,
        })
        .from(machines)
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .where(and(eq(machines.number, machineNumber), isNull(machines.deletedAt)));

      if (!m) return _reply.status(404).send({ error: "Not found" });

      const machineToys = await db
        .select({ id: toys.id, name: toys.name, price: toys.price })
        .from(toys)
        .innerJoin(machineTypeToys, eq(toys.id, machineTypeToys.toyId))
        .where(eq(machineTypeToys.machineTypeId, m.typeId as unknown as number));

      const techRows = await db
        .select({ name: sql<string>`${staff.fullName}` })
        .from(machineTechnicians)
        .innerJoin(staff, eq(machineTechnicians.staffId, staff.id))
        .where(eq(machineTechnicians.machineNumber, machineNumber));

      const routeRows = await db
        .select({ name: sql<string>`COALESCE(r.name, '')` })
        .from(machineRoutesTable)
        .innerJoin(sql`routes r ON r.id = ${machineRoutesTable.routeId}`, sql``)
        .where(eq(machineRoutesTable.machineNumber, machineNumber));

      const serviceHistory = await db
        .select({
          id: service.id,
          serviceDate: service.serviceDate,
          gameCounter: service.gameCounter,
          newGames: service.newGames,
          revenue: service.revenue,
          roi: service.roi,
          isOperational: service.isOperational,
          staffName: sql<string>`${staff.fullName}`,
          photoCounterUrl: service.photoCounterUrl,
          photoBeforeUrl: service.photoBeforeUrl,
          photoAfterUrl: service.photoAfterUrl,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(staff, eq(service.staffId, staff.id))
        .where(eq(machinePlacements.machineNumber, machineNumber))
        .orderBy(desc(service.serviceDate))
        .limit(20);


      // ROI trend (last 10 services with ROI, ordered chronologically)
      const roiTrendRows = await db
        .select({ d: service.serviceDate, roi: service.roi })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .where(and(eq(machinePlacements.machineNumber, machineNumber), sql`${service.roi} IS NOT NULL`))
        .orderBy(desc(service.serviceDate))
        .limit(10);
      const roiTrend = roiTrendRows.reverse().map(r => ({
        date: r.d,
        roi: Number(r.roi ?? 0),
      }));

      const d30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const [rev30] = await db
        .select({ total: sql<number>`COALESCE(SUM(${service.revenue}),0)` })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .where(and(eq(machinePlacements.machineNumber, machineNumber), sql`${service.serviceDate} >= ${d30}`));

      const [statsRow] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          avgRoi: sql<number>`AVG(${service.roi})`,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .where(eq(machinePlacements.machineNumber, machineNumber));

      const fmt = (v: unknown) => v != null ? Number(v) : null;

      return {
        number: m.number,
        typeName: m.typeName,
        locationName: m.locationName,
        status: m.status as string,
        pricePerGame: Number(m.pricePerGame),
        hasPrizeCounter: m.hasPrizeCounter,
        minServiceDays: m.minServiceDays,
        maxServiceDays: m.maxServiceDays,
        toys: machineToys.map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
        technicians: techRows.map((r) => String(r.name)),
        routes: routeRows.map((r) => String(r.name)),
        services: serviceHistory.map((s) => ({
          id: s.id,
          serviceDate: s.serviceDate,
          gameCounter: s.gameCounter,
          newGames: s.newGames,
          revenue: fmt(s.revenue),
          roi: fmt(s.roi),
          isOperational: s.isOperational,
          staffName: String(s.staffName),
          photos: {
            counter: s.photoCounterUrl,
            before: s.photoBeforeUrl,
            after: s.photoAfterUrl,
          },
        })),
        stats: {
          totalServices: Number(statsRow?.total ?? 0),
          revenue30d: Number(rev30?.total ?? 0),
          avgRoi: fmt(statsRow?.avgRoi),
        },
        roiTrend,
      };
    },
  );

  // --- Эндпоинты для управления индивидуальными правками игрушек на машине ---

  // GET /api/machines/:number/toys — computed игрушки (базовый набор + индивидуальные правки)
  app.get(
    "/api/machines/:number/toys",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt(
        (request.params as { number: string }).number,
        10,
      );

      const [machineRow] = await db
        .select({ typeId: machines.typeId })
        .from(machines)
        .where(
          and(eq(machines.number, machineNumber), isNull(machines.deletedAt)),
        )
        .limit(1);

      if (!machineRow) {
        return reply.status(404).send({ error: "Машина не найдена" });
      }

      const baseToyRows = await db
        .select({ id: toys.id, name: toys.name, price: toys.price })
        .from(toys)
        .innerJoin(machineTypeToys, eq(toys.id, machineTypeToys.toyId))
        .where(
          eq(machineTypeToys.machineTypeId, machineRow.typeId as unknown as number),
        );

      const overrideRows = await db
        .select({ toyId: machineToys.toyId, action: machineToys.action })
        .from(machineToys)
        .where(eq(machineToys.machineNumber, machineNumber));

      const addIds = overrideRows
        .filter((o) => o.action === "add")
        .map((o) => o.toyId);
      const removeIds = new Set(
        overrideRows.filter((o) => o.action === "remove").map((o) => o.toyId),
      );

      let computedToys = baseToyRows.filter((t) => !removeIds.has(t.id));

      if (addIds.length > 0) {
        const addToyRows = await db
          .select({ id: toys.id, name: toys.name, price: toys.price })
          .from(toys)
          .where(sql`${toys.id} IN ${addIds}`);

        const existingIds = new Set(computedToys.map((t) => t.id));
        for (const t of addToyRows) {
          if (!existingIds.has(t.id)) {
            computedToys.push(t);
          }
        }
      }

      return reply.send(
        computedToys.map((t) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price),
        })),
      );
    },
  );

  // GET /api/machines/:number/toys/overrides — список индивидуальных правок
  app.get(
    "/api/machines/:number/toys/overrides",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt(
        (request.params as { number: string }).number,
        10,
      );

      const rows = await db
        .select({
          toyId: machineToys.toyId,
          action: machineToys.action,
          toyName: toys.name,
          toyPrice: toys.price,
        })
        .from(machineToys)
        .innerJoin(toys, eq(machineToys.toyId, toys.id))
        .where(eq(machineToys.machineNumber, machineNumber));

      return reply.send(
        rows.map((r) => ({
          toyId: r.toyId,
          action: r.action,
          toyName: r.toyName,
          toyPrice: Number(r.toyPrice),
        })),
      );
    },
  );

  // POST /api/machines/:number/toys — add/remove индивидуальную правку
  app.post(
    "/api/machines/:number/toys",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt(
        (request.params as { number: string }).number,
        10,
      );
      const { toyId, action } = request.body as {
        toyId: number;
        action: "add" | "remove";
      };

      const [m] = await db
        .select({ number: machines.number })
        .from(machines)
        .where(
          and(eq(machines.number, machineNumber), isNull(machines.deletedAt)),
        )
        .limit(1);

      if (!m) {
        return reply.status(404).send({ error: "Машина не найдена" });
      }

      await db
        .delete(machineToys)
        .where(
          and(
            eq(machineToys.machineNumber, machineNumber),
            eq(machineToys.toyId, toyId),
          ),
        );

      await db.insert(machineToys).values({
        machineNumber,
        toyId,
        action,
      });

      return reply.send({ ok: true });
    },
  );

  // DELETE /api/machines/:number/toys/:toyId — удалить правку
  app.delete(
    "/api/machines/:number/toys/:toyId",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt(
        (request.params as { number: string }).number,
        10,
      );
      const toyId = parseInt(
        (request.params as { number: string; toyId: string }).toyId,
        10,
      );

      await db
        .delete(machineToys)
        .where(
          and(
            eq(machineToys.machineNumber, machineNumber),
            eq(machineToys.toyId, toyId),
          ),
        );

      return reply.send({ ok: true });
    },
  );

  // POST /api/machines/:number/replace — замена аппарата
  app.post(
    "/api/machines/:number/replace",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const oldNumber = parseInt(
        (request.params as { number: string }).number,
        10,
      );
      const { newMachineNumber, gameCounterInitial, prizeCounterInitial } =
        request.body as {
          newMachineNumber: number;
          gameCounterInitial: number;
          prizeCounterInitial: number;
        };

      const [oldMachine] = await db
        .select({
          number: machines.number,
          locationId: machines.locationId,
          typeId: machines.typeId,
        })
        .from(machines)
        .where(
          and(eq(machines.number, oldNumber), isNull(machines.deletedAt)),
        );

      if (!oldMachine) {
        return reply.status(404).send({ error: "Старый аппарат не найден" });
      }

      const [existingNew] = await db
        .select({ number: machines.number })
        .from(machines)
        .where(
          and(
            eq(machines.number, newMachineNumber),
            isNull(machines.deletedAt),
          ),
        );

      if (existingNew) {
        return reply
          .status(409)
          .send({ error: "Аппарат с таким номером уже существует" });
      }

      const [activePlacement] = await db
        .select()
        .from(machinePlacements)
        .where(
          and(
            eq(machinePlacements.machineNumber, oldNumber),
            isNull(machinePlacements.endedAt),
          ),
        );

      if (!activePlacement) {
        return reply.status(400).send({
          error: "Нет активной сессии (placement) для заменяемого аппарата",
        });
      }

      const [oldSettings] = await db
        .select({
          pricePerGame: machines.pricePerGame,
          hasPrizeCounter: machines.hasPrizeCounter,
          minServiceDays: machines.minServiceDays,
          maxServiceDays: machines.maxServiceDays,
        })
        .from(machines)
        .where(eq(machines.number, oldNumber));

      await db
        .update(machinePlacements)
        .set({ endedAt: new Date() })
        .where(eq(machinePlacements.id, activePlacement.id));

      await db
        .update(machines)
        .set({
          status: "inactive",
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(machines.number, oldNumber));

      await db.insert(machines).values({
        number: newMachineNumber,
        locationId: oldMachine.locationId ?? "",
        typeId: oldMachine.typeId,
        status: "active",
        pricePerGame: oldSettings?.pricePerGame ?? "0",
        hasPrizeCounter: oldSettings?.hasPrizeCounter ?? true,
        minServiceDays: oldSettings?.minServiceDays ?? null,
        maxServiceDays: oldSettings?.maxServiceDays ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(machinePlacements).values({
        machineNumber: newMachineNumber,
        startedAt: new Date(),
        gameCounterInitial,
        prizeCounterInitial,
        createdBy: request.user?.id,
        createdAt: new Date(),
      });

      const oldTechs = await db
        .select({ staffId: machineTechnicians.staffId })
        .from(machineTechnicians)
        .where(eq(machineTechnicians.machineNumber, oldNumber));

      if (oldTechs.length > 0) {
        await db.insert(machineTechnicians).values(
          oldTechs.map((t) => ({
            machineNumber: newMachineNumber,
            staffId: t.staffId,
          })),
        );
      }

      const oldRoutes = await db
        .select({ routeId: machineRoutesTable.routeId })
        .from(machineRoutesTable)
        .where(eq(machineRoutesTable.machineNumber, oldNumber));

      if (oldRoutes.length > 0) {
        await db.insert(machineRoutesTable).values(
          oldRoutes.map((r) => ({
            machineNumber: newMachineNumber,
            routeId: r.routeId,
          })),
        );
      }

      return reply.send({
        ok: true,
        oldMachineNumber: oldNumber,
        newMachineNumber,
      });
    },
  );
}
