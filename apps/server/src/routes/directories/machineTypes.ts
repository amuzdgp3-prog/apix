import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { machineTypes, machineTypeToys, toys } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import {
  machineTypeCreateSchema,
  machineTypeUpdateSchema,
} from "@apix/shared";

export async function registerMachineTypeRoutes(fastify: FastifyInstance) {
  // ==========================================
  // CRUD типов машин
  // ==========================================

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

  // ==========================================
  // Управление базовым набором игрушек типа
  // ==========================================

  // Получить игрушки, привязанные к типу
  fastify.get(
    "/api/machine-types/:id/toys",
    async (req, reply) => {
      const typeId = Number((req.params as any).id);
      if (isNaN(typeId)) {
        return reply.status(400).send({ error: "Некорректный id" });
      }

      const rows = await db
        .select({
          id: toys.id,
          name: toys.name,
          price: toys.price,
        })
        .from(machineTypeToys)
        .innerJoin(toys, eq(machineTypeToys.toyId, toys.id))
        .where(eq(machineTypeToys.machineTypeId, typeId))
        .orderBy(toys.name);

      return reply.send(rows);
    },
  );

  // Добавить игрушку в базовый набор типа
  fastify.post(
    "/api/machine-types/:id/toys",
    async (req, reply) => {
      const typeId = Number((req.params as any).id);
      if (isNaN(typeId)) {
        return reply.status(400).send({ error: "Некорректный id типа" });
      }

      const body = req.body as { toyId?: number };
      const toyId = Number(body?.toyId);
      if (!toyId || isNaN(toyId)) {
        return reply.status(400).send({ error: "Некорректный toyId" });
      }

      // Проверить, что тип существует
      const [typeExists] = await db
        .select({ id: machineTypes.id })
        .from(machineTypes)
        .where(eq(machineTypes.id, typeId))
        .limit(1);
      if (!typeExists) {
        return reply.status(404).send({ error: "Тип аппарата не найден" });
      }

      // Проверить, что игрушка существует
      const [toyExists] = await db
        .select({ id: toys.id })
        .from(toys)
        .where(eq(toys.id, toyId))
        .limit(1);
      if (!toyExists) {
        return reply.status(404).send({ error: "Игрушка не найдена" });
      }

      // Проверить, что связь ещё не существует
      const [existing] = await db
        .select({ toyId: machineTypeToys.toyId })
        .from(machineTypeToys)
        .where(
          and(
            eq(machineTypeToys.machineTypeId, typeId),
            eq(machineTypeToys.toyId, toyId),
          ),
        )
        .limit(1);
      if (existing) {
        return reply
          .status(409)
          .send({ error: "Игрушка уже привязана к типу" });
      }

      const [created] = await db
        .insert(machineTypeToys)
        .values({ machineTypeId: typeId, toyId })
        .returning();
      return reply.status(201).send(created);
    },
  );

  // Удалить игрушку из базового набора типа
  fastify.delete(
    "/api/machine-types/:typeId/toys/:toyId",
    async (req, reply) => {
      const typeId = Number((req.params as any).typeId);
      const toyId = Number((req.params as any).toyId);
      if (isNaN(typeId) || isNaN(toyId)) {
        return reply.status(400).send({ error: "Некорректные параметры" });
      }

      const [deleted] = await db
        .delete(machineTypeToys)
        .where(
          and(
            eq(machineTypeToys.machineTypeId, typeId),
            eq(machineTypeToys.toyId, toyId),
          ),
        )
        .returning({ machineTypeId: machineTypeToys.machineTypeId });
      if (!deleted) {
        return reply.status(404).send({ error: "Связь не найдена" });
      }
      return reply.send({ success: true });
    },
  );
}