import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { routes, routeLocations, locations } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import {
  routeCreateSchema,
  routeUpdateSchema,
} from "@apix/shared";

export async function registerRouteRoutes(fastify: FastifyInstance) {
  // =============================================
  // ROUTES CRUD
  // =============================================
  fastify.get("/api/routes", async (_req, reply) => {
    const rows = await db.select().from(routes).orderBy(routes.name);
    return reply.send(rows);
  });

  fastify.post("/api/routes", async (req, reply) => {
    const parsed = routeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await db
      .select({ id: routes.id })
      .from(routes)
      .where(eq(routes.name, data.name))
      .limit(1);
    if (existing.length > 0) {
      return reply
        .status(409)
        .send({ error: "Маршрут с таким названием уже существует" });
    }

    const [created] = await db
      .insert(routes)
      .values({
        name: data.name,
        description: data.description ?? null,
        minServiceDays: data.minServiceDays ?? null,
        maxServiceDays: data.maxServiceDays ?? null,
      })
      .returning();
    return reply.status(201).send(created);
  });

  fastify.put("/api/routes/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }

    const parsed = routeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.name) {
      const existing = await db
        .select({ id: routes.id })
        .from(routes)
        .where(eq(routes.name, data.name))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return reply
          .status(409)
          .send({ error: "Маршрут с таким названием уже существует" });
      }
    }

    const [updated] = await db
      .update(routes)
      .set({
        name: data.name,
        description: data.description,
        minServiceDays: data.minServiceDays,
        maxServiceDays: data.maxServiceDays,
      })
      .where(eq(routes.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Маршрут не найден" });
    }
    return reply.send(updated);
  });

  fastify.delete("/api/routes/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const [deleted] = await db
      .delete(routes)
      .where(eq(routes.id, id))
      .returning({ id: routes.id });
    if (!deleted) {
      return reply.status(404).send({ error: "Маршрут не найден" });
    }
    return reply.send({ success: true });
  });

  // =============================================
  // ROUTE LOCATIONS
  // =============================================
  fastify.get("/api/routes/:routeId/locations", async (req, reply) => {
    const routeId = Number((req.params as any).routeId);
    if (isNaN(routeId)) {
      return reply.status(400).send({ error: "Некорректный routeId" });
    }
    const rows = await db
      .select({
        routeId: routeLocations.routeId,
        locationId: routeLocations.locationId,
        sortOrder: routeLocations.sortOrder,
        locationName: locations.name,
      })
      .from(routeLocations)
      .leftJoin(locations, eq(routeLocations.locationId, locations.id))
      .where(eq(routeLocations.routeId, routeId))
      .orderBy(routeLocations.sortOrder);
    return reply.send(rows);
  });

  fastify.post("/api/routes/:routeId/locations", async (req, reply) => {
    const routeId = Number((req.params as any).routeId);
    if (isNaN(routeId)) {
      return reply.status(400).send({ error: "Некорректный routeId" });
    }
    const { locationId, sortOrder } = req.body as any;
    if (!Number.isFinite(locationId)) {
      return reply.status(400).send({ error: "locationId обязателен" });
    }
    const [created] = await db
      .insert(routeLocations)
      .values({
        routeId,
        locationId: Number(locationId),
        sortOrder: Number(sortOrder) || 0,
      })
      .returning();
    return reply.status(201).send(created);
  });

  fastify.put("/api/routes/:routeId/locations/:locationId", async (req, reply) => {
    const routeId = Number((req.params as any).routeId);
    const locationId = Number((req.params as any).locationId);
    if (isNaN(routeId) || isNaN(locationId)) {
      return reply.status(400).send({ error: "Некорректные параметры" });
    }
    const { sortOrder } = req.body as any;
    const [updated] = await db
      .update(routeLocations)
      .set({ sortOrder: Number(sortOrder) || 0 })
      .where(
        and(
          eq(routeLocations.routeId, routeId),
          eq(routeLocations.locationId, locationId)
        )
      )
      .returning();
    if (!updated) {
      return reply.status(404).send({ error: "Запись не найдена" });
    }
    return reply.send(updated);
  });

  fastify.delete(
    "/api/routes/:routeId/locations/:locationId",
    async (req, reply) => {
      const routeId = Number((req.params as any).routeId);
      const locationId = Number((req.params as any).locationId);
      if (isNaN(routeId) || isNaN(locationId)) {
        return reply.status(400).send({ error: "Некорректные параметры" });
      }
      await db
        .delete(routeLocations)
        .where(
          and(
            eq(routeLocations.routeId, routeId),
            eq(routeLocations.locationId, locationId)
          )
        );
      return reply.send({ success: true });
    }
  );
}