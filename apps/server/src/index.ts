import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { config } from "./config.js";
import { authPlugin } from "./plugins/auth.js";
import { minioPlugin } from "./plugins/minio.js";
import { authRoutes } from "./routes/auth.js";
import { syncRoutes } from "./routes/sync.js";
import { cacheRoutes } from "./routes/cache.js";
import { machineRoutes } from "./routes/machines.js";
import { serviceRoutes } from "./routes/services.js";
import { registerDirectoryRoutes } from "./routes/directories.js";
import { reportRoutes } from "./routes/reports.js";
import { auditRoutes } from "./routes/audit.js";
import { previewRoutes } from "./routes/preview.js";

const app = Fastify({
  logger: {
    transport:
      config.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ================== CORE PLUGINS ==================
await app.register(cors, {
  origin: true,
  credentials: true,
});
await app.register(cookie);
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// ================== DOMAIN PLUGINS ==================
await app.register(authPlugin); // JWT authentication middleware
await app.register(minioPlugin); // MinIO client

// ================== ROUTES ==================
// Health check
app.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Auth (ТЗ 13.1)
await app.register(authRoutes);

// Sync (ТЗ 13.2)
await app.register(syncRoutes);

// Cache (ТЗ 13.3)
await app.register(cacheRoutes);

// Machines (ТЗ 13.4)
await app.register(machineRoutes);

// Services (ТЗ 13.6)
await app.register(serviceRoutes);

// Directories (ТЗ 13.7)
await app.register(registerDirectoryRoutes);

// Reports (ТЗ 13.8)
await app.register(reportRoutes);

// Audit (ТЗ 13.9)
await app.register(auditRoutes);

// Preview (ТЗ 13.10)
await app.register(previewRoutes);

// ================== START ==================
try {
  await app.listen({ port: config.SERVER_PORT, host: config.SERVER_HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
