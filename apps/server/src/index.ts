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
import { monitoringRoutes } from "./routes/monitoring.js";

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
// Monitoring (health check + metrics + error log)
await app.register(monitoringRoutes);

// Auth
await app.register(authRoutes);

// Sync
await app.register(syncRoutes);

// Cache
await app.register(cacheRoutes);

// Machines
await app.register(machineRoutes);

// Services
await app.register(serviceRoutes);

// Directories
await app.register(registerDirectoryRoutes);

// Reports
await app.register(reportRoutes);

// Audit
await app.register(auditRoutes);

// Preview
await app.register(previewRoutes);

// ================== START ==================
try {
  await app.listen({ port: config.SERVER_PORT, host: config.SERVER_HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}