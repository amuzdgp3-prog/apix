
import { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { z } from "zod";
import { zSchema } from "../utils/zod-json-schema.js";
import { db } from "../db/index.js";
import { service, toyDistribution } from "../db/schema/services.js";
import { machinePlacements } from "../db/schema/placements.js";
import { machines, machineRoutes } from "../db/schema/machines.js";
import { staff } from "../db/schema/staff.js";
import { locations } from "../db/schema/locations.js";
import { toys } from "../db/schema/toys.js";
import { recalcChain } from "../services/chainRecalc.js";
import { authenticate } from "../plugins/auth.js";

/**
 * Service routes --- раздел ТЗ 13.5: Обслуживания (admin).
 *
 * GET    /api/services              — список обслуживаний с фильтрами
 * GET    /api/services/:id          — детальная информация об обслуживании
 * DELETE /api/services/:id          — удаление обслуживания (только admin)
 * GET    /api/services/:id/photos/:type — получение фото обслуживания
 */

export async function serviceRoutes(app: FastifyInstance) {
  /**
   * GET /api/services
   * ТЗ 13.6.1: Список обслуживаний с пагинацией и фильтрами.
   */
  app.get(
    "/api/services",
    {
      schema: {
        querystring: zSchema(
          z.strictObject({
            page: z.string().optional(),
            limit: z.string().optional(),
            machineNumber: z.string().optional(),
            staffId: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            city: z.string().optional(),
            routeId: z.string().optional(),
            isOperational: z.string().optional(),
          }),
        ),
        response: {
          200: zSchema(
            z.strictObject({
              data: z.array(
                z.strictObject({
                  id: z.number().int().positive(),
                  staffId: z.number().int().positive().nullable(),
                  staffName: z.string().nullable(),
                  placementId: z.number().int().positive(),
                  machineNumber: z.number().int().positive().nullable(),
                  locationName: z.string(),
                  serviceDate: z.string(),
                  serviceTime: z.string().nullable(),
                  revenue: z.number().nullable(),
                  costOfToys: z.number().nullable(),
                  roi: z.number().nullable(),
                  periodDays: z.number().int().nullable(),
                  gameCounter: z.number().int().nullable(),
                  isOperational: z.boolean(),
                  comment: z.string().nullable(),
                  createdAt: z.string(),
                }),
              ),
              total: z.number().int().min(0),
              page: z.number().int().positive(),
              limit: z.number().int().positive(),
            }),
          ),
        },
      },
    },
    async (request: FastifyRequest) => {
      const {
        page: pageStr,
        limit: limitStr,
        machineNumber,
        staffId,
        dateFrom,
        dateTo,
        city,
        routeId,
        isOperational,
      } = request.query as {
        page?: string;
        limit?: string;
        machineNumber?: string;
        staffId?: string;
        dateFrom?: string;
        dateTo?: string;
        city?: string;
        routeId?: string;
        isOperational?: string;
      };

      const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? "20", 10) || 20));

      // Build base query with always-required joins
      const baseQuery = db
        .select({
          id: service.id,
          staffId: service.staffId,
          staffName: staff.fullName,
          placementId: service.placementId,
          machineNumber: machines.number,
          locationName: locations.name,
          serviceDate: service.serviceDate,
          serviceTime: service.serviceTime,
          revenue: service.revenue,
          costOfToys: service.costOfToys,
          roi: service.roi,
          periodDays: service.periodDays,
          gameCounter: service.gameCounter,
          isOperational: service.isOperational,
          comment: service.comment,
          createdAt: service.createdAt,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(machines, eq(machinePlacements.machineNumber, machines.number))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .leftJoin(staff, eq(service.staffId, staff.id));

      // Build conditions as SQL chunks
      const condFragments: ReturnType<typeof and>[] = [];
      if (machineNumber) {
        condFragments.push(eq(machinePlacements.machineNumber, parseInt(machineNumber, 10)));
      }
      if (staffId) {
        condFragments.push(eq(service.staffId, parseInt(staffId, 10)));
      }
      if (dateFrom) {
        condFragments.push(gte(service.serviceDate, dateFrom));
      }
      if (dateTo) {
        condFragments.push(lte(service.serviceDate, dateTo));
      }
      if (city) {
        condFragments.push(and(eq(locations.nodeType, "city"), eq(locations.name, city)));
      }
      if (isOperational !== undefined && isOperational !== "") {
        condFragments.push(eq(service.isOperational, isOperational === "true"));
      }

      const routeSQL = routeId
        ? sql`EXISTS (
            SELECT 1 FROM ${machineRoutes}
            WHERE ${machineRoutes.machineNumber} = ${machines.number}
            AND ${machineRoutes.routeId} = ${parseInt(routeId, 10)}
          )`
        : undefined;

      // Build WHERE clause
      const whereClause =
        condFragments.length > 0 && routeSQL
          ? and(...condFragments, routeSQL)
          : condFragments.length > 0
            ? and(...condFragments)
            : routeSQL;

      // Apply WHERE to base query
      const filteredQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;

      // Count total
      const [totalRow] = await db
        .select({ cnt: count() })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(machines, eq(machinePlacements.machineNumber, machines.number))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .leftJoin(staff, eq(service.staffId, staff.id))
        .where(whereClause ?? sql`TRUE`);
      const total = totalRow?.cnt ?? 0;

      // Fetch rows with pagination
      const rows = await filteredQuery
        .orderBy(desc(service.serviceDate), desc(service.id))
        .limit(limit)
        .offset((page - 1) * limit);

      const data = rows.map((r) => ({
        id: r.id,
        staffId: r.staffId,
        staffName: r.staffName ?? null,
        placementId: r.placementId,
        machineNumber: r.machineNumber,
        locationName: r.locationName,
        serviceDate: String(r.serviceDate),
        serviceTime: r.serviceTime ? String(r.serviceTime) : null,
        revenue: r.revenue ? Number(r.revenue) : null,
        costOfToys: r.costOfToys ? Number(r.costOfToys) : null,
        roi: r.roi ? Number(r.roi) : null,
        periodDays: r.periodDays,
        gameCounter: r.gameCounter,
        isOperational: r.isOperational,
        comment: r.comment,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));

      return { data, total, page, limit };
    },
  );

  /**
   * GET /api/services/:id
   * ТЗ 13.6.2: Детальная информация об обслуживании, включая toy_distribution.
   */
  app.get(
    "/api/services/:id",
    {
      schema: {
        params: zSchema(z.strictObject({ id: z.string() })),
        response: {
          200: zSchema(
            z.strictObject({
              id: z.number().int().positive(),
              staffId: z.number().int().positive().nullable(),
              staffName: z.string().nullable(),
              placementId: z.number().int().positive(),
              machineNumber: z.number().int().positive().nullable(),
              locationName: z.string(),
              serviceDate: z.string(),
              serviceTime: z.string().nullable(),
              revenue: z.number().nullable(),
              costOfToys: z.number().nullable(),
              roi: z.number().nullable(),
              periodDays: z.number().int().nullable(),
              gameCounter: z.number().int().nullable(),
              isOperational: z.boolean(),
              comment: z.string().nullable(),
              createdAt: z.string(),
              toys: z
                .array(
                  z.strictObject({
                    toyId: z.number().int().positive(),
                    toyName: z.string(),
                    quantity: z.number().int().positive(),
                    price: z.number(),
                  }),
                )
                .optional(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const serviceId = parseInt((request.params as { id: string }).id, 10);

      const [row] = await db
        .select({
          id: service.id,
          staffId: service.staffId,
          staffName: staff.fullName,
          placementId: service.placementId,
          machineNumber: machines.number,
          locationName: locations.name,
          serviceDate: service.serviceDate,
          serviceTime: service.serviceTime,
          revenue: service.revenue,
          costOfToys: service.costOfToys,
          roi: service.roi,
          periodDays: service.periodDays,
          gameCounter: service.gameCounter,
          isOperational: service.isOperational,
          comment: service.comment,
          createdAt: service.createdAt,
        })
        .from(service)
        .innerJoin(machinePlacements, eq(service.placementId, machinePlacements.id))
        .innerJoin(machines, eq(machinePlacements.machineNumber, machines.number))
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .leftJoin(staff, eq(service.staffId, staff.id))
        .where(eq(service.id, serviceId));

      if (!row) return reply.status(404).send({ error: "Not found" });

      const toyRows = await db
        .select({
          toyId: toyDistribution.toyId,
          toyName: toys.name,
          quantity: toyDistribution.quantity,
          price: toyDistribution.priceSnapshot,
        })
        .from(toyDistribution)
        .innerJoin(toys, eq(toyDistribution.toyId, toys.id))
        .where(eq(toyDistribution.serviceId, serviceId));

      return {
        id: row.id,
        staffId: row.staffId,
        staffName: row.staffName ?? null,
        placementId: row.placementId,
        machineNumber: row.machineNumber,
        locationName: row.locationName,
        serviceDate: String(row.serviceDate),
        serviceTime: row.serviceTime ? String(row.serviceTime) : null,
        revenue: row.revenue ? Number(row.revenue) : null,
        costOfToys: row.costOfToys ? Number(row.costOfToys) : null,
        roi: row.roi ? Number(row.roi) : null,
        periodDays: row.periodDays,
        gameCounter: row.gameCounter,
        isOperational: row.isOperational,
        comment: row.comment,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        toys: toyRows.map((t) => ({
          toyId: t.toyId,
          toyName: t.toyName,
          quantity: t.quantity,
          price: Number(t.price),
        })),
      };
    },
  );

  /**
   * DELETE /api/services/:id
   * ТЗ 13.6.3: Удаление обслуживания (только admin).
   * При удалении пересчитывается цепочка (предыдущее обслуживание gets updated).
   */
  app.delete(
    "/api/services/:id",
    {
      preValidation: [authenticate],
      schema: {
        params: zSchema(z.strictObject({ id: z.string() })),
        response: {
          200: zSchema(z.strictObject({ success: z.literal(true) })),
        },
      },
    },
    async (request, reply) => {
      if (request.user.role !== "admin") {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const serviceId = parseInt((request.params as { id: string }).id, 10);

      const [existing] = await db
        .select({
          placementId: service.placementId,
          serviceDate: service.serviceDate,
        })
        .from(service)
        .where(eq(service.id, serviceId));

      if (!existing) return reply.status(404).send({ error: "Not found" });

      // Delete service (toy_distribution cascades via FK ON DELETE CASCADE)
      await db.delete(service).where(eq(service.id, serviceId));

      // Recalculate chain for affected placement starting from this service date
      await recalcChain(db, existing.placementId, existing.serviceDate);

      return { success: true as const };
    },
  );

  /**
   * GET /api/services/:id/photos/:type
   * ТЗ 13.6.4: Получение фото обслуживания из MinIO.
   * :type — counter, before, after
   */
  app.get(
    "/api/services/:id/photos/:type",
    {
      schema: {
        params: zSchema(
          z.strictObject({
            id: z.string(),
            type: z.enum(["counter", "before", "after"]),
          }),
        ),
        response: {
          200: zSchema(
            z.strictObject({
              url: z.string().url(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const serviceId = parseInt((request.params as { id: string }).id, 10);
      const type = (request.params as { type: string }).type;

      const columnMap: Record<string, "photoCounterUrl" | "photoBeforeUrl" | "photoAfterUrl"> = {
        counter: "photoCounterUrl",
        before: "photoBeforeUrl",
        after: "photoAfterUrl",
      };
      const dbColumn = columnMap[type];

      const [row] = await db
        .select({
          photoCounterUrl: service.photoCounterUrl,
          photoBeforeUrl: service.photoBeforeUrl,
          photoAfterUrl: service.photoAfterUrl,
        })
        .from(service)
        .where(eq(service.id, serviceId));

      if (!row) return reply.status(404).send({ error: "Service not found" });

      const photoPath = row[dbColumn];
      if (!photoPath) return reply.status(404).send({ error: "Photo not found" });

      const minioClient = app.minio;
      if (!minioClient) {
        return reply.status(503).send({ error: "MinIO not available" });
      }

      try {
        // photoPath format: "/bucket/objectName"
        const parts = photoPath.replace(/^\//, "").split("/");
        const bucket = parts[0];
        const objectName = parts.slice(1).join("/");

        const presignedUrl = await minioClient.presignedUrl("GET", bucket, objectName, 60 * 60); // 1 hour expiry
        return { url: presignedUrl };
      } catch (err: any) {
        request.log.error(err, "Failed to generate presigned URL");
        return reply.status(500).send({ error: "Failed to generate photo URL" });
      }
    },
  );
}