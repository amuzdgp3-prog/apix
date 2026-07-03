import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { machineTypes } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  machineTypeCreateSchema,
  machineTypeUpdateSchema,
} from "@apix/shared";

export async function registerMachineTypeRoutes(fastify: FastifyInstance) {
  fastify.get("/api/machine-types", async (_req, reply) => {
    const rows = await db
      .select()
      .from(machineTypes)
      .orderBy(machineTypes.name);
    return reply.send(rows);
  });

  fastify.post("/api/machine-types", async (req, reply) => {
    const parsed = machineTypeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await db
      .select({ id: machineTypes.id })
      .from(machineTypes)
      .where(eq(machineTypes.name, data.name))
      .limit(1);
    if (existing.length > 0) {
      return reply
        .status(409)
        .send({ error: "Тип аппарата с таким названием уже существует" });
    }

    const [created] = await db
      .insert(machineTypes)
      .values({ name: data.name })
      .returning();
    return reply.status(201).send(created);
  });

  fastify.put("/api/machine-types/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const parsed = machineTypeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.name) {
      const existing = await db
        .select({ id: machineTypes.id })
        .from(machineTypes)
        .where(eq(machineTypes.name, data.name))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return reply
          .status(409)
          .send({ error: "Тип аппарата с таким названием уже существует" });
      }
    }

    const [updated] = await db
      .update(machineTypes)
      .set({ name: data.name })
      .where(eq(machineTypes.id, id))
      .returning();
    if (!updated) {
      return reply.status(404).send({ error: "Тип аппарата не найден" });
    }
    return reply.send(updated);
  });

  fastify.delete("/api/machine-types/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const [deleted] = await db
      .delete(machineTypes)
      .where(eq(machineTypes.id, id))
      .returning({ id: machineTypes.id });
    if (!deleted) {
      return reply.status(404).send({ error: "Тип аппарата не найден" });
    }
    return reply.send({ success: true });
  });
}