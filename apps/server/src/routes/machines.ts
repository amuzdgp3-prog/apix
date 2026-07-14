import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, isNull, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { zSchema } from "../utils/zod-json-schema.js";
import { db } from "../db/index.js";
import { machines } from "../db/schema/machines.js";
import { machinePlacements } from "../db/schema/placements.js";
import { service, toyDistribution } from "../db/schema/services.js";
import { locations, routes } from "../db/schema/locations.js";
import { machineTypes } from "../db/schema/machine-types.js";
import { toys } from "../db/schema/toys.js";
import { staff } from "../db/schema/staff.js";
import { machineTechnicians, machineRoutes as machineRoutesTable, machineToys } from "../db/schema/machines.js";
import { machineTypeToys } from "../db/schema/toys.js";
import { authenticate } from "../plugins/auth.js";
import { machineCreateFullSchema } from "@apix/shared";

const tags = ["Machines"];

export async function machineRoutes(app: FastifyInstance) {
  // POST /api/machines — создать новый аппарат
  app.post(
    "/api/machines",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = machineCreateFullSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Некорректные данные", details: parsed.error.flatten() });
      }

      const {
        number,
        locationName,
        typeId,
        pricePerGame,
        maxServiceDays,
        gameCounterInitial,
        prizeCounterInitial,
        routeIds,
      } = parsed.data;

      // Проверить уникальность номера
      const [existing] = await db
        .select({ number: machines.number })
        .from(machines)
        .where(and(eq(machines.number, number), isNull(machines.deletedAt)))
        .limit(1);

      if (existing) {
        return reply.status(409).send({ error: "Аппарат с таким номером уже существует" });
      }

      // Проверить существование типа
      const [mt] = await db.select({ id: machineTypes.id }).from(machineTypes).where(eq(machineTypes.id, typeId)).limit(1);
      if (!mt) {
        return reply.status(400).send({ error: "Тип аппарата не найден" });
      }

      // Найти или создать адрес (location) по текстовому названию
      const locName = locationName.trim();
      let locationId: number;
      const [existingLoc] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.name, locName))
        .limit(1);
      if (existingLoc) {
        locationId = existingLoc.id;
      } else {
        const [created] = await db
          .insert(locations)
          .values({ name: locName, createdAt: new Date(), updatedAt: new Date() })
          .returning({ id: locations.id });
        locationId = created.id;
      }

      // Создать аппарат
      await db.insert(machines).values({
        number,
        locationId,
        typeId,
        status: "active",
        pricePerGame: String(pricePerGame),
        hasPrizeCounter: true,
        minServiceDays: null,
        maxServiceDays: maxServiceDays ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Создать placement с начальными счётчиками
      await db.insert(machinePlacements).values({
        machineNumber: number,
        startedAt: new Date(),
        gameCounterInitial,
        prizeCounterInitial,
        createdBy: request.user?.id,
        createdAt: new Date(),
      });

      // Привязать маршруты
      if (routeIds && routeIds.length > 0) {
        await db.insert(machineRoutesTable).values(
          routeIds.map((rid) => ({ machineNumber: number, routeId: rid })),
        );
      }

      return reply.status(201).send({ ok: true, machineNumber: number });
    },
  );

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
              typeId: z.number().int().positive(),
              typeName: z.string(),
              locationName: z.string(),
              status: z.string(),
              pricePerGame: z.number(),
              hasPrizeCounter: z.boolean(),
              minServiceDays: z.number().int().positive().nullable(),
              maxServiceDays: z.number().int().positive().nullable(),
              toys: z.array(z.strictObject({ id: z.number(), name: z.string(), price: z.number() })),
              technicians: z.array(z.strictObject({ id: z.number().int().positive(), name: z.string() })),
              routes: z.array(z.strictObject({ id: z.number().int().positive(), name: z.string() })),
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

      // Базовый набор игрушек для типа аппарата
      const baseToyRows = await db
        .select({ id: toys.id, name: toys.name, price: toys.price })
        .from(toys)
        .innerJoin(machineTypeToys, eq(toys.id, machineTypeToys.toyId))
        .where(eq(machineTypeToys.machineTypeId, m.typeId as unknown as number));

      // Индивидуальные правки (add/remove) для конкретного аппарата
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

      const computedToys = baseToyRows.filter((t: { id: number }) => !removeIds.has(t.id));

      if (addIds.length > 0) {
        const addToyRows: Array<{ id: number; name: string; price: string }> = await db
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

      const techRows = await db
        .select({ id: staff.id, name: sql<string>`${staff.fullName}` })
        .from(machineTechnicians)
        .innerJoin(staff, eq(machineTechnicians.staffId, staff.id))
        .where(eq(machineTechnicians.machineNumber, machineNumber));

      const routeRows = await db
        .select({ id: routes.id, name: routes.name })
        .from(machineRoutesTable)
        .innerJoin(routes, eq(machineRoutesTable.routeId, routes.id))
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
          comment: service.comment,
          costOfToys: service.costOfToys,
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

      // Получаем распределение игрушек для всех сервисов из истории
      const serviceIds = serviceHistory.map((s) => s.id);
      const toyDistRows = serviceIds.length > 0
        ? await db
            .select({
              serviceId: toyDistribution.serviceId,
              toyName: toys.name,
              quantity: toyDistribution.quantity,
              priceSnapshot: toyDistribution.priceSnapshot,
              totalCost: toyDistribution.totalCost,
            })
            .from(toyDistribution)
            .innerJoin(toys, eq(toyDistribution.toyId, toys.id))
            .where(sql`${toyDistribution.serviceId} IN ${serviceIds}`)
        : [];

      const toyDistByService: Record<number, Array<{ toyName: string; quantity: number; priceSnapshot: number; totalCost: number }>> = {};
      for (const td of toyDistRows) {
        if (!toyDistByService[td.serviceId]) toyDistByService[td.serviceId] = [];
        toyDistByService[td.serviceId].push({
          toyName: td.toyName,
          quantity: td.quantity,
          priceSnapshot: Number(td.priceSnapshot),
          totalCost: Number(td.totalCost),
        });
      }

      return {
        number: m.number,
        typeId: m.typeId as number,
        typeName: m.typeName,
        locationName: m.locationName,
        status: m.status as string,
        pricePerGame: Number(m.pricePerGame),
        hasPrizeCounter: m.hasPrizeCounter,
        minServiceDays: m.minServiceDays,
        maxServiceDays: m.maxServiceDays,
        toys: computedToys.map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
        technicians: techRows.map((r) => ({ id: r.id, name: String(r.name) })),
        routes: routeRows.map((r) => ({ id: r.id, name: String(r.name) })),
        services: serviceHistory.map((s) => ({
          id: s.id,
          serviceDate: s.serviceDate,
          gameCounter: s.gameCounter,
          newGames: s.newGames,
          revenue: fmt(s.revenue),
          roi: fmt(s.roi),
          isOperational: s.isOperational,
          staffName: String(s.staffName),
          comment: s.comment,
          costOfToys: fmt(s.costOfToys),
          photos: {
            counter: s.photoCounterUrl,
            before: s.photoBeforeUrl,
            after: s.photoAfterUrl,
          },
          toyDistribution: toyDistByService[s.id] || [],
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

  // PUT /api/machines/:number — обновление основных параметров аппарата
  app.put(
    "/api/machines/:number",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);
      const { machineUpdateSchema } = await import("@apix/shared");
      const parsed = machineUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Некорректные данные", details: parsed.error.flatten() });
      }

      const [m] = await db
        .select({ number: machines.number })
        .from(machines)
        .where(and(eq(machines.number, machineNumber), isNull(machines.deletedAt)))
        .limit(1);
      if (!m) return reply.status(404).send({ error: "Аппарат не найден" });

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const data = parsed.data;
      if (data.locationId !== undefined) updates.locationId = data.locationId;
      if (data.typeId !== undefined) updates.typeId = data.typeId;
      if (data.status !== undefined) updates.status = data.status;
      if (data.pricePerGame !== undefined) updates.pricePerGame = String(data.pricePerGame);
      if (data.hasPrizeCounter !== undefined) updates.hasPrizeCounter = data.hasPrizeCounter;
      if (data.minServiceDays !== undefined) updates.minServiceDays = data.minServiceDays;
      if (data.maxServiceDays !== undefined) updates.maxServiceDays = data.maxServiceDays;

      await db.update(machines).set(updates).where(eq(machines.number, machineNumber));
      return reply.send({ ok: true });
    },
  );

  // PUT /api/machines/:number/technicians — замена списка техников
  app.put(
    "/api/machines/:number/technicians",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);
      const { machineTechniciansUpdateSchema } = await import("@apix/shared");
      const parsed = machineTechniciansUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Некорректные данные", details: parsed.error.flatten() });
      }

      const [m] = await db
        .select({ number: machines.number })
        .from(machines)
        .where(and(eq(machines.number, machineNumber), isNull(machines.deletedAt)))
        .limit(1);
      if (!m) return reply.status(404).send({ error: "Аппарат не найден" });

      // Удаляем все старые привязки
      await db.delete(machineTechnicians).where(eq(machineTechnicians.machineNumber, machineNumber));
      // Добавляем новые
      if (parsed.data.staffIds.length > 0) {
        await db.insert(machineTechnicians).values(
          parsed.data.staffIds.map((sid) => ({ machineNumber, staffId: sid })),
        );
      }
      return reply.send({ ok: true });
    },
  );

  // PUT /api/machines/:number/routes — замена списка маршрутов
  app.put(
    "/api/machines/:number/routes",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);
      const { machineRoutesUpdateSchema } = await import("@apix/shared");
      const parsed = machineRoutesUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Некорректные данные", details: parsed.error.flatten() });
      }

      const [m] = await db
        .select({ number: machines.number })
        .from(machines)
        .where(and(eq(machines.number, machineNumber), isNull(machines.deletedAt)))
        .limit(1);
      if (!m) return reply.status(404).send({ error: "Аппарат не найден" });

      // Удаляем все старые привязки
      await db.delete(machineRoutesTable).where(eq(machineRoutesTable.machineNumber, machineNumber));
      // Добавляем новые
      if (parsed.data.routeIds.length > 0) {
        await db.insert(machineRoutesTable).values(
          parsed.data.routeIds.map((rid) => ({ machineNumber, routeId: rid })),
        );
      }
      return reply.send({ ok: true });
    },
  );

  // PUT /api/machines/:number/toys — замена списка игрушек аппарата
  app.put(
    "/api/machines/:number/toys",
    { preValidation: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const machineNumber = parseInt((request.params as { number: string }).number, 10);
      const { machineToysUpdateSchema } = await import("@apix/shared");
      const parsed = machineToysUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Некорректные данные", details: parsed.error.flatten() });
      }

      const [m] = await db
        .select({ typeId: machines.typeId })
        .from(machines)
        .where(and(eq(machines.number, machineNumber), isNull(machines.deletedAt)))
        .limit(1);
      if (!m) return reply.status(404).send({ error: "Аппарат не найден" });

      const selectedIds = new Set(parsed.data.toyIds);

      // Проверить, что все переданные toyIds существуют в таблице toys
      if (selectedIds.size > 0) {
        const existingToys = await db
          .select({ id: toys.id })
          .from(toys)
          .where(sql`${toys.id} IN ${[...selectedIds]}`);
        const existingIds = new Set(existingToys.map((t) => t.id));
        const missingIds = [...selectedIds].filter((id) => !existingIds.has(id));
        if (missingIds.length > 0) {
          return reply.status(400).send({
            error: "Некоторые игрушки не найдены в справочнике",
            missingIds,
          });
        }
      }

      // Базовый набор игрушек для типа аппарата
      const baseToyRows = await db
        .select({ id: machineTypeToys.toyId })
        .from(machineTypeToys)
        .where(eq(machineTypeToys.machineTypeId, m.typeId as unknown as number));
      const baseIds = new Set(baseToyRows.map((r) => r.id));

      // Удалить все старые правки
      await db.delete(machineToys).where(eq(machineToys.machineNumber, machineNumber));

      // Для игрушек, которых нет в базе, но они выбраны → add
      // Для базовых игрушек, которых нет среди выбранных → remove
      const inserts: Array<{ machineNumber: number; toyId: number; action: "add" | "remove" }> = [];
      for (const id of selectedIds) {
        if (!baseIds.has(id)) {
          inserts.push({ machineNumber, toyId: id, action: "add" });
        }
      }
      for (const id of baseIds) {
        if (!selectedIds.has(id)) {
          inserts.push({ machineNumber, toyId: id, action: "remove" });
        }
      }

      if (inserts.length > 0) {
        await db.insert(machineToys).values(inserts);
      }

      return reply.send({ ok: true });
    },
  );
}
