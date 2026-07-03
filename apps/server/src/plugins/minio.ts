import { FastifyInstance } from "fastify";
import { Client } from "minio";
import { config } from "../config.js";

/**
 * Fastify plugin for MinIO client initialization.
 * Реализует раздел ТЗ 13.5 — Загрузка фото (MinIO/S3).
 *
 * Декорирует fastify.minio с экземпляром клиента MinIO.
 */

declare module "fastify" {
  interface FastifyInstance {
    minio: Client;
  }
}

export async function minioPlugin(app: FastifyInstance) {
  let minioClient: Client;

  try {
    minioClient = new Client({
      endPoint: config.MINIO_ENDPOINT,
      port: config.MINIO_PORT,
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
      useSSL: config.MINIO_USE_SSL,
    });

    // Ensure bucket exists
    const bucketName = config.MINIO_BUCKET;
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      app.log.info(`Creating MinIO bucket: ${bucketName}`);
      await minioClient.makeBucket(bucketName);
    }
  } catch (err) {
    app.log.warn(`MinIO initialization failed (non-fatal): MinIO may be unavailable.`);
    minioClient = null as unknown as Client; // placeholder, won't be used
  }

  app.decorate("minio", minioClient);
}
