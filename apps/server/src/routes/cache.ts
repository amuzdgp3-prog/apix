import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, isNull, desc, and, sql, lt, max, gte, inArray } from "drizzle-orm";
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
import { authenticate } from "../plugins/auth.js";

const tags = ["Cache"];

export async function cacheRoutes(app: FastifyInstance) {
  /** GET /api/cache/machines */
  app.get(
    "/api/cache/machines",
    {
      preValidation: [authenticate],
      schema: {
        response: {
          200: zSchema(
            z.strictObject({
              data: z.array(
                z.strictObject({
                  number: z.number().int().positive(),
                  locationName: z.string(),
                  typeName: z.string(),
                  status: z.string(),
                  pricePerGame: z.number(),
                  lastServiceDate: z.string().nullable(),
                }),
              ),
            }),
          ),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;

      // Build WHERE conditions
      const conditions = [
        eq(machines.status, "active"),
        isNull(machines.deletedAt),
        isNull(machinePlacements.endedAt),
      ];

      // Filter by city: find all location descendants of the user's city
      if (user.cityId != null) {
        const cityRows = await db.execute<{ id: number }>(sql`
          WITH RECURSIVE city_locations AS (
            SELECT id FROM ${locations} WHERE id = ${user.cityId}
            UNION ALL
            SELECT l.id FROM ${locations} l
            INNER JOIN city_locations cl ON l.parent_id = cl.id
          )
          SELECT id FROM city_locations
        `);
        const cityLocationIds = (cityRows as unknown as any[]).map((r: any) => r.id);
        if (cityLocationIds.length > 0) {
          conditions.push(inArray(machines.locationId, cityLocationIds));
        }
      }

      const rows = await db
        .select({
          number: machines.number,
          locationName: locations.name,
          typeName: machineTypes.name,
          status: machines.status,
          pricePerGame: machines.pricePerGame,
          lastServiceDate: max(service.serviceDate).as("last_service_date"),
        })
        .from(machines)
        .innerJoin(locations, eq(machines.locationId, locations.id))
        .innerJoin(machineTypes, eq(machines.typeId, machineTypes.id))
        .innerJoin(machinePlacements, eq(machines.number, machinePlacements.machineNumber))
        .leftJoin(service, eq(machinePlacements.id, service.placementId))
        .where(and(...conditions))
        .groupBy(machines.number, locations.name, machineTypes.name, machines.status, machines.pricePerGame);

      return {
        data: rows.map((r) => ({
          number: r.number,
          locationName: r.locationName,
          typeName: r.typeName,
          status: r.status,
          pricePerGame: Number(r.pricePerGame),
          lastServiceDate: r.lastServiceDate ?? null,
        })),
      };
    },
  );

  /** GET /api/cache/forgotten */
  app.get(
    "/api/cache/forgotten",
    {
      preValidation: [authenticate],
      schema: {
        response: {
          200: zSchema(
            z.strictObject({
              data: z.array(
                z.strictObject({
                  number: z.number().int().positive(),
                  locationName: z.string(),
                  lastServiceDate: z.string().nullable(),
                  daysSinceLastService: z.number().int().positive().nullable(),
                  maxServiceDays: z.number().int().positive().nullable(),
                }),
              ),
            }),
          ),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;

      // Find machines that haven't been serviced within their max_service_days
      // Optionally filter by city
      const cityCTE = user.cityId != null
        ? sql`city_locations AS (
            SELECT id FROM locations WHERE id = ${user.cityId}
            UNION ALL
            SELECT l.id FROM locations l
            INNER JOIN city_locations cl ON l.parent_id = cl.id
          ),`
        : sql``;

      const cityJoinCondition = user.cityId != null
        ? sql`AND m.location_id IN (SELECT id FROM city_locations)`
        : sql``;

      const rows = await db.execute(sql`
        WITH RECURSIVE ${cityCTE}
        latest_service AS (
          SELECT DISTINCT ON (mp.machine_number)
            mp.machine_number,
            s.service_date,
            s.created_at
          FROM machine_placements mp
          LEFT JOIN service s ON s.placement_id = mp.id
          WHERE mp.ended_at IS NULL
          ORDER BY mp.machine_number, s.service_date DESC NULLS LAST
        ),
        machine_data AS (
          SELECT
            m.number,
            loc.name AS location_name,
            COALESCE(m.max_service_days, 60) AS max_service_days,
            ls.service_date AS last_service_date,
            CURRENT_DATE - ls.service_date::date AS days_since_last_service
          FROM machines m
          JOIN locations loc ON loc.id = m.location_id
          JOIN latest_service ls ON ls.machine_number = m.number
          WHERE m.status = 'active' AND m.deleted_at IS NULL
            ${cityJoinCondition}
        )
        SELECT * FROM machine_data
        WHERE last_service_date IS NULL
           OR days_since_last_service > max_service_days
        ORDER BY days_since_last_service DESC NULLS FIRST
      `);

      const data = (rows as unknown as any[]).map((r: any) => ({
        number: r.number,
        locationName: r.location_name,
        lastServiceDate: r.last_service_date ?? null,
        daysSinceLastService: r.days_since_last_service != null ? Number(r.days_since_last_service) : null,
        maxServiceDays: Number(r.max_service_days),
      }));

      return { data };
    },
  );

  /** GET /api/cache/directories — все справочники одним запросом для прогрева кэша */
  app.get(
    "/api/cache/directories",
    {
      preValidation: [authenticate],
      schema: {
        response: {
          200: zSchema(
            z.strictObject({
              locations: z.array(
                z.strictObject({
                  id: z.number().int().positive(),
                  name: z.string(),
                  parentId: z.number().int().positive().nullable(),
                  nodeType: z.string().nullable(),
                  minServiceDays: z.number().int().positive().nullable(),
                  maxServiceDays: z.number().int().positive().nullable(),
                  createdAt: z.string(),
                }),
              ),
              machineTypes: z.array(
                z.strictObject({
                  id: z.number().int().positive(),
                  name: z.string(),
                  createdAt: z.string(),
                }),
              ),
              toys: z.array(
                z.strictObject({
                  id: z.number().int().positive(),
                  name: z.string(),
                  price: z.number(),
                  createdAt: z.string(),
                }),
              ),
              staff: z.array(
                z.strictObject({
                  id: z.number().int().positive(),
                  email: z.string(),
                  fullName: z.string(),
                  role: z.string(),
                  cityId: z.number().int().positive().nullable(),
                  isActive: z.boolean(),
                  createdAt: z.string(),
                }),
              ),
            }),
          ),
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [locRows, mtRows, toyRows, staffRows] = await Promise.all([
        db.select().from(locations),
        db.select().from(machineTypes),
        db.select().from(toys),
        db.select({
          id: staff.id,
          email: staff.email,
          fullName: staff.fullName,
          role: staff.role,
          cityId: staff.cityId,
          isActive: staff.isActive,
          createdAt: staff.createdAt,
        }).from(staff),
      ]);

      return {
        locations: locRows.map((r) => ({
          id: r.id,
          name: r.name,
          parentId: r.parentId,
          nodeType: r.nodeType,
          minServiceDays: r.minServiceDays,
          maxServiceDays: r.maxServiceDays,
          createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
        machineTypes: mtRows.map((r) => ({
          id: r.id,
          name: r.name,
          createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
        toys: toyRows.map((r) => ({
          id: r.id,
          name: r.name,
          price: Number(r.price),
          createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
        staff: staffRows.map((r) => ({
          id: r.id,
          email: r.email,
          fullName: r.fullName,
          role: r.role,
          cityId: r.cityId,
          isActive: r.isActive,
          createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
        })),
      };
    },
  );
}
