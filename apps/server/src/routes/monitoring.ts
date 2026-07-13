import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { serverErrors } from "../db/schema/errors.js";
import { desc, count, eq, and, gte, lte } from "drizzle-orm";
import { collectSystemMetrics } from "../utils/systemMetrics.js";
import { authenticate, requireAdmin } from "../plugins/auth.js";
import { config } from "../config.js";

/**
 * Проверяет подключение к PostgreSQL
 */
async function checkPostgres(): Promise<"connected" | "disconnected" | "error"> {
  try {
    const result = await db.execute("SELECT 1");
    if (result) return "connected";
    return "error";
  } catch {
    return "disconnected";
  }
}

/**
 * Проверяет подключение к MinIO
 */
async function checkMinio(): Promise<"connected" | "disconnected" | "error"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const url = `http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}/minio/health/live`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) return "connected";
    return "error";
  } catch {
    return "disconnected";
  }
}

export async function monitoringRoutes(app: FastifyInstance) {
  /**
   * GET /api/monitoring/metrics
   * Полная информация о состоянии системы.
   * Только для администраторов.
   */
  app.get(
    "/api/monitoring/metrics",
    {
      preValidation: [authenticate, requireAdmin],
      schema: {
        response: { 200: { type: "object" } },
      },
    },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const [system, postgres, minio, recentErrors] = await Promise.all([
        collectSystemMetrics(),
        checkPostgres(),
        checkMinio(),
        db
          .select()
          .from(serverErrors)
          .orderBy(desc(serverErrors.createdAt))
          .limit(10),
      ]);

      const formattedErrors = recentErrors.map((e) => ({
        id: e.id,
        level: e.level,
        message: e.message,
        stack: e.stack,
        context: e.context as Record<string, unknown> | null,
        createdAt: e.createdAt.toISOString(),
      }));

      return {
        timestamp: new Date().toISOString(),
        system,
        dependencies: { postgres, minio },
        recentErrors: formattedErrors,
      };
    }
  );

  /**
   * GET /api/monitoring/health
   * Облегчённый health-check для Docker и внешних систем.
   * Доступен без аутентификации.
   */
  app.get(
    "/api/monitoring/health",
    {
      schema: {
        response: { 200: { type: "object" } },
      },
    },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const [postgres, minio] = await Promise.all([
        checkPostgres(),
        checkMinio(),
      ]);

      const healthy = postgres === "connected";
      const statusCode = healthy ? 200 : 503;

      return {
        status: healthy ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        dependencies: { postgres, minio },
        uptime: process.uptime(),
      };
    }
  );

  /**
   * GET /api/monitoring/errors
   * Журнал ошибок сервера с пагинацией и фильтрами.
   * Только для администраторов.
   */
  app.get(
    "/api/monitoring/errors",
    {
      preValidation: [authenticate, requireAdmin],
      schema: {
        querystring: {
          type: "object",
          properties: {
            level: { type: "string", enum: ["error", "warn", "fatal"] },
            page: { type: "string" },
            limit: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
          },
        },
        response: { 200: { type: "object" } },
      },
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const q = request.query as Record<string, string | undefined>;
      const page = Math.max(1, parseInt(q.page ?? "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? "50", 10) || 50));

      const conds: ReturnType<typeof and>[] = [];
      if (q.level && ["error", "warn", "fatal"].includes(q.level)) {
        conds.push(eq(serverErrors.level, q.level));
      }
      if (q.from) conds.push(gte(serverErrors.createdAt, new Date(q.from)));
      if (q.to) conds.push(lte(serverErrors.createdAt, new Date(q.to)));

      const where = conds.length > 0 ? and(...conds) : undefined;

      const [totalRow] = await db
        .select({ cnt: count() })
        .from(serverErrors)
        .where(where);
      const total = totalRow?.cnt ?? 0;

      const rows = await db
        .select()
        .from(serverErrors)
        .where(where)
        .orderBy(desc(serverErrors.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const items = rows.map((e) => ({
        id: e.id,
        level: e.level,
        message: e.message,
        stack: e.stack,
        context: e.context as Record<string, unknown> | null,
        createdAt: e.createdAt.toISOString(),
      }));

      return { items, total, page, limit };
    }
  );
}