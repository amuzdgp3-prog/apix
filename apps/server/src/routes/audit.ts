import { FastifyInstance, FastifyRequest } from "fastify";
import { auditLogSchema } from "@apix/shared";
import { z } from "zod";
import { and, eq, gte, like, lte, desc, count } from "drizzle-orm";
import { zSchema } from "../utils/zod-json-schema.js";
import { db } from "../db/index.js";
import { auditLog } from "../db/schema/audit.js";
import { staff } from "../db/schema/staff.js";
import { authenticate } from "../plugins/auth.js";

/**
 * Audit routes — раздел ТЗ 13.9: Аудит действий.
 *
 * GET /api/audit — журнал действий с пагинацией и фильтрами
 */

const tags = ["Audit"];

export async function auditRoutes(app: FastifyInstance) {
  /**
   * GET /api/audit
   * ТЗ 13.9.1: Журнал аудита (кто, когда, что изменил).
   */
  app.get(
    "/api/audit",
    {
      preValidation: [authenticate],
      schema: {
        tags,
        querystring: zSchema(
          z.strictObject({
            page: z.string().optional(),
            limit: z.string().optional(),
            userId: z.string().optional(),
            entity: z.string().optional(),
            action: z.string().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
          }),
        ),
        response: {
          200: zSchema(
            z.strictObject({
              data: z.array(auditLogSchema),
              total: z.number().int().min(0),
              page: z.number().int().positive(),
              limit: z.number().int().positive(),
            }),
          ),
        },
      } as any,
    },
    async (request: FastifyRequest) => {
      const {
        page: pageStr,
        limit: limitStr,
        userId,
        entity,
        action,
        dateFrom,
        dateTo,
      } = request.query as {
        page?: string;
        limit?: string;
        userId?: string;
        entity?: string;
        action?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? "20", 10) || 20));

      const conds: ReturnType<typeof and>[] = [];
      if (userId) conds.push(eq(auditLog.userId, parseInt(userId, 10)));
      if (entity) conds.push(eq(auditLog.tableName, entity));
      if (action) conds.push(eq(auditLog.action, action));
      if (dateFrom) conds.push(gte(auditLog.changedAt, new Date(dateFrom)));
      if (dateTo) conds.push(lte(auditLog.changedAt, new Date(dateTo)));

      const where = conds.length > 0 ? and(...conds) : undefined;

      const [totalRow] = await db
        .select({ cnt: count() })
        .from(auditLog)
        .where(where ?? undefined);

      const total = totalRow?.cnt ?? 0;

      const rows = await db
        .select({
          id: auditLog.id,
          tableName: auditLog.tableName,
          recordId: auditLog.recordId,
          action: auditLog.action,
          userId: auditLog.userId,
          changedAt: auditLog.changedAt,
          oldData: auditLog.oldData,
          newData: auditLog.newData,
          staffName: staff.fullName,
        })
        .from(auditLog)
        .leftJoin(staff, eq(auditLog.userId, staff.id))
        .where(where ?? undefined)
        .orderBy(desc(auditLog.changedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const data = rows.map((r) => ({
        id: r.id,
        table_name: r.tableName,
        record_id: r.recordId,
        action: r.action,
        user_id: r.userId,
        changed_at: r.changedAt.toISOString(),
        old_data: r.oldData as Record<string, unknown> | null,
        new_data: r.newData as Record<string, unknown> | null,
        staff_name: r.staffName ?? null,
      }));

      return { data, total, page, limit };
    },
  );
}
