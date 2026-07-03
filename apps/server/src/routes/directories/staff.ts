import { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { staff } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  staffCreateSchema,
  staffUpdateSchema,
} from "@apix/shared";

export async function registerStaffRoutes(fastify: FastifyInstance) {
  fastify.get("/api/staff", async (_req, reply) => {
    const rows = await db
      .select({
        id: staff.id,
        email: staff.email,
        fullName: staff.fullName,
        role: staff.role,
        cityId: staff.cityId,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      })
      .from(staff)
      .orderBy(staff.fullName);
    return reply.send(rows.map((r) => ({ ...r, password: "" })));
  });

  fastify.post("/api/staff", async (req, reply) => {
    const parsed = staffCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.email, data.email))
      .limit(1);
    if (existing.length > 0) {
      return reply
        .status(409)
        .send({ error: "Сотрудник с таким email уже существует" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const [created] = await db
      .insert(staff)
      .values({
        email: data.email,
        fullName: data.fullName,
        password: passwordHash,
        role: data.role,
        cityId: data.cityId ?? null,
      })
      .returning();
    const { password: _, ...safe } = created;
    return reply.status(201).send(safe);
  });

  fastify.put("/api/staff/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const parsed = staffUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.email) {
      const existing = await db
        .select({ id: staff.id })
        .from(staff)
        .where(eq(staff.email, data.email))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return reply
          .status(409)
          .send({ error: "Сотрудник с таким email уже существует" });
      }
    }

    const setData: Record<string, any> = {};
    if (data.email !== undefined) setData.email = data.email;
    if (data.fullName !== undefined) setData.fullName = data.fullName;
    if (data.role !== undefined) setData.role = data.role;
    if (data.cityId !== undefined) setData.cityId = data.cityId;
    if (data.isActive !== undefined) setData.isActive = data.isActive;

    const [updated] = await db
      .update(staff)
      .set(setData)
      .where(eq(staff.id, id))
      .returning();
    if (!updated) {
      return reply.status(404).send({ error: "Сотрудник не найден" });
    }
    const { password: _, ...safe } = updated;
    return reply.send(safe);
  });

  fastify.delete("/api/staff/:id", async (req, reply) => {
    const id = Number((req.params as any).id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: "Некорректный id" });
    }
    const [deleted] = await db
      .delete(staff)
      .where(eq(staff.id, id))
      .returning({ id: staff.id });
    if (!deleted) {
      return reply.status(404).send({ error: "Сотрудник не найден" });
    }
    return reply.send({ success: true });
  });
}