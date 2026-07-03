import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { toys } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  toyCreateSchema,
  toyUpdateSchema,
} from "@apix/shared";

export async function registerToyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/toys", async (_req, reply) => {
    const rows = await db.select().from(toys).orderBy(toys.name);
    return reply.send(rows);
  });

  fastify.post("/api/toys", async (req, reply) => {
    const parsed = toyCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await db
      .select({ id: toys.id })
      .from(toys)
      .where(eq(toys.name, data.name))
      .limit(1);
    if (existing.length > 0) {
      return reply
        .status(409)
        .send({ error: "Игрушка с таким названием уже существует" });
    }

    const [created] = await db
      .insert(toys)
      .values({
        name: data.name,
        price: String(data.price),
      })
      .returning();
    return reply.status(201).send(created);
  });

  fastify.put("/api/toys/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const parsed = toyUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.name) {
      const existing = await db
        .select({ id: toys.id })
        .from(toys)
        .where(eq(toys.name, data.name))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return reply
          .status(409)
          .send({ error: "Игрушка с таким названием уже существует" });
      }
    }

    const setData: Record<string, any> = {};
    if (data.name !== undefined) setData.name = data.name;
    if (data.price !== undefined) setData.price = String(data.price);

    const [updated] = await db
      .update(toys)
      .set(setData)
      .where(eq(toys.id, id))
      .returning();
    if (!updated) {
      return reply.status(404).send({ error: "Игрушка не найдена" });
    }
    return reply.send(updated);
  });

  fastify.delete("/api/toys/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const [deleted] = await db
      .delete(toys)
      .where(eq(toys.id, id))
      .returning({ id: toys.id });
    if (!deleted) {
      return reply.status(404).send({ error: "Игрушка не найдена" });
    }
    return reply.send({ success: true });
  });
}