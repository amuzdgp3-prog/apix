import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { locations } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  locationCreateSchema,
  locationUpdateSchema,
} from "@apix/shared";

export async function registerLocationRoutes(fastify: FastifyInstance) {
  fastify.get("/api/locations", async (_req, reply) => {
    const rows = await db.select().from(locations).orderBy(locations.name);
    return reply.send(rows);
  });

  fastify.post("/api/locations", async (req, reply) => {
    const parsed = locationCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.name, data.name))
      .limit(1);
    if (existing.length > 0) {
      return reply
        .status(409)
        .send({ error: "Точка с таким названием уже существует" });
    }

    const [created] = await db
      .insert(locations)
      .values({
        name: data.name,
        parentId: data.parentId ?? null,
        nodeType: data.nodeType ?? null,
        minServiceDays: data.minServiceDays ?? null,
        maxServiceDays: data.maxServiceDays ?? null,
      })
      .returning();
    return reply.status(201).send(created);
  });

  fastify.put("/api/locations/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }

    const parsed = locationUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.name) {
      const existing = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.name, data.name))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return reply
          .status(409)
          .send({ error: "Точка с таким названием уже существует" });
      }
    }

    const [updated] = await db
      .update(locations)
      .set({
        name: data.name,
        parentId: data.parentId,
        nodeType: data.nodeType,
        minServiceDays: data.minServiceDays,
        maxServiceDays: data.maxServiceDays,
      })
      .where(eq(locations.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Точка не найдена" });
    }
    return reply.send(updated);
  });

  fastify.delete("/api/locations/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const [deleted] = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning({ id: locations.id });
    if (!deleted) {
      return reply.status(404).send({ error: "Точка не найдена" });
    }
    return reply.send({ success: true });
  });
}